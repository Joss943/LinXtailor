"""Construction des actions (dry-run) et exécution journalisée."""
from __future__ import annotations

import datetime as _dt
import shlex
import shutil
import subprocess
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Iterator

# ---------------------------------------------------------------------------
# Profil
# ---------------------------------------------------------------------------

PERSONAS = ("migrator", "aesthete", "tinkerer", "minimalist")
THEMES = ("light", "dark", "auto")
DOCK_POSITIONS = ("bottom", "left")
ICON_SIZES = ("small", "medium", "large")
ANIMATIONS = ("full", "reduced", "off")
TERMINALS = ("gnome-terminal", "konsole", "xfce4-terminal")
SHORTCUTS = ("linux", "windows", "macos")
# Irritants fréquents des personnes venant de Windows (schemaVersion 2).
COMFORT = (
    "windowButtons", "numlock", "codecs", "officeFonts",
    "touchpad", "doubleClick", "dualBootClock",
)
SCHEMA_VERSIONS = (1, 2, 3, 4)
# Les 5 essentiels de première installation (schemaVersion 4).
ESSENTIALS = ("archives", "firmware", "firewall", "autoUpdates", "backup")

# Logiciels Windows -> équivalent Linux sur Flathub (schemaVersion 3).
# id : (identifiant Flathub, nom, logiciel Windows remplacé)
APPS: dict[str, tuple[str, str, str]] = {
    "onlyoffice": ("org.onlyoffice.desktopeditors", "ONLYOFFICE", "Microsoft Office"),
    "chrome": ("com.google.Chrome", "Google Chrome", "Google Chrome"),
    "vlc": ("org.videolan.VLC", "VLC", "le Lecteur multimédia"),
    "gimp": ("org.gimp.GIMP", "GIMP", "Photoshop"),
    "pinta": ("com.github.PintaProject.Pinta", "Pinta", "Paint"),
    "inkscape": ("org.inkscape.Inkscape", "Inkscape", "Illustrator"),
    "kdenlive": ("org.kde.kdenlive", "Kdenlive", "Premiere ou Clipchamp"),
    "obs": ("com.obsproject.Studio", "OBS Studio", "OBS Studio"),
    "vscode": ("com.visualstudio.code", "Visual Studio Code", "Notepad++ ou VS Code"),
    "peazip": ("io.github.peazip.PeaZip", "PeaZip", "7-Zip ou WinRAR"),
    "thunderbird": ("org.mozilla.Thunderbird", "Thunderbird", "Outlook"),
    "discord": ("com.discordapp.Discord", "Discord", "Discord"),
    "spotify": ("com.spotify.Client", "Spotify", "Spotify"),
    "zoom": ("us.zoom.Zoom", "Zoom", "Zoom"),
    "steam": ("com.valvesoftware.Steam", "Steam", "Steam"),
    "heroic": ("com.heroicgameslauncher.hgl", "Heroic", "Epic Games et GOG"),
}
FLATHUB_ADD = (
    "flatpak remote-add --user --if-not-exists flathub "
    "https://dl.flathub.org/repo/flathub.flatpakrepo"
)

# Extensions GNOME (extensions.gnome.org) qui comblent un manque ressenti en venant de Windows.
# id : (uuid, nom, autres uuid équivalents déjà fournis par la distribution)
EXTENSIONS: dict[str, tuple[str, str, tuple[str, ...]]] = {
    "trayIcons": ("appindicatorsupport@rgcjonas.gmail.com", "Icônes de la zone de notification",
                  ("ubuntu-appindicators@ubuntu.com",)),
    "taskbar": ("dash-to-panel@jderose9.github.com", "Barre des tâches façon Windows", ()),
    "startMenu": ("arcmenu@arcmenu.com", "Menu Démarrer", ()),
    "clipboard": ("clipboard-indicator@tudmotu.com", "Historique du presse-papiers", ()),
    "desktopIcons": ("ding@rastersoft.com", "Icônes sur le bureau", ()),
    "phone": ("gsconnect@andyholmes.github.io", "Lien avec le téléphone", ()),
    "caffeine": ("caffeine@patapon.info", "Empêcher la mise en veille", ()),
}
DOCK_UUIDS = ("ubuntu-dock@ubuntu.com", "dash-to-dock@micxgx.gmail.com")

