#!/bin/bash
# Deploy www.clubpluto.eu – körs från webhook.
# REPO_ROOT bestäms från skriptets plats.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

MANUAL_DEPLOY_BRANCH="main"
DEPLOY_BRANCH="${DEPLOY_BRANCH:-$MANUAL_DEPLOY_BRANCH}"

echo "=== Deploy Club Pluto start $(date -Is) ==="
echo "REPO_ROOT=$REPO_ROOT"
echo "DEPLOY_BRANCH=$DEPLOY_BRANCH"

git fetch --all
git reset --hard "origin/${DEPLOY_BRANCH}"
echo "Git HEAD: $(git rev-parse --short HEAD)"

if [[ -f "$REPO_ROOT/scripts/backup-db.sh" ]]; then
  bash "$REPO_ROOT/scripts/backup-db.sh" \
    || echo "VARNING: databasbackup misslyckades – fortsätter deploy"
else
  echo "VARNING: scripts/backup-db.sh saknas – fortsätter utan backup"
fi

cd "$REPO_ROOT/frontend"
npm ci
export VITE_API_URL=https://www.clubpluto.eu/api
npm run build

cd "$REPO_ROOT/backend"
npm ci
npm run migrate

cd "$REPO_ROOT"
pm2 restart clubpluto-backend || pm2 start ecosystem.config.cjs

echo "=== Deploy Club Pluto klar $(date -Is) ==="
