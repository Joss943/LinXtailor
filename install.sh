#!/usr/bin/env bash
# Installation de Desktop Tailor pour l'utilisateur courant (Fedora, Ubuntu, Debian).
#   curl -fsSL https://raw.githubusercontent.com/Joss943/kinginlinux/main/install.sh | bash
#
# Installe dans ~/.local/share/desktop-tailor, ajoute la commande « desktop-tailor »
# et une entrée « Desktop Tailor » dans le menu des applications.
# Variable facultative : DT_ARCHIVE=/chemin/desktop-tailor.tar.gz (archive locale).
set -euo pipefail

REPO="Joss943/kinginlinux"
URL="https://github.com/${REPO}/releases/latest/download/desktop-tailor.tar.gz"
DEST="${HOME}/.local/share/desktop-tailor"
BIN="${HOME}/.local/bin"
APPS="${HOME}/.local/share/applications"

info() { printf '\033[1m==>\033[0m %s\n' "$*"; }
fail() { printf '\033[31mErreur :\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -ne 0 ] || fail "lancez ce script sans sudo : il s'installe pour votre utilisateur."

# --- Distribution ------------------------------------------------------------
[ -r /etc/os-release ] || fail "impossible de lire /etc/os-release."
. /etc/os-release
case "${ID:-}" in
  fedora) PKG_INSTALL="sudo dnf install -y" ;;
  ubuntu|debian) PKG_INSTALL="sudo apt-get install -y" ;;
  *) fail "distribution « ${ID:-inconnue} » non prise en charge (Fedora, Ubuntu ou Debian uniquement)." ;;
esac
info "Distribution détectée : ${PRETTY_NAME:-$ID}"

# --- Prérequis : python3 avec venv, curl, tar ------------------------------------
missing=()
command -v curl >/dev/null || missing+=(curl)
command -v tar >/dev/null || missing+=(tar)
if ! command -v python3 >/dev/null; then
  missing+=(python3)
  [ "$ID" = fedora ] || missing+=(python3-venv)
else
  tmp="$(mktemp -d)"
  python3 -m venv "$tmp/v" >/dev/null 2>&1 || { [ "$ID" = fedora ] || missing+=(python3-venv); }
  rm -rf "$tmp"
fi
if [ "${#missing[@]}" -gt 0 ]; then
  info "Paquets manquants : ${missing[*]}"
  info "Leur installation demande votre mot de passe administrateur (sudo)."
  [ "$ID" = fedora ] || sudo apt-get update
  $PKG_INSTALL "${missing[@]}"
fi

# --- Téléchargement ---------------------------------------------------------------
info "Installation dans ${DEST}"
rm -rf "${DEST}.new"
mkdir -p "${DEST}.new"
if [ -n "${DT_ARCHIVE:-}" ]; then
  tar -xzf "$DT_ARCHIVE" -C "${DEST}.new" --strip-components=1
else
  info "Téléchargement de la dernière version depuis GitHub"
  curl -fsSL "$URL" | tar -xz -C "${DEST}.new" --strip-components=1
fi
[ -f "${DEST}.new/agent/server.py" ] && [ -f "${DEST}.new/web/index.html" ] \
  || fail "archive incomplète."

info "Préparation de l'environnement Python"
python3 -m venv "${DEST}.new/.venv"
"${DEST}.new/.venv/bin/pip" install --quiet --disable-pip-version-check -r "${DEST}.new/agent/requirements.txt"

rm -rf "$DEST"
mv "${DEST}.new" "$DEST"

# --- Commande et entrée de menu -----------------------------------------------------
mkdir -p "$BIN" "$APPS"
cat > "$BIN/desktop-tailor" <<'LAUNCHER'
#!/usr/bin/env bash
# Lance Desktop Tailor : agent (127.0.0.1:7420) + interface (http://localhost:5173).
set -u
DIR="${HOME}/.local/share/desktop-tailor"
PY="$DIR/.venv/bin/python"
UI="http://localhost:5173"

stop() {
  pkill -f "$DIR/agent/server.py" 2>/dev/null
  pkill -f "http.server 5173 --bind 127.0.0.1 --directory $DIR/web" 2>/dev/null
  return 0
}

case "${1:-}" in
  --stop) stop; echo "Desktop Tailor est arrêté."; exit 0 ;;
  --uninstall)
    stop
    rm -rf "$DIR" "${HOME}/.local/share/applications/desktop-tailor.desktop"
    rm -f "${HOME}/.local/bin/desktop-tailor"
    echo "Desktop Tailor est désinstallé. Vos sauvegardes restent dans ~/.config/desktop-tailor."
    exit 0 ;;
  --help|-h)
    echo "Usage : desktop-tailor [--stop | --uninstall]"; exit 0 ;;
esac

running() { curl -fs -o /dev/null "http://127.0.0.1:7420/health" 2>/dev/null; }

if ! running; then
  stop
  cd "$DIR" || exit 1
  nohup "$PY" "$DIR/agent/server.py" >"$DIR/agent.log" 2>&1 &
  nohup "$PY" -m http.server 5173 --bind 127.0.0.1 --directory "$DIR/web" >"$DIR/web.log" 2>&1 &
  for _ in $(seq 1 50); do running && break; sleep 0.1; done
fi
if ! running; then
  echo "L'agent n'a pas démarré. Journal : $DIR/agent.log" >&2
  exit 1
fi
xdg-open "$UI" >/dev/null 2>&1 || echo "Ouvrez $UI dans votre navigateur."
echo "Desktop Tailor tourne en arrière-plan. Pour l'arrêter : desktop-tailor --stop"
LAUNCHER
chmod +x "$BIN/desktop-tailor"

cat > "$APPS/desktop-tailor.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=Desktop Tailor
Comment=Personnaliser son bureau Linux
Exec=${BIN}/desktop-tailor
Icon=preferences-desktop
Terminal=false
Categories=Settings;DesktopSettings;
DESKTOP

info "Desktop Tailor est installé."
echo "  • Menu des applications : « Desktop Tailor »"
echo "  • Ou dans un terminal : desktop-tailor"
case ":${PATH}:" in
  *":${BIN}:"*) ;;
  *) echo "  (Ouvrez un nouveau terminal pour que la commande soit reconnue.)" ;;
esac