# Fonds d'écran du domaine public (Wikimedia Commons, Special:FilePath).
WALLPAPERS: dict[str, str] = {
    "aurore.jpg": "https://commons.wikimedia.org/wiki/Special:FilePath/"
    "Caspar_David_Friedrich_-_Wanderer_above_the_sea_of_fog.jpg?width=1920",
    "vague.jpg": "https://commons.wikimedia.org/wiki/Special:FilePath/"
    "Tsunami_by_hokusai_19th_century.jpg?width=1920",
    "nuit.jpg": "https://commons.wikimedia.org/wiki/Special:FilePath/"
    "Van_Gogh_-_Starry_Night_-_Google_Art_Project.jpg?width=1920",
}


def config_dir() -> Path:
    path = Path.home() / ".config" / "linxtailor"
    legacy = Path.home() / ".config" / "desktop-tailor"  # nom de la v1.0.0
    if legacy.is_dir() and not path.exists():
        legacy.rename(path)  # garde les sauvegardes faites avant le renommage
    return path


def validate_profile(p: object) -> list[str]:
    """Retourne la liste des erreurs (vide si le profil est valide)."""
    if not isinstance(p, dict):
        return ["le profil doit être un objet JSON"]
    errors: list[str] = []

    def check(key: str, allowed: tuple[str, ...], value: object) -> None:
        if value not in allowed:
            errors.append(f"{key} invalide : {value!r}")

    version = p.get("schemaVersion")
    if version not in SCHEMA_VERSIONS:
        errors.append("schemaVersion doit valoir 1, 2, 3 ou 4")
    for key, allowed, since in (
        ("apps", APPS, 3), ("extensions", EXTENSIONS, 3), ("essentials", ESSENTIALS, 4)
    ):
        values = p.get(key, [])
        if key in p and isinstance(version, int) and version < since:
            errors.append(f"{key} n'existe qu'à partir de schemaVersion {since}")
        elif not isinstance(values, list) or any(v not in allowed for v in values):
            errors.append(f"{key} invalide : {values!r}")
        elif len(set(values)) != len(values):
            errors.append(f"{key} contient des doublons")
    comfort = p.get("comfort", [])
    if p.get("schemaVersion") == 1 and "comfort" in p:
        errors.append("comfort n'existe qu'à partir de schemaVersion 2")
    elif not isinstance(comfort, list) or any(c not in COMFORT for c in comfort):
        errors.append(f"comfort invalide : {comfort!r}")
    elif len(set(comfort)) != len(comfort):
        errors.append("comfort contient des doublons")
    check("persona", PERSONAS, p.get("persona"))
    check("theme", THEMES, p.get("theme"))
    wp = p.get("wallpaper")
    if wp is not None and wp not in WALLPAPERS:
        errors.append(f"wallpaper invalide : {wp!r}")
    dock = p.get("dock")
    if not isinstance(dock, dict):
        errors.append("dock doit être un objet")
    else:
        check("dock.position", DOCK_POSITIONS, dock.get("position"))
        check("dock.iconSize", ICON_SIZES, dock.get("iconSize"))
    check("animations", ANIMATIONS, p.get("animations"))
    check("terminal", TERMINALS, p.get("terminal"))
    check("shortcuts", SHORTCUTS, p.get("shortcuts"))
    allowed_keys = {
        "schemaVersion", "persona", "theme", "wallpaper",
        "dock", "animations", "terminal", "shortcuts", "comfort", "apps", "extensions",
        "essentials",
    }
    extra = set(p) - allowed_keys
    if extra:
        errors.append(f"clés inconnues : {sorted(extra)}")
    return errors


# ---------------------------------------------------------------------------
# Actions
# ---------------------------------------------------------------------------


@dataclass
class Action:
    id: int
    description: str
    command: str
    risk: str = "none"  # none | package-install | repo-add
    kind: str = "shell"  # shell | download
    packages: list[str] = field(default_factory=list)
    flatpaks: list[str] = field(default_factory=list)
    extensions: list[str] = field(default_factory=list)
    url: str = ""
    target: str = ""

    def public(self) -> dict:
        return {
            "id": self.id,
            "description": self.description,
            "command": self.command,
            "risk": self.risk,
        }


