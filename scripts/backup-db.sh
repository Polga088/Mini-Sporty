#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[backup-db] DATABASE_URL manquant." >&2
  exit 1
fi

BACKUP_DIR="${BACKUP_DIR:-/var/backups/mini-sporty}"
TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
BACKUP_FILE="${BACKUP_DIR}/mini-sporty-${TIMESTAMP}.sql.gz"

umask 077
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"

echo "[backup-db] Création de ${BACKUP_FILE}"
pg_dump "$DATABASE_URL" | gzip > "$BACKUP_FILE"
chmod 600 "$BACKUP_FILE"

old_backups="$(ls -1t "${BACKUP_DIR}"/mini-sporty-*.sql.gz 2>/dev/null || true)"
if [[ -n "$old_backups" ]]; then
  i=1
  # Conserver les 14 sauvegardes les plus récentes.
  set -- $old_backups
  for file in "$@"; do
    if [[ "$i" -gt 14 ]]; then
      rm -f "$file"
    fi
    i=$((i + 1))
  done
fi

echo "[backup-db] Terminé."
