#!/usr/bin/env bash
# Construit dist/desktop-tailor.tar.gz : agent + interface déjà compilée (aucun Node.js requis à l'installation).
set -euo pipefail
cd "$(dirname "$0")/.."
npm --prefix web ci
npm --prefix web run build
rm -rf dist && mkdir -p dist/desktop-tailor/agent
cp agent/*.py agent/requirements.txt dist/desktop-tailor/agent/
cp -r web/dist dist/desktop-tailor/web
cp README.md install.sh dist/desktop-tailor/
tar -czf dist/desktop-tailor.tar.gz -C dist desktop-tailor
echo "dist/desktop-tailor.tar.gz"