@dataclass
class Probe:
    """Accès au système, remplaçable dans les tests."""

    which: Callable[[str], str | None] = shutil.which
    universe_enabled: Callable[[], bool] = lambda: _apt_component_enabled("universe")
    component_enabled: Callable[[str], bool] = lambda c: _apt_component_enabled(c)
    path_exists: Callable[[str], bool] = lambda p: Path(p).exists()
    package_installed: Callable[[str, str], bool] = lambda os_id, pkg: _package_installed(os_id, pkg)
    flathub_enabled: Callable[[], bool] = lambda: "flathub" in _out(["flatpak", "remotes", "--user", "--columns=name"])
    flatpak_installed: Callable[[str], bool] = lambda app: _ok(["flatpak", "info", app])
    extension_installed: Callable[[str], bool] = lambda uuid: _ok(["gnome-extensions", "info", uuid])
    extension_enabled: Callable[[str], bool] = lambda uuid: uuid in _out(
        ["gsettings", "get", "org.gnome.shell", "enabled-extensions"]
    )


def _out(cmd: list[str]) -> str:
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=10).stdout
    except (OSError, subprocess.TimeoutExpired):
        return ""


def _ok(cmd: list[str]) -> bool:
    try:
        return subprocess.run(cmd, capture_output=True, timeout=10).returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False


def _package_installed(os_id: str, pkg: str) -> bool:
    cmd = ["rpm", "-q", pkg] if os_id == "fedora" else ["dpkg", "-s", pkg]
    try:
        return subprocess.run(cmd, capture_output=True, timeout=10).returncode == 0
    except (OSError, subprocess.TimeoutExpired):
        return False


# Ubuntu fournit déjà « ubuntu-dock » (même schéma gsettings que Dash to Dock).
DASH_TO_DOCK_DIR = "/usr/share/gnome-shell/extensions/dash-to-dock@micxgx.gmail.com"


def _apt_component_enabled(component: str) -> bool:
    """Vrai si un composant APT (universe, multiverse, non-free-firmware…) est actif."""
    paths = [Path("/etc/apt/sources.list")]
    d = Path("/etc/apt/sources.list.d")
    if d.is_dir():
        paths += sorted(d.glob("*.list")) + sorted(d.glob("*.sources"))
    for path in paths:
        try:
            for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
                line = line.strip()
                if line and not line.startswith("#") and component in line.split():
                    return True
        except OSError:
            continue
    return False


def kwrite(probe: Probe) -> str:
    """kwriteconfig5 (spécification) ; Plasma 6 ne fournit que kwriteconfig6."""
    if probe.which("kwriteconfig5") or not probe.which("kwriteconfig6"):
        return "kwriteconfig5"
    return "kwriteconfig6"


def kread(probe: Probe) -> str:
    if probe.which("kreadconfig5") or not probe.which("kreadconfig6"):
        return "kreadconfig5"
    return "kreadconfig6"


