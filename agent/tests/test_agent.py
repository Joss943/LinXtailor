"""Tests de l'agent : python -m unittest discover -s agent/tests

Aucune commande système n'est exécutée : run_command et download sont simulés,
et le dossier personnel est redirigé vers un répertoire temporaire.
"""
from __future__ import annotations

import json
import os
import socket
import sys
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from pathlib import Path

AGENT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(AGENT))

HOME = tempfile.mkdtemp(prefix="dt-home-")
os.environ["HOME"] = HOME
os.environ["USERPROFILE"] = HOME

import uvicorn  # noqa: E402

import detector  # noqa: E402
import executor  # noqa: E402
import server  # noqa: E402
import snapshot  # noqa: E402

DETECTION = {
    "os": "ubuntu", "osVersion": "24.04", "eol": False, "desktop": "GNOME",
    "ramGb": 16, "diskFreeGb": 120, "gpu": "intel",
}
PROFILE = {
    "schemaVersion": 1, "persona": "tinkerer", "theme": "dark", "wallpaper": "nuit.jpg",
    "dock": {"position": "left", "iconSize": "medium"}, "animations": "off",
    "terminal": "konsole", "shortcuts": "windows",
}
COMMANDS: list[str] = []


def fake_run(command: str, timeout: int = 60):
    COMMANDS.append(command)
    if command.startswith("gsettings get"):
        return True, "'default'"
    if command.startswith("timedatectl show"):
        return True, "no"
    return True, "ok"


def free_port() -> int:
    with socket.socket() as s:
        s.bind(("127.0.0.1", 0))
        return s.getsockname()[1]


def probe(installed=(), universe=False, paths=(), packages=(), flathub=False,
          flatpaks=(), extensions=(), enabled=(), components=()):
    return executor.Probe(
        which=lambda n: f"/usr/bin/{n}" if n in installed else None,
        universe_enabled=lambda: universe,
        component_enabled=lambda c: c in components,
        path_exists=lambda p: p in paths,
        package_installed=lambda os_id, pkg: pkg in packages,
        flathub_enabled=lambda: flathub,
        flatpak_installed=lambda app: app in flatpaks,
        extension_installed=lambda uuid: uuid in extensions,
        extension_enabled=lambda uuid: uuid in enabled,
    )


class DetectorTests(unittest.TestCase):
    def test_os_release_uses_id_only(self):
        self.assertEqual(detector.parse_os_release('ID=ubuntu\nVERSION_ID="24.04"'), ("ubuntu", "24.04"))
        self.assertEqual(detector.parse_os_release("ID=fedora\nVERSION_ID=41")[0], "fedora")
        self.assertEqual(detector.parse_os_release('ID=debian\nVERSION_ID="12"')[0], "debian")
        self.assertEqual(
            detector.parse_os_release('ID=linuxmint\nID_LIKE="ubuntu debian"')[0], "unsupported"
        )

    def test_eol(self):
        self.assertFalse(detector.is_eol("ubuntu", "22.04"))
        self.assertTrue(detector.is_eol("ubuntu", "20.04"))
        self.assertTrue(detector.is_eol("fedora", "40"))
        self.assertFalse(detector.is_eol("fedora", "45"))
        self.assertFalse(detector.is_eol("debian", "12"))

    def test_desktop(self):
        self.assertEqual(detector.parse_desktop("ubuntu:GNOME"), "GNOME")
        self.assertEqual(detector.parse_desktop("KDE"), "KDE")
        self.assertEqual(detector.parse_desktop("XFCE"), "XFCE")
        self.assertEqual(detector.parse_desktop("X-Cinnamon"), "unsupported")
        self.assertEqual(detector.parse_desktop(None), "unsupported")

    def test_hardware(self):
        self.assertEqual(detector.parse_meminfo("MemTotal:       16314560 kB\n"), 16)
        self.assertEqual(detector.parse_gpu("00:02.0 VGA compatible controller: Intel Corporation"), "intel")
        self.assertEqual(detector.parse_gpu("01:00.0 VGA compatible controller: NVIDIA Corporation"), "nvidia")
        self.assertEqual(detector.parse_gpu("VGA: Advanced Micro Devices, Inc. [AMD/ATI]"), "amd")
        self.assertEqual(detector.parse_gpu(""), "unknown")
        self.assertTrue(detector.is_weak_machine({"ramGb": 2, "gpu": "intel"}))
        self.assertTrue(detector.is_weak_machine({"ramGb": 8, "gpu": "unknown"}))
        self.assertFalse(detector.is_weak_machine({"ramGb": 8, "gpu": "amd"}))


