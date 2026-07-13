#!/usr/bin/env bash
#
# free-metro-port.sh
# Frees the Metro dev-server port before `expo run:ios` / `expo start`.
#
# Why this exists:
#   `expo run:ios` starts Metro as a forked child on port 8081. If a previous
#   run's Metro was orphaned (Ctrl+C returned your prompt but left the fork
#   holding the port), the next run sees the busy port, decides "same project is
#   already running", and SKIPS starting a fresh dev server — so the new terminal
#   gets no logs and no HMR. Freeing the port first makes that impossible.
#
# Wire it in by prefixing the run scripts, e.g.:
#   "ios":   "bash scripts/free-metro-port.sh && cross-env EXPO_NO_DOTENV=1 expo run:ios",
#   "start": "bash scripts/free-metro-port.sh && cross-env EXPO_NO_DOTENV=1 expo start",

set -euo pipefail

PORT="${RCT_METRO_PORT:-8081}"

# PID(s) listening on the port (empty if nothing is there). -sTCP:LISTEN avoids
# matching mere client connections; there may be more than one PID.
PIDS="$(lsof -ti "tcp:${PORT}" -sTCP:LISTEN 2>/dev/null || true)"

if [ -z "$PIDS" ]; then
  exit 0   # port is free, nothing to do
fi

PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# ─────────────────────────────────────────────────────────────────────────────
# TODO(you): choose and implement the KILL POLICY.
#
# The trade-off is safety vs. aggressiveness:
#
#   Option A — kill unconditionally.
#     Simple. But it also kills an UNRELATED server you might legitimately run
#     on this port (another project's Metro, a local API on 8081, etc.).
#
#   Option B — kill only if the process's cwd is THIS project (recommended).
#     Mirrors Expo's own `directory === projectRoot` check, so you only ever
#     reclaim your own orphan and never surprise-kill someone else's server.
#     Get a pid's working directory on macOS with:
#       lsof -p "$pid" | awk '$4=="cwd" {for (i=9;i<=NF;i++) printf "%s ",$i}'
#     then compare the trimmed result against "$PROJECT_DIR".
#
# Loop over $PIDS and `kill -9 "$pid"` the ones your policy selects.
# Your ~5-10 lines go here:

# <-- implement here -->

# ─────────────────────────────────────────────────────────────────────────────