# Paquets à installer selon le terminal choisi, et dépôt requis le cas échéant.
TERMINAL_PACKAGES = {
    "gnome-terminal": "gnome-terminal",
    "konsole": "konsole",
    "xfce4-terminal": "xfce4-terminal",
}
# Dépôts nécessaires : RPM Fusion (Fedora), universe (Ubuntu), contrib (Debian).
PACKAGE_REPOS: dict[tuple[str, str], str] = {
    ("ubuntu", "konsole"): "universe",
    ("ubuntu", "xfce4-terminal"): "universe",
    ("ubuntu", "gstreamer1.0-libav"): "universe",
    ("fedora", "gstreamer1-plugin-libav"): "rpmfusion",
    ("ubuntu", "p7zip-full"): "universe",
    ("ubuntu", "p7zip-rar"): "multiverse",
    ("ubuntu", "timeshift"): "universe",
    ("debian", "firmware-linux-nonfree"): "non-free-firmware",
}
# Essentiels : ouvrir les archives .zip, .rar, .7z…
ARCHIVE_PACKAGES = {
    "fedora": ["unzip", "p7zip", "p7zip-plugins", "unar"],
    "ubuntu": ["unzip", "p7zip-full", "p7zip-rar"],
    "debian": ["unzip", "p7zip-full", "unrar-free"],
}
# Essentiels : pilotes non libres (Wi-Fi, Bluetooth, cartes graphiques).
FIRMWARE_PACKAGES = {
    "fedora": ["linux-firmware"],
    "ubuntu": ["linux-firmware"],
    "debian": ["firmware-linux-nonfree"],
}
DNF_AUTOMATIC_CONF = "/etc/dnf/automatic.conf"
RPMFUSION_REPO_FILE = "/etc/yum.repos.d/rpmfusion-free.repo"
CODEC_PACKAGES = {
    "fedora": ["gstreamer1-plugin-libav", "gstreamer1-plugins-ugly"],
    "ubuntu": ["gstreamer1.0-libav", "gstreamer1.0-plugins-ugly"],
    "debian": ["gstreamer1.0-libav", "gstreamer1.0-plugins-ugly"],
}
# Polices métriquement compatibles avec Calibri, Cambria, Arial, Times New Roman.
FONT_PACKAGES = {
    "fedora": ["google-carlito-fonts", "google-crosextra-caladea-fonts", "liberation-fonts"],
    "ubuntu": ["fonts-crosextra-carlito", "fonts-crosextra-caladea", "fonts-liberation"],
    "debian": ["fonts-crosextra-carlito", "fonts-crosextra-caladea", "fonts-liberation"],
}
REPO_COMMANDS = {
    "universe": "pkexec add-apt-repository -y universe",
    "contrib": "pkexec apt-add-repository -y contrib",
    "multiverse": "pkexec add-apt-repository -y multiverse",
    "non-free-firmware": "pkexec apt-add-repository -y non-free-firmware",
    "rpmfusion": "pkexec dnf install -y "
    "https://mirrors.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm",
}
DASH_TO_DOCK_PACKAGE = {
    "fedora": "gnome-shell-extension-dash-to-dock",
    "debian": "gnome-shell-extension-dashtodock",
}
SUDO_REASON_PKG = "droits administrateur requis (pkexec) pour installer un paquet système"
SUDO_REASON_REPO = "droits administrateur requis (pkexec) pour activer un dépôt de paquets"
SUDO_REASON_SYS = "droits administrateur requis (pkexec) pour modifier un réglage du système"


def install_command(os_id: str, packages: list[str]) -> str:
    pm = "dnf" if os_id == "fedora" else "apt"
    return f"pkexec {pm} install -y " + " ".join(packages)


def remove_command(os_id: str, packages: list[str]) -> str:
    pm = "dnf" if os_id == "fedora" else "apt"
    return f"pkexec {pm} remove -y " + " ".join(packages)


GNOME_ICON = {"small": 32, "medium": 48, "large": 64}
KDE_ICON = {"small": 22, "medium": 32, "large": 48}
XFCE_ICON = {"small": 16, "medium": 24, "large": 32}
XFCE_POSITION = {"left": "4", "bottom": "8"}
KDE_ANIM = {"full": "1", "reduced": "0.5", "off": "0"}