class MappingTests(unittest.TestCase):
    def cmds(self, de, os_id="ubuntu", p=None, **override):
        profile = {**PROFILE, **override}
        det = {**DETECTION, "os": os_id, "desktop": de}
        return [a.command for a in executor.build_actions(profile, det, p or probe())]

    def test_gnome(self):
        c = self.cmds("GNOME")
        self.assertIn("gsettings set org.gnome.desktop.interface color-scheme 'prefer-dark'", c)
        self.assertIn("gsettings set org.gnome.shell.extensions.dash-to-dock dock-position LEFT", c)
        self.assertIn("gsettings set org.gnome.desktop.interface enable-animations false", c)

    def test_kde(self):
        c = self.cmds("KDE", p=probe(installed=["kwriteconfig5"]))
        self.assertIn("plasma-apply-colorscheme BreezeDark", c)
        self.assertTrue(any(x.startswith("kwriteconfig5 --file kcminputrc") for x in c))
        self.assertIn("kwriteconfig5 --file kdeglobals --group KDE --key AnimationDurationFactor 0", c)

    def test_kde_plasma6_fallback(self):
        c = self.cmds("KDE", p=probe(installed=["kwriteconfig6"]))
        self.assertIn("kwriteconfig6 --file kdeglobals --group KDE --key AnimationDurationFactor 0", c)

    def test_xfce(self):
        c = self.cmds("XFCE")
        self.assertIn('xfconf-query -c xsettings -p /Net/ThemeName -s "Adwaita-dark"', c)
        self.assertIn("xfconf-query -c xfce4-panel -p /panels/panel-1/position -s 4", c)
        self.assertIn("xfconf-query -c xfwm4 -p /general/use_compositing -s false", c)

    def test_packages_and_repos(self):
        acts = executor.build_actions(PROFILE, DETECTION, probe(universe=False))
        risks = {a.command: a.risk for a in acts}
        self.assertEqual(risks["pkexec add-apt-repository -y universe"], "repo-add")
        self.assertEqual(risks["pkexec apt install -y konsole"], "package-install")
        # jamais de sudo silencieux : toute action privilégiée annonce sa raison
        for a in acts:
            if "pkexec" in a.command:
                self.assertIn("droits administrateur requis", a.description)
        # universe déjà actif : pas d'ajout de dépôt
        c = self.cmds("GNOME", p=probe(universe=True))
        self.assertNotIn("pkexec add-apt-repository -y universe", c)
        # Fedora : dnf, Dash to Dock à installer
        c = self.cmds("GNOME", os_id="fedora")
        self.assertIn("pkexec dnf install -y konsole", c)
        self.assertIn("pkexec dnf install -y gnome-shell-extension-dash-to-dock", c)
        # terminal déjà présent : rien à installer
        c = self.cmds("GNOME", p=probe(installed=["konsole"], universe=True))
        self.assertFalse(any("install" in x for x in c))

    def test_auto_theme_and_no_wallpaper(self):
        c = self.cmds("GNOME", theme="auto", wallpaper=None)
        self.assertFalse(any("color-scheme" in x or "background" in x for x in c))

    def test_windows_habits(self):
        v2 = {**PROFILE, "schemaVersion": 2,
              "comfort": ["windowButtons", "numlock", "codecs", "officeFonts"]}
        c = self.cmds("GNOME", p=probe(universe=True), **{k: v2[k] for k in ("schemaVersion", "comfort")})
        self.assertIn("gsettings set org.gnome.desktop.wm.preferences button-layout "
                      "'appmenu:minimize,maximize,close'", c)
        self.assertTrue(any("numlock-state true" in x for x in c))
        self.assertIn("pkexec apt install -y gstreamer1.0-libav gstreamer1.0-plugins-ugly", c)
        self.assertIn("pkexec apt install -y fonts-crosextra-carlito fonts-crosextra-caladea fonts-liberation", c)
        # Fedora : codecs = RPM Fusion (badge orange) puis paquets
        acts = executor.build_actions(v2, {**DETECTION, "os": "fedora"}, probe())
        repo = [a for a in acts if a.risk == "repo-add"]
        self.assertEqual(len(repo), 1)
        self.assertIn("rpmfusion", repo[0].command)
        # KDE : boutons déjà présents, pas d'action ; paquets déjà installés : rien
        c = self.cmds("KDE", p=probe(installed=["konsole"], packages=[
            "gstreamer1.0-libav", "gstreamer1.0-plugins-ugly", "fonts-crosextra-carlito",
            "fonts-crosextra-caladea", "fonts-liberation"]), schemaVersion=2, comfort=v2["comfort"])
        self.assertFalse(any("button-layout" in x or "install" in x for x in c))
        self.assertTrue(any("--group Keyboard --key NumLock 0" in x for x in c))

    def test_more_windows_habits(self):
        extra = {"schemaVersion": 2, "comfort": ["windowButtons", "touchpad", "doubleClick", "dualBootClock"]}
        c = self.cmds("GNOME", p=probe(installed=["konsole"]), **extra)
        self.assertIn("gsettings set org.gnome.shell.extensions.dash-to-dock click-action 'minimize'", c)
        self.assertIn("gsettings set org.gnome.desktop.peripherals.touchpad tap-to-click true"
                      " && gsettings set org.gnome.desktop.peripherals.touchpad click-method 'areas'", c)
        self.assertIn("pkexec timedatectl set-local-rtc 1", c)
        self.assertFalse(any("SingleClick" in x for x in c))  # GNOME : déjà au double-clic
        c = self.cmds("KDE", p=probe(installed=["konsole", "kwriteconfig5"]), **extra)
        self.assertIn("kwriteconfig5 --file kdeglobals --group KDE --key SingleClick false", c)
        self.assertFalse(any("touchpad" in x or "button-layout" in x for x in c))
        acts = executor.build_actions({**PROFILE, **extra}, DETECTION, probe(installed=["konsole"]))
        rtc = next(a for a in acts if "set-local-rtc" in a.command)
        self.assertIn("droits administrateur requis", rtc.description)

    def test_apps_from_flathub(self):
        v3 = {"schemaVersion": 3, "apps": ["gimp", "vlc", "steam"]}
        acts = executor.build_actions({**PROFILE, **v3}, DETECTION,
                                      probe(installed=["konsole"], universe=True, flatpaks=["org.videolan.VLC"]))
        by_cmd = {a.command: a for a in acts}
        self.assertEqual(by_cmd["pkexec apt install -y flatpak"].risk, "package-install")
        self.assertEqual(by_cmd[executor.FLATHUB_ADD].risk, "repo-add")
        self.assertNotIn("sudo", executor.FLATHUB_ADD)
        gimp = by_cmd["flatpak install --user -y --noninteractive flathub org.gimp.GIMP"]
        self.assertIn("remplace Photoshop", gimp.description)
        self.assertEqual(gimp.flatpaks, ["org.gimp.GIMP"])
        self.assertFalse(any("org.videolan.VLC" in c for c in by_cmd))  # déjà installé
        # flatpak et Flathub déjà présents : seulement les installations
        acts = executor.build_actions({**PROFILE, **v3}, DETECTION,
                                      probe(installed=["konsole", "flatpak"], universe=True, flathub=True))
        self.assertEqual([a.risk for a in acts if "flatpak" in a.command], ["package-install"] * 3)

    def test_gnome_extensions(self):
        v3 = {"schemaVersion": 3, "extensions": ["trayIcons", "taskbar", "clipboard"]}
        acts = executor.build_actions({**PROFILE, **v3}, DETECTION, probe(
            installed=["konsole"], universe=True,
            extensions=["ubuntu-appindicators@ubuntu.com"], enabled=["ubuntu-appindicators@ubuntu.com"]))
        cmds = [a.command for a in acts]
        # Ubuntu fournit déjà les icônes de notification : rien à faire
        self.assertFalse(any("appindicator" in c for c in cmds))
        # la barre des tâches remplace le dock
        self.assertFalse(any("dash-to-dock dock-position" in c for c in cmds))
        self.assertTrue(any(c.startswith("gnome-extensions disable ubuntu-dock@ubuntu.com") for c in cmds))
        acts2 = executor.build_actions({**PROFILE, **v3, "comfort": ["windowButtons"]}, DETECTION,
                                       probe(installed=["konsole"], universe=True))
        self.assertFalse(any("click-action" in a.command for a in acts2))
        install = next(a for a in acts if "clipboard-indicator@tudmotu.com" in a.command)
        self.assertIn("InstallRemoteExtension", install.command)
        self.assertIn("GNOME vous demandera de confirmer", install.description)
        self.assertEqual(install.extensions, ["clipboard-indicator@tudmotu.com"])
        # installée mais désactivée : simple activation
        acts = executor.build_actions({**PROFILE, "schemaVersion": 3, "extensions": ["clipboard"]}, DETECTION,
                                      probe(installed=["konsole"], extensions=["clipboard-indicator@tudmotu.com"]))
        self.assertIn("gnome-extensions enable clipboard-indicator@tudmotu.com", [a.command for a in acts])
        # KDE : pas d'extensions GNOME
        acts = executor.build_actions({**PROFILE, **v3}, {**DETECTION, "desktop": "KDE"},
                                      probe(installed=["konsole"]))
        self.assertFalse(any("gnome-extensions" in a.command or "gdbus" in a.command for a in acts))

    def test_essentials(self):
        v4 = {"schemaVersion": 4, "essentials": list(executor.ESSENTIALS)}
        acts = executor.build_actions({**PROFILE, **v4}, DETECTION,
                                      probe(installed=["konsole"], universe=True, packages=["ufw"]))
        by_cmd = {a.command: a for a in acts}
        self.assertEqual(by_cmd["pkexec add-apt-repository -y multiverse"].risk, "repo-add")
        self.assertEqual(by_cmd["pkexec apt install -y unzip p7zip-full p7zip-rar"].risk, "package-install")
        self.assertIn("pkexec apt install -y linux-firmware", by_cmd)
        self.assertEqual(by_cmd["pkexec apt install -y linux-firmware"].packages, [])  # gardé au rollback
        self.assertNotIn("pkexec apt install -y ufw", by_cmd)  # déjà installé
        self.assertIn("pkexec ufw enable", by_cmd)
        self.assertTrue(any("unattended-upgrades" in c and "dpkg-reconfigure" in c for c in by_cmd))
        self.assertIn("pkexec apt install -y timeshift", by_cmd)
        for a in acts:
            if a.risk != "none" or a.command.startswith("pkexec"):
                self.assertTrue(a.command.startswith("pkexec"), a.command)
                self.assertIn("pkexec", a.description)
        # Debian : dépôt non-free-firmware, sauf s'il est déjà actif
        deb = {**DETECTION, "os": "debian", "osVersion": "12"}
        cmds = [a.command for a in executor.build_actions(
            {**PROFILE, "schemaVersion": 4, "essentials": ["firmware"]}, deb, probe(installed=["konsole"]))]
        self.assertEqual(cmds[-2:], ["pkexec apt-add-repository -y non-free-firmware",
                                     "pkexec apt install -y firmware-linux-nonfree"])
        cmds = [a.command for a in executor.build_actions(
            {**PROFILE, "schemaVersion": 4, "essentials": ["firmware"]}, deb,
            probe(installed=["konsole"], components=["non-free-firmware"]))]
        self.assertNotIn("pkexec apt-add-repository -y non-free-firmware", cmds)
        # Fedora : firewalld et dnf5-automatic
        fed = {**DETECTION, "os": "fedora", "osVersion": "43"}
        cmds = [a.command for a in executor.build_actions(
            {**PROFILE, "schemaVersion": 4, "essentials": ["firewall", "autoUpdates"]}, fed,
            probe(installed=["konsole"], packages=["firewalld"]))]
        self.assertIn("pkexec systemctl enable --now firewalld", cmds)
        self.assertIn("pkexec dnf install -y dnf5-plugin-automatic", cmds)
        self.assertTrue(any("dnf5-automatic.timer" in c for c in cmds))

    def test_validation_v4(self):
        self.assertEqual(executor.validate_profile(
            {**PROFILE, "schemaVersion": 4, "essentials": ["archives", "backup"]}), [])
        self.assertTrue(executor.validate_profile({**PROFILE, "schemaVersion": 3, "essentials": ["archives"]}))
        self.assertTrue(executor.validate_profile({**PROFILE, "schemaVersion": 4, "essentials": ["antivirus"]}))
        self.assertTrue(executor.validate_profile({**PROFILE, "schemaVersion": 4, "essentials": ["backup", "backup"]}))

    def test_validation_v3(self):
        self.assertEqual(executor.validate_profile(
            {**PROFILE, "schemaVersion": 3, "comfort": [], "apps": ["gimp"], "extensions": ["clipboard"]}), [])
        self.assertTrue(executor.validate_profile({**PROFILE, "schemaVersion": 2, "apps": ["gimp"]}))
        self.assertTrue(executor.validate_profile({**PROFILE, "schemaVersion": 3, "apps": ["photoshop"]}))
        self.assertTrue(executor.validate_profile({**PROFILE, "schemaVersion": 3, "extensions": ["x"]}))

    def test_validation(self):
        self.assertEqual(executor.validate_profile({**PROFILE, "schemaVersion": 2, "comfort": ["codecs"]}), [])
        self.assertTrue(executor.validate_profile({**PROFILE, "comfort": ["codecs"]}))
        self.assertTrue(executor.validate_profile({**PROFILE, "schemaVersion": 2, "comfort": ["x"]}))
        self.assertEqual(executor.validate_profile(PROFILE), [])
        self.assertTrue(executor.validate_profile({**PROFILE, "wallpaper": "../../etc/passwd"}))
        self.assertTrue(executor.validate_profile({**PROFILE, "theme": "rose"}))
        self.assertTrue(executor.validate_profile({"profile": PROFILE}))


class ServerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        detector.detect = lambda: dict(DETECTION)
        executor.run_command = fake_run
        snapshot.run_command = fake_run
        executor.download = lambda url, target: (True, f"enregistré dans {target}")
        cls.port = free_port()
        config = uvicorn.Config(server.app, host="127.0.0.1", port=cls.port, log_level="error")
        cls.uv = uvicorn.Server(config)
        cls.thread = threading.Thread(target=cls.uv.run, daemon=True)
        cls.thread.start()
        for _ in range(100):
            if cls.uv.started:
                break
            time.sleep(0.05)

    @classmethod
    def tearDownClass(cls):
        cls.uv.should_exit = True
        cls.thread.join(timeout=5)

    def call(self, method, path, body=None, origin="http://localhost:5173"):
        data = json.dumps(body).encode() if body is not None else None
        req = urllib.request.Request(f"http://127.0.0.1:{self.port}{path}", data=data, method=method)
        req.add_header("Content-Type", "application/json")
        if origin:
            req.add_header("Origin", origin)
        try:
            with urllib.request.urlopen(req, timeout=10) as r:
                return r.status, r.read().decode(), r.headers
        except urllib.error.HTTPError as e:
            return e.code, e.read().decode(), e.headers

    def test_health(self):
        status, body, headers = self.call("GET", "/health")
        self.assertEqual((status, json.loads(body)), (200, {"status": "ok"}))
        self.assertEqual(headers.get("access-control-allow-origin"), "http://localhost:5173")

    def test_detect(self):
        status, body, _ = self.call("GET", "/detect")
        self.assertEqual(status, 200)
        self.assertEqual(set(json.loads(body)), set(DETECTION))

    def test_origin_forbidden(self):
        for origin in ("http://evil.example", "http://localhost.evil.example", "https://localhost"):
            self.assertEqual(self.call("GET", "/health", origin=origin)[0], 403, origin)
        self.assertEqual(self.call("OPTIONS", "/dryrun", origin="http://evil.example")[0], 403)

    def test_not_found(self):
        self.assertEqual(self.call("GET", "/nope")[0], 404)
        self.assertEqual(self.call("GET", "/dryrun")[0], 404)
        self.assertEqual(self.call("DELETE", "/health")[0], 404)
        self.assertEqual(self.call("POST", "/health", {})[0], 404)
        self.assertEqual(self.call("GET", "/docs")[0], 404)

    def test_dryrun_takes_profile_directly(self):
        status, body, _ = self.call("POST", "/dryrun", PROFILE)
        self.assertEqual(status, 200)
        data = json.loads(body)
        self.assertTrue(data["token"])
        self.assertEqual(set(data["actions"][0]), {"id", "description", "command", "risk"})
        self.assertEqual(self.call("POST", "/dryrun", {"profile": PROFILE})[0], 422)

    def test_apply_requires_token(self):
        self.assertEqual(self.call("POST", "/apply", {"profile": PROFILE})[0], 403)
        self.assertEqual(self.call("POST", "/apply", {"profile": PROFILE, "token": "faux"})[0], 403)
        _, body, _ = self.call("POST", "/dryrun", PROFILE)
        token = json.loads(body)["token"]
        changed = {**PROFILE, "theme": "light"}
        self.assertEqual(self.call("POST", "/apply", {"profile": changed, "token": token})[0], 403)

    def test_apply_stream_snapshot_history_rollback(self):
        _, body, _ = self.call("POST", "/dryrun", PROFILE)
        dry = json.loads(body)
        status, body, headers = self.call("POST", "/apply", {"profile": PROFILE, "token": dry["token"]})
        self.assertEqual(status, 200)
        self.assertIn("ndjson", headers.get("content-type"))
        lines = [json.loads(l) for l in body.splitlines() if l]
        self.assertEqual([l["actionId"] for l in lines], [a["id"] for a in dry["actions"]])
        self.assertTrue(all(l["status"] == "ok" for l in lines))
        # jeton à usage unique
        self.assertEqual(self.call("POST", "/apply", {"profile": PROFILE, "token": dry["token"]})[0], 403)
        cfg = Path(HOME) / ".config" / "linxtailor"
        snap = snapshot.latest()
        self.assertIsNotNone(snap)
        self.assertTrue((snap / "gsettings.txt").exists())
        self.assertEqual(json.loads((cfg / "history.json").read_text(encoding="utf-8"))[-1]["profile"], PROFILE)
        self.assertIn("konsole", (cfg / "installed-packages.txt").read_text(encoding="utf-8"))
        COMMANDS.clear()
        status, body, _ = self.call("POST", "/rollback")
        self.assertEqual((status, json.loads(body)), (200, {"restored": True}))
        self.assertIn("pkexec apt remove -y konsole", COMMANDS)
        self.assertTrue(any(c.startswith("gsettings set org.gnome.desktop.interface color-scheme") for c in COMMANDS))
        self.assertFalse((cfg / "installed-packages.txt").exists())

    def test_apply_stops_on_error(self):
        _, body, _ = self.call("POST", "/dryrun", PROFILE)
        token = json.loads(body)["token"]
        original = executor.run_command
        calls = {"n": 0}

        def failing(command, timeout=60):
            calls["n"] += 1
            return (False, "échec simulé") if calls["n"] == 2 else (True, "ok")

        executor.run_command = failing
        try:
            _, body, _ = self.call("POST", "/apply", {"profile": PROFILE, "token": token})
        finally:
            executor.run_command = original
        lines = [json.loads(l) for l in body.splitlines() if l]
        self.assertEqual(lines[-1]["status"], "error")
        self.assertEqual(sum(1 for l in lines if l["status"] == "error"), 1)

    def test_rollback_restores_dual_boot_clock_only_if_changed(self):
        folder = snapshot.take("XFCE")
        self.assertEqual(json.loads((folder / "system.json").read_text(encoding="utf-8")), {"localRtc": "no"})
        self.assertNotIn("pkexec timedatectl set-local-rtc 0", snapshot.restore_commands(folder))
        original = snapshot.run_command
        snapshot.run_command = lambda c, timeout=60: (True, "yes") if c.startswith("timedatectl") else (True, "")
        try:
            self.assertIn("pkexec timedatectl set-local-rtc 0", snapshot.restore_commands(folder))
        finally:
            snapshot.run_command = original

    def test_legacy_config_dir_is_migrated(self):
        home = Path(tempfile.mkdtemp(prefix="dt-legacy-"))
        (home / ".config" / "desktop-tailor").mkdir(parents=True)
        (home / ".config" / "desktop-tailor" / "history.json").write_text("[]", encoding="utf-8")
        original = Path.home
        Path.home = classmethod(lambda cls: home)  # type: ignore[method-assign]
        try:
            self.assertEqual(executor.config_dir(), home / ".config" / "linxtailor")
        finally:
            Path.home = original  # type: ignore[method-assign]
        self.assertTrue((home / ".config" / "linxtailor" / "history.json").exists())
        self.assertFalse((home / ".config" / "desktop-tailor").exists())

    def test_rollback_uninstalls_flatpaks_and_extensions(self):
        executor.record_installed(["org.gimp.GIMP"], "installed-flatpaks.txt")
        executor.record_installed(["clipboard-indicator@tudmotu.com"], "installed-extensions.txt")
        COMMANDS.clear()
        self.assertTrue(snapshot.rollback("ubuntu"))
        self.assertIn("flatpak uninstall --user -y --noninteractive org.gimp.GIMP", COMMANDS)
        self.assertIn("gnome-extensions uninstall clipboard-indicator@tudmotu.com", COMMANDS)
        cfg = Path(HOME) / ".config" / "linxtailor"
        self.assertFalse((cfg / "installed-flatpaks.txt").exists())
        self.assertFalse((cfg / "installed-extensions.txt").exists())

    def test_history_keeps_five(self):
        for _ in range(7):
            snapshot.add_history(PROFILE)
        cfg = Path(HOME) / ".config" / "linxtailor"
        self.assertEqual(len(json.loads((cfg / "history.json").read_text(encoding="utf-8"))), 5)


if __name__ == "__main__":
    unittest.main()
