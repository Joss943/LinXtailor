"""Détection du système : distribution, environnement de bureau, matériel."""
from __future__ import annotations

import os
import shutil
import subprocess
from pathlib import Path

# Versions connues et indicateur de fin de vie (True = EOL), au 2026-11.
# Une version absente de la table est comparée à la plus ancienne version
# maintenue : plus ancienne -> EOL, plus récente -> maintenue.
SUPPORTED_VERSIONS: dict[str, dict[str, bool]] = {
    "fedora": {"40": True, "41": True, "42": True, "43": False, "44": False},
    "ubuntu": {
        "22.04": False,
        "24.04": False,
        "24.10": True,
        "25.04": True,
        "25.10": True,
        "26.04": False,
    },
    "debian": {"12": False, "13": False},
}

SUPPORTED_DESKTOPS = ("GNOME", "KDE", "XFCE")


def _version_tuple(v: str) -> tuple[int, ...]:
    parts = []
    for p in v.split("."):
        if not p.isdigit():
            break
        parts.append(int(p))
    return tuple(parts)


def parse_os_release(text: str) -> tuple[str, str]:
    """Retourne (os, version). Seul le champ ID est pris en compte."""
    fields: dict[str, str] = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, value = line.partition("=")
        fields[key.strip()] = value.strip().strip('"').strip("'")
    os_id = fields.get("ID", "").lower()
    if os_id not in SUPPORTED_VERSIONS:
        return "unsupported", fields.get("VERSION_ID", "")
    return os_id, fields.get("VERSION_ID", "")


def is_eol(os_id: str, version: str) -> bool:
    table = SUPPORTED_VERSIONS.get(os_id)
    if table is None:
        return False
    if version in table:
        return table[version]
    current = _version_tuple(version)
    if not current:  # ex. Debian testing/sid : pas de VERSION_ID
        return False
    maintained = [_version_tuple(v) for v, eol in table.items() if not eol]
    if not maintained:
        return True
    return current < min(maintained)


def parse_desktop(value: str | None) -> str:
    """XDG_CURRENT_DESKTOP peut valoir « ubuntu:GNOME » : on teste chaque élément."""
    for token in (value or "").split(":"):
        token = token.strip().upper()
        if token in SUPPORTED_DESKTOPS:
            return token
    return "unsupported"


def parse_meminfo(text: str) -> int:
    for line in text.splitlines():
        if line.startswith("MemTotal:"):
            kib = int(line.split()[1])
            return round(kib / 1024 / 1024)
    return 0


def parse_gpu(lspci_vga: str) -> str:
    """Analyse la sortie de « lspci | grep -i vga »."""
    text = lspci_vga.lower()
    if "nvidia" in text:
        return "nvidia"
    if "amd" in text or "ati " in text or "radeon" in text or "advanced micro devices" in text:
        return "amd"
    if "intel" in text:
        return "intel"
    return "unknown"


def _read(path: str) -> str:
    try:
        return Path(path).read_text(encoding="utf-8", errors="replace")
    except OSError:
        return ""


def _ram_gb() -> int:
    ram = parse_meminfo(_read("/proc/meminfo"))
    if ram == 0:
        try:
            import psutil

            ram = round(psutil.virtual_memory().total / 1024**3)
        except Exception:
            ram = 0
    return ram


def _gpu() -> str:
    try:
        out = subprocess.run(
            "lspci | grep -i vga", shell=True, capture_output=True, text=True, timeout=10
        ).stdout
    except Exception:
        return "unknown"
    return parse_gpu(out)


def detect() -> dict:
    os_id, version = parse_os_release(_read("/etc/os-release"))
    try:
        disk_free = round(shutil.disk_usage("/").free / 1024**3)
    except OSError:
        disk_free = 0
    return {
        "os": os_id,
        "osVersion": version,
        "eol": is_eol(os_id, version),
        "desktop": parse_desktop(os.environ.get("XDG_CURRENT_DESKTOP")),
        "ramGb": _ram_gb(),
        "diskFreeGb": disk_free,
        "gpu": _gpu(),
    }


def is_weak_machine(detection: dict) -> bool:
    return detection.get("ramGb", 0) < 4 or detection.get("gpu") == "unknown"