def build_actions(profile: dict, detection: dict, probe: Probe | None = None) -> list[Action]:
    probe = probe or Probe()
    os_id = detection["os"]
    de = detection["desktop"]
    out: list[tuple[str, str, str, dict]] = []  # description, command, risk, extras

    def add(desc: str, cmd: str, risk: str = "none", **extra: object) -> None:
        out.append((desc, cmd, risk, extra))

    def ensure_packages(pkgs: list[str], label: str, track: bool = True) -> None:
        missing = [p for p in pkgs if not probe.package_installed(os_id, p)]
        if not missing:
            return
        repos = {PACKAGE_REPOS[(os_id, p)] for p in missing if (os_id, p) in PACKAGE_REPOS}
        for repo in sorted(repos):
            if repo == "universe" and probe.universe_enabled():
                continue
            if repo == "rpmfusion" and probe.path_exists(RPMFUSION_REPO_FILE):
                continue
            if repo in ("multiverse", "non-free-firmware") and probe.component_enabled(repo):
                continue
            add(
                f"Activer le dépôt {repo} (requis pour {label}) — {SUDO_REASON_REPO}",
                REPO_COMMANDS[repo],
                "repo-add",
            )
        add(
            f"Installer {label} — {SUDO_REASON_PKG}",
            install_command(os_id, missing),
            "package-install",
            packages=missing if track else [],
        )

    kw = kwrite(probe)

    # --- Thème -------------------------------------------------------------
    theme = profile["theme"]
    if theme != "auto":
        dark = theme == "dark"
        label = "Activer le thème sombre" if dark else "Activer le thème clair"
        if de == "GNOME":
            value = "prefer-dark" if dark else "default"
            add(label, f"gsettings set org.gnome.desktop.interface color-scheme '{value}'")
        elif de == "KDE":
            add(label, f"plasma-apply-colorscheme {'BreezeDark' if dark else 'BreezeLight'}")
        elif de == "XFCE":
            name = "Adwaita-dark" if dark else "Adwaita"
            add(label, f'xfconf-query -c xsettings -p /Net/ThemeName -s "{name}"')

    # --- Fond d'écran --------------------------------------------------------
    wp = profile.get("wallpaper")
    if wp:
        target = str(config_dir() / "wallpapers" / wp)
        url = WALLPAPERS[wp]
        add(
            f"Télécharger le fond d'écran « {wp} » (Wikimedia Commons, domaine public)",
            f"curl -fL -o {shlex.quote(target)} {shlex.quote(url)}",
            kind="download",
            url=url,
            target=target,
        )
        if de == "GNOME":
            uri = f"file://{target}"
            add(
                "Appliquer le fond d'écran",
                f"gsettings set org.gnome.desktop.background picture-uri '{uri}' && "
                f"gsettings set org.gnome.desktop.background picture-uri-dark '{uri}'",
            )
        elif de == "KDE":
            add("Appliquer le fond d'écran", f"plasma-apply-wallpaperimage {shlex.quote(target)}")
        elif de == "XFCE":
            add(
                "Appliquer le fond d'écran",
                "xfconf-query -c xfce4-desktop -p "
                "/backdrop/screen0/monitor0/workspace0/last-image -s " + shlex.quote(target),
            )

    # --- Dock --------------------------------------------------------------
    dock = profile["dock"]
    pos, size = dock["position"], dock["iconSize"]
    pos_label = "en bas" if pos == "bottom" else "à gauche"
    taskbar = de == "GNOME" and "taskbar" in profile.get("extensions", [])
    if taskbar:
        pass  # la barre des tâches (Dash to Panel) remplace le dock, voir plus bas
    elif de == "GNOME":
        if os_id in DASH_TO_DOCK_PACKAGE and not probe.path_exists(DASH_TO_DOCK_DIR):
            ensure_packages([DASH_TO_DOCK_PACKAGE[os_id]], "l'extension Dash to Dock")
            add(
                "Activer l'extension Dash to Dock",
                "gnome-extensions enable dash-to-dock@micxgx.gmail.com",
            )
        add(
            f"Placer le dock {pos_label}",
            "gsettings set org.gnome.shell.extensions.dash-to-dock dock-position "
            + ("BOTTOM" if pos == "bottom" else "LEFT"),
        )
        add(
            f"Régler la taille des icônes du dock ({GNOME_ICON[size]} px)",
            "gsettings set org.gnome.shell.extensions.dash-to-dock dash-max-icon-size "
            f"{GNOME_ICON[size]}",
        )
    elif de == "KDE":
        add(
            f"Placer le dock {pos_label}",
            f"{kw} --file kcminputrc --group LinXtailor --key DockPosition {pos}",
        )
        add(
            f"Régler la taille des icônes du dock ({KDE_ICON[size]} px)",
            f"{kw} --file kdeglobals --group PanelIcons --key Size {KDE_ICON[size]}",
        )
    elif de == "XFCE":
        add(
            f"Placer le dock {pos_label}",
            f"xfconf-query -c xfce4-panel -p /panels/panel-1/position -s {XFCE_POSITION[pos]}",
        )
        add(
            f"Régler la taille des icônes du dock ({XFCE_ICON[size]} px)",
            f"xfconf-query -c xfce4-panel -p /panels/panel-1/icon-size -s {XFCE_ICON[size]}",
        )

    # --- Animations --------------------------------------------------------
    anim = profile["animations"]
    anim_label = {
        "full": "Activer les animations",
        "reduced": "Réduire les animations",
        "off": "Désactiver les animations",
    }[anim]
    if de == "GNOME":
        enabled = "false" if anim == "off" else "true"
        add(anim_label, f"gsettings set org.gnome.desktop.interface enable-animations {enabled}")
    elif de == "KDE":
        add(
            anim_label,
            f"{kw} --file kdeglobals --group KDE --key AnimationDurationFactor {KDE_ANIM[anim]}",
        )
    elif de == "XFCE":
        enabled = "false" if anim == "off" else "true"
        add(anim_label, f"xfconf-query -c xfwm4 -p /general/use_compositing -s {enabled}")

    # --- Terminal ----------------------------------------------------------
    term = profile["terminal"]
    if not probe.which(term):
        ensure_packages([TERMINAL_PACKAGES[term]], f"le terminal {term}")

    # --- Raccourcis --------------------------------------------------------
    sc = profile["shortcuts"]
    sc_label = {
        "linux": "Rétablir les raccourcis clavier par défaut",
        "windows": "Appliquer les raccourcis clavier de type Windows",
        "macos": "Appliquer les raccourcis clavier de type macOS",
    }[sc]
    if de == "GNOME":
        wm = "org.gnome.desktop.wm.keybindings"
        if sc == "linux":
            cmd = f"gsettings reset {wm} show-desktop && gsettings reset {wm} close"
        elif sc == "windows":
            cmd = (
                f"gsettings set {wm} show-desktop \"['<Super>d']\" && "
                f"gsettings set {wm} close \"['<Alt>F4']\""
            )
        else:
            cmd = (
                f"gsettings set {wm} show-desktop \"['<Super>F3']\" && "
                f"gsettings set {wm} close \"['<Super>q']\""
            )
        add(sc_label, cmd)
    elif de == "KDE":
        values = {
            "linux": ("Meta+D", "Alt+F4"),
            "windows": ("Meta+D", "Alt+F4"),
            "macos": ("Meta+F3", "Meta+Q"),
        }[sc]
        add(
            sc_label,
            f"{kw} --file kglobalshortcutsrc --group kwin --key 'Show Desktop' "
            f"'{values[0]},Meta+D,Afficher le bureau' && "
            f"{kw} --file kglobalshortcutsrc --group kwin --key 'Window Close' "
            f"'{values[1]},Alt+F4,Fermer la fenêtre'",
        )
    elif de == "XFCE":
        base = "xfconf-query -c xfce4-keyboard-shortcuts -p"
        if sc == "linux":
            cmd = (
                f"{base} '/xfwm4/custom/<Super>d' -r ; "
                f"{base} '/xfwm4/custom/<Super>q' -r ; true"
            )
        elif sc == "windows":
            cmd = f"{base} '/xfwm4/custom/<Super>d' -n -t string -s show_desktop_key"
        else:
            cmd = f"{base} '/xfwm4/custom/<Super>q' -n -t string -s close_window_key"
        add(sc_label, cmd)

    # --- Habitudes Windows (schemaVersion 2) -------------------------------
    comfort = profile.get("comfort", [])
    if "windowButtons" in comfort and de == "GNOME":
        # KDE et XFCE affichent déjà ces boutons et réduisent au clic sur la barre des tâches.
        add(
            "Afficher les boutons réduire et agrandir sur les fenêtres",
            "gsettings set org.gnome.desktop.wm.preferences button-layout "
            "'appmenu:minimize,maximize,close'",
        )
    if "windowButtons" in comfort and de == "GNOME" and not taskbar:
        add(
            "Réduire une fenêtre en cliquant sur son icône dans le dock",
            "gsettings set org.gnome.shell.extensions.dash-to-dock click-action 'minimize'",
        )
    if "numlock" in comfort:
        label = "Allumer le pavé numérique à l'ouverture de session"
        if de == "GNOME":
            add(
                label,
                "gsettings set org.gnome.desktop.peripherals.keyboard remember-numlock-state true"
                " && gsettings set org.gnome.desktop.peripherals.keyboard numlock-state true",
            )
        elif de == "KDE":
            add(label, f"{kw} --file kcminputrc --group Keyboard --key NumLock 0")
        elif de == "XFCE":
            add(
                label,
                "xfconf-query -c keyboards -p /Default/RestoreNumlock -n -t bool -s true"
                " && xfconf-query -c keyboards -p /Default/Numlock -n -t bool -s true",
            )
    if "codecs" in comfort:
        ensure_packages(CODEC_PACKAGES[os_id], "les codecs vidéo et audio (MP4, MP3…)")
    if "officeFonts" in comfort:
        ensure_packages(
            FONT_PACKAGES[os_id], "les polices compatibles avec les documents Word et Excel"
        )
    if "touchpad" in comfort and de == "GNOME":
        add(
            "Pavé tactile comme sous Windows : toucher pour cliquer, clic droit en bas à droite",
            "gsettings set org.gnome.desktop.peripherals.touchpad tap-to-click true"
            " && gsettings set org.gnome.desktop.peripherals.touchpad click-method 'areas'",
        )
    if "doubleClick" in comfort and de == "KDE":
        # GNOME et XFCE ouvrent déjà les fichiers au double-clic.
        add(
            "Ouvrir les fichiers par double-clic",
            f"{kw} --file kdeglobals --group KDE --key SingleClick false",
        )
    if "dualBootClock" in comfort:
        add(
            "Garder la même heure que Windows en double démarrage — "
            "droits administrateur requis (pkexec) pour régler l'horloge matérielle",
            "pkexec timedatectl set-local-rtc 1",
        )

    # --- Essentiels de première installation (système, via pkexec) --------
    essentials = profile.get("essentials", [])
    if "archives" in essentials:
        ensure_packages(ARCHIVE_PACKAGES[os_id], "la prise en charge des archives .zip, .rar et .7z")
    if "firmware" in essentials:
        ensure_packages(
            FIRMWARE_PACKAGES[os_id],
            "les pilotes non libres (Wi-Fi, Bluetooth, carte graphique), conservés si vous annulez",
            track=False,  # les retirer pourrait couper le Wi-Fi
        )
    if "firewall" in essentials:
        if os_id == "fedora":
            ensure_packages(["firewalld"], "le pare-feu firewalld")
            add(
                f"Activer le pare-feu au démarrage — {SUDO_REASON_SYS}",
                "pkexec systemctl enable --now firewalld",
            )
        else:
            ensure_packages(["ufw"], "le pare-feu ufw")
            add(
                "Activer le pare-feu : connexions entrantes bloquées, sortantes autorisées — "
                f"{SUDO_REASON_SYS}",
                "pkexec ufw enable",
            )
    if "autoUpdates" in essentials:
        if os_id == "fedora":
            ensure_packages(["dnf5-plugin-automatic"], "les mises à jour automatiques")
            add(
                f"Installer les mises à jour automatiquement chaque jour — {SUDO_REASON_SYS}",
                f"pkexec sh -c '[ -e {DNF_AUTOMATIC_CONF} ] || "
                f"printf \"[commands]\\napply_updates = yes\\n\" > {DNF_AUTOMATIC_CONF}; "
                "systemctl enable --now dnf5-automatic.timer'",
            )
        else:
            ensure_packages(["unattended-upgrades"], "les mises à jour automatiques")
            add(
                f"Installer les mises à jour de sécurité automatiquement — {SUDO_REASON_SYS}",
                "pkexec sh -c 'echo \"unattended-upgrades unattended-upgrades/enable_auto_updates"
                " boolean true\" | debconf-set-selections"
                " && dpkg-reconfigure -f noninteractive unattended-upgrades'",
            )
    if "backup" in essentials:
        ensure_packages(
            ["timeshift"],
            "Timeshift, pour revenir en arrière après une mise à jour ratée "
            "(ouvrez-le ensuite pour choisir le disque des sauvegardes)",
        )

    # --- Logiciels (Flathub, pour l'utilisateur, sans mot de passe) ---------
    apps = profile.get("apps", [])
    if apps:
        if not probe.which("flatpak"):
            ensure_packages(["flatpak"], "Flatpak, le gestionnaire d'applications")
        if not probe.flathub_enabled():
            add(
                "Ajouter la logithèque Flathub (pour votre utilisateur, sans mot de passe)",
                FLATHUB_ADD,
                "repo-add",
            )
        for app in apps:
            app_id, name, replaces = APPS[app]
            if probe.flatpak_installed(app_id):
                continue
            label = name if name == replaces else f"{name} (remplace {replaces})"
            add(
                f"Installer {label} depuis Flathub",
                f"flatpak install --user -y --noninteractive flathub {app_id}",
                "package-install",
                flatpaks=[app_id],
            )

    # --- Extensions GNOME ----------------------------------------------------
    if de == "GNOME":
        if taskbar:
            add(
                "Masquer le dock (remplacé par la barre des tâches)",
                " ; ".join(f"gnome-extensions disable {u} 2>/dev/null" for u in DOCK_UUIDS) + " ; true",
            )
        for ext in profile.get("extensions", []):
            uuid, name, alternatives = EXTENSIONS[ext]
            present = [u for u in (uuid, *alternatives) if probe.extension_installed(u)]
            if present:
                if not any(probe.extension_enabled(u) for u in present):
                    add(f"Activer l'extension « {name} »", f"gnome-extensions enable {present[0]}")
                continue
            add(
                f"Installer l'extension « {name} » — GNOME vous demandera de confirmer",
                "r=$(gdbus call --session --dest org.gnome.Shell.Extensions "
                "--object-path /org/gnome/Shell/Extensions "
                f"--method org.gnome.Shell.Extensions.InstallRemoteExtension '{uuid}'); "
                "echo \"$r\"; [ \"$r\" = \"('successful',)\" ]",
                "package-install",
                extensions=[uuid],
            )

    actions = []
    for i, (desc, cmd, risk, extra) in enumerate(out, start=1):
        actions.append(Action(id=i, description=desc, command=cmd, risk=risk, **extra))  # type: ignore[arg-type]
    return actions


