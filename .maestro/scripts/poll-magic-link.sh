#!/bin/bash
# Polls Mailpit for the most recent email and extracts the unquest:// magic-link
# deep link from its HTML body. Prints the deep link to stdout on success.
#
# Usage: poll-magic-link.sh [max_attempts] [sleep_seconds]
set -euo pipefail

MAILPIT_URL="${MAILPIT_URL:-http://localhost:8025}"
MAX_ATTEMPTS="${1:-30}"
SLEEP_SECONDS="${2:-1}"
RESPONSE_FILE=$(mktemp)
trap 'rm -f "$RESPONSE_FILE"' EXIT

for _ in $(seq 1 "$MAX_ATTEMPTS"); do
  HTTP_CODE=$(curl -s -o "$RESPONSE_FILE" -w "%{http_code}" "${MAILPIT_URL}/api/v1/message/latest" || echo "000")

  if [ "$HTTP_CODE" = "200" ]; then
    DEEPLINK=$(node -e "
      const fs = require('fs');
      const msg = JSON.parse(fs.readFileSync('$RESPONSE_FILE', 'utf8'));
      const match = (msg.HTML || '').match(/unquest:\/\/auth\/magiclink\/verify\?token=([^\"]+)/);
      if (match) process.stdout.write('unquest://auth/magiclink/verify?token=' + match[1]);
    ")

    if [ -n "$DEEPLINK" ]; then
      echo "$DEEPLINK"
      exit 0
    fi
  fi

  sleep "$SLEEP_SECONDS"
done

echo "ERROR: magic-link email not found in Mailpit after ${MAX_ATTEMPTS} attempts" >&2
exit 1
