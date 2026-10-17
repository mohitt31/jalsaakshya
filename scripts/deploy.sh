#!/usr/bin/env bash
# Build the static site and publish it to the gh-pages branch (GitHub Pages).
# If an Arkiv access key file exists outside the repo, it is baked into this build only
# (the key is restricted to the site's origin in the Arkiv Hub and is never committed).
set -euo pipefail
cd "$(dirname "$0")/.."
KEYFILE="${ARKIV_KEY_FILE:-$HOME/.jalsaakshya-arkiv-key}"
if [ -f "$KEYFILE" ]; then export VITE_ARKIV_KEY="$(tr -d '[:space:]' < "$KEYFILE")"; echo "build: using access key from $KEYFILE"; fi
(cd web && npm run build >/dev/null)
touch dist/.nojekyll
cd dist
rm -rf .git && git init -q -b gh-pages && git add -A
git -c user.name="Mohit Prajapati" -c user.email="mohitprajapati3112@gmail.com" commit -q -m "Deploy site from main@$(git -C .. rev-parse --short HEAD)"
git push -q -f https://github.com/mohitt31/jalsaakshya gh-pages 2>&1 | grep -v -e negotiation -e acknowledgments || true