# ---------------------------------------------------------------------------
# Exécution
# ---------------------------------------------------------------------------


def log(line: str) -> None:
    path = config_dir() / "journal.log"
    path.parent.mkdir(parents=True, exist_ok=True)
    stamp = _dt.datetime.now().isoformat(timespec="seconds")
    with path.open("a", encoding="utf-8") as f:
        f.write(f"{stamp} {line}\n")


def run_command(command: str, timeout: int = 60) -> tuple[bool, str]:
    try:
        proc = subprocess.run(
            command, shell=True, capture_output=True, text=True, timeout=timeout
        )
    except subprocess.TimeoutExpired:
        return False, f"délai dépassé ({timeout} s)"
    except OSError as exc:
        return False, str(exc)
    output = (proc.stdout + proc.stderr).strip()
    return proc.returncode == 0, output


def download(url: str, target: str) -> tuple[bool, str]:
    dest = Path(target)
    dest.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "linxtailor/1.1"})
    try:
        with urllib.request.urlopen(req, timeout=30) as resp, dest.open("wb") as f:
            shutil.copyfileobj(resp, f)
    except Exception as exc:  # noqa: BLE001
        return False, f"téléchargement impossible : {exc}"
    return True, f"enregistré dans {dest}"


def record_installed(packages: list[str], filename: str = "installed-packages.txt") -> None:
    path = config_dir() / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    existing = set(path.read_text(encoding="utf-8").split()) if path.exists() else set()
    with path.open("a", encoding="utf-8") as f:
        for pkg in packages:
            if pkg not in existing:
                f.write(pkg + "\n")


def execute(actions: list[Action]) -> Iterator[dict]:
    """Exécute les actions dans l'ordre et s'arrête à la première erreur."""
    for action in actions:
        if action.kind == "download":
            ok, output = download(action.url, action.target)
        else:
            timeout = 600 if action.risk != "none" else 60
            ok, output = run_command(action.command, timeout=timeout)
        if ok and action.packages:
            record_installed(action.packages)
        if ok and action.flatpaks:
            record_installed(action.flatpaks, "installed-flatpaks.txt")
        if ok and action.extensions:
            record_installed(action.extensions, "installed-extensions.txt")
        log(f"[{'ok' if ok else 'erreur'}] #{action.id} {action.command}")
        yield {"actionId": action.id, "status": "ok" if ok else "error", "output": output}
        if not ok:
            return
