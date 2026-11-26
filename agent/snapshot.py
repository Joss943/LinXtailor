"""Sauvegarde et restauration de l'état du bureau, historique des profils."""
from __future__ import annotations

import datetime as _dt
import json
import shlex
from pathlib import Path

import executor
from executor import Probe, config_dir, kread, kwrite, remove_command, run_command

# Clés gsettings modifiables par l'application.
GNOME_KEYS: list[tuple[str, str]] = [
    ("org.gnome.desktop.interface", "color-scheme"),
    ("org.gnome.desktop.interface", "enable-animations"),
    ("org.gnome.desktop.background", "picture-uri"),
    ("org.gnome.desktop.background", "picture-uri-dark"),
    ("org.gnome.shell.extensions.dash-to-dock", "dock-position"),
    ("org.gnome.shell.extensions.dash-to-dock", "dash-max-icon-size"),
    ("org.gnome.desktop.wm.keybindings", "show-desktop"),
    ("org.gnome.desktop.wm.keybindings", "close"),
    ("org.gnome.desktop.wm.preferences", "button-layout"),
    ("org.gnome.desktop.peripherals.keyboard", "remember-numlock-state"),
    ("org.gnome.desktop.peripherals.keyboard", "numlock-state"),
]

# Clés KDE (fichier, groupe, clé) modifiables par l'application.
KDE_KEYS: list[tuple[str, str, str]] = [
    ("kdeglobals", "General", "ColorScheme"),
    ("kdeglobals", "KDE", "AnimationDurationFactor"),
    ("kdeglobals", "PanelIcons", "Size"),
    ("kcminputrc", "DesktopTailor", "DockPosition"),
    ("kglobalshortcutsrc", "kwin", "Show Desktop"),
    ("kglobalshortcutsrc", "kwin", "Window Close"),
    ("kcminputrc", "Keyboard", "NumLock"),
]

XFCE_CHANNELS = ["xsettings", "xfce4-panel", "xfwm4", "xfce4-desktop", "xfce4-keyboard-shortcuts", "keyboards"]

ABSENT = "<absent>"
HISTORY_SIZE = 5


def snapshots_dir() -> Path:
    return config_dir() / "snapshots"


def take(desktop: str, probe: Probe | None = None) -> Path:
    probe = probe or Probe()
    stamp = _dt.datetime.now().strftime("%Y%m%d-%H%M%S-%f")
    folder = snapshots_dir() / stamp
    folder.mkdir(parents=True, exist_ok=False)
    (folder / "meta.json").write_text(
        json.dumps({"desktop": desktop, "createdAt": stamp}), encoding="utf-8"
    )
    if desktop == "GNOME":
        lines = []
        for schema, key in GNOME_KEYS:
            ok, value = run_command(f"gsettings get {schema} {key}")
            lines.append(f"{schema} {key} {value if ok and value else ABSENT}")
        (folder / "gsettings.txt").write_text("\n".join(lines) + "\n", encoding="utf-8")
    elif desktop == "KDE":
        kr = kread(probe)
        entries = []
        for file, group, key in KDE_KEYS:
            ok, value = run_command(
                f"{kr} --file {file} --group {shlex.quote(group)} --key {shlex.quote(key)}"
            )
            entries.append(
                {"file": file, "group": group, "key": key, "value": value if ok and value else None}
            )
        (folder / "kde.json").write_text(json.dumps(entries, indent=2), encoding="utf-8")
    elif desktop == "XFCE":
        for channel in XFCE_CHANNELS:
            _, value = run_command(f"xfconf-query -c {channel} -l -v")
            (folder / f"xfconf-{channel}.txt").write_text(value + "\n", encoding="utf-8")
    return folder


def latest() -> Path | None:
    d = snapshots_dir()
    if not d.is_dir():
        return None
    folders = sorted(p for p in d.iterdir() if (p / "meta.json").exists())
    return folders[-1] if folders else None


def _parse_xfconf(text: str) -> dict[str, str]:
    props: dict[str, str] = {}
    for line in text.splitlines():
        if not line.startswith("/"):
            continue
        prop, _, value = line.partition(" ")
        props[prop] = value.strip()
    return props


def restore_commands(folder: Path, probe: Probe | None = None) -> list[str]:
    """Commandes qui réappliquent l'instantané (calculées sans rien exécuter)."""
    probe = probe or Probe()
    meta = json.loads((folder / "meta.json").read_text(encoding="utf-8"))
    desktop = meta["desktop"]
    cmds: list[str] = []
    if desktop == "GNOME":
        for line in (folder / "gsettings.txt").read_text(encoding="utf-8").splitlines():
            parts = line.split(" ", 2)
            if len(parts) != 3:
                continue
            schema, key, value = parts
            if value == ABSENT:
                cmds.append(f"gsettings reset {schema} {key}")
            else:
                cmds.append(f"gsettings set {schema} {key} {shlex.quote(value)}")
    elif desktop == "KDE":
        kw = kwrite(probe)
        for e in json.loads((folder / "kde.json").read_text(encoding="utf-8")):
            target = f"--file {e['file']} --group {shlex.quote(e['group'])} --key {shlex.quote(e['key'])}"
            if e["value"] is None:
                cmds.append(f"{kw} {target} --delete")
            else:
                cmds.append(f"{kw} {target} {shlex.quote(e['value'])}")
                if e["key"] == "ColorScheme":
                    cmds.append(f"plasma-apply-colorscheme {shlex.quote(e['value'])}")
    elif desktop == "XFCE":
        for channel in XFCE_CHANNELS:
            path = folder / f"xfconf-{channel}.txt"
            if not path.exists():
                continue
            before = _parse_xfconf(path.read_text(encoding="utf-8"))
            _, now_text = run_command(f"xfconf-query -c {channel} -l -v")
            now = _parse_xfconf(now_text)
            for prop, value in before.items():
                if now.get(prop) != value:
                    cmds.append(
                        f"xfconf-query -c {channel} -p {shlex.quote(prop)} -s {shlex.quote(value)}"
                    )
            for prop in now.keys() - before.keys():
                cmds.append(f"xfconf-query -c {channel} -p {shlex.quote(prop)} -r")
    return cmds


def rollback(os_id: str) -> bool:
    folder = latest()
    if folder is None:
        return False
    ok_all = True
    for cmd in restore_commands(folder):
        ok, out = run_command(cmd)
        executor.log(f"[rollback {'ok' if ok else 'erreur'}] {cmd} {out if not ok else ''}".strip())
        ok_all = ok_all and ok
    pkg_file = config_dir() / "installed-packages.txt"
    if pkg_file.exists():
        packages = pkg_file.read_text(encoding="utf-8").split()
        if packages:
            ok, out = run_command(remove_command(os_id, packages), timeout=600)
            executor.log(f"[rollback {'ok' if ok else 'erreur'}] suppression {' '.join(packages)}")
            if ok:
                pkg_file.unlink()
            ok_all = ok_all and ok
        else:
            pkg_file.unlink()
    return ok_all


def add_history(profile: dict) -> None:
    path = config_dir() / "history.json"
    path.parent.mkdir(parents=True, exist_ok=True)
    try:
        history = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(history, list):
            history = []
    except (OSError, ValueError):
        history = []
    history.append(
        {"appliedAt": _dt.datetime.now().isoformat(timespec="seconds"), "profile": profile}
    )
    path.write_text(json.dumps(history[-HISTORY_SIZE:], indent=2, ensure_ascii=False), encoding="utf-8")
