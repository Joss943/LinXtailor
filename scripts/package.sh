#!/usr/bin/env bash
# Construit dist/linxtailor.tar.gz : agent + interface déjà compilée (aucun Node.js requis à l'installation).
set -euo pipefail
cd "$(dirname "$0")/.."
npm --prefix web ci
npm --prefix web run build
rm -rf dist && mkdir -p dist/linxtailor/agent
cp agent/*.py agent/requirements.txt dist/linxtailor/agent/
cp -r web/dist dist/linxtailor/web
cp -r data dist/linxtailor/
cp README.md LICENSE install.sh dist/linxtailor/
tar -czf dist/linxtailor.tar.gz -C dist linxtailor
echo "dist/linxtailor.tar.gz"
