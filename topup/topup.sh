#!/usr/bin/env bash
# -----------------------------------------------------------------------------
# Lumapps demo — Amplitude data top-up
#
# Generates and uploads synthetic events for every day between the last
# successful run (taxonomies/lumapps.state.json → last_run_date) and today
# (UTC), inclusive. Missed days in between are filled automatically.
#
# Usage:
#   ./topup.sh              # top up and upload
#   ./topup.sh --dry-run    # generate only, nothing is sent, state unchanged
#   ./topup.sh --status     # show last run date and how many days are missing
#
# Optional env:
#   AMPLITUDE_API_KEY   override the API key stored in the state file
#   PYTHON              python interpreter to use (default: python3)
#
# Safe to re-run: events carry deterministic insert_ids, so Amplitude
# de-duplicates any day that is uploaded twice.
# -----------------------------------------------------------------------------
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SLUG="lumapps"
STATE="$HERE/taxonomies/$SLUG.state.json"
VENV="$HERE/.venv"
LOG_DIR="$HERE/logs"
LOCK="$HERE/.topup.lock"
PY="${PYTHON:-python3}"

MODE="upload"
case "${1:-}" in
  "")          ;;
  --dry-run)   MODE="dry-run" ;;
  --status)    MODE="status" ;;
  -h|--help)   sed -n '2,21p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
  *)           echo "Unknown option: $1 (use --help)" >&2; exit 2 ;;
esac

[[ -f "$STATE" ]] || { echo "State file not found: $STATE" >&2; exit 1; }
command -v "$PY" >/dev/null || { echo "python3 not found (set PYTHON=...)" >&2; exit 1; }

last_run="$("$PY" -c 'import json,sys;print(json.load(open(sys.argv[1]))["last_run_date"])' "$STATE")"
today="$(date -u +%Y-%m-%d)"
missing="$("$PY" -c 'import sys,datetime as d;a=d.date.fromisoformat(sys.argv[1]);b=d.date.fromisoformat(sys.argv[2]);print(max((b-a).days,0))' "$last_run" "$today")"

echo "Lumapps top-up — last run: $last_run · today (UTC): $today · missing day(s): $missing"
[[ "$MODE" == "status" ]] && exit 0
if [[ "$missing" == "0" ]]; then echo "Already up to date."; exit 0; fi

# --- single-run lock --------------------------------------------------------
if ! mkdir "$LOCK" 2>/dev/null; then
  echo "Another top-up appears to be running ($LOCK). Remove it if stale." >&2
  exit 1
fi
trap 'rmdir "$LOCK" 2>/dev/null || true' EXIT

# --- dependencies: use system python if it has requests, else a local venv --
if "$PY" -c 'import requests' 2>/dev/null; then
  RUN_PY="$PY"
else
  if [[ ! -x "$VENV/bin/python" ]]; then
    echo "Creating virtualenv in $VENV (one-off) …"
    "$PY" -m venv "$VENV"
    "$VENV/bin/python" -m pip install --quiet --upgrade pip
    "$VENV/bin/python" -m pip install --quiet "requests>=2.31,<3"
  fi
  RUN_PY="$VENV/bin/python"
fi

# --- run ---------------------------------------------------------------------
mkdir -p "$LOG_DIR"
LOG="$LOG_DIR/topup_$(date -u +%Y%m%dT%H%M%SZ)_$$.log"
ARGS=(--taxonomy "$SLUG" --top-up)
[[ "$MODE" == "dry-run" ]] && ARGS+=(--dry-run)

echo "Running generator ($MODE) — log: $LOG"
cd "$HERE/scripts"
set +e
"$RUN_PY" generate.py "${ARGS[@]}" >"$LOG" 2>&1
rc=$?
set -e

if [[ $rc -ne 0 ]]; then
  echo "❌ Top-up failed (exit $rc). Last lines of the log:" >&2
  tail -n 25 "$LOG" >&2
  exit $rc
fi

# Show the useful bits (skip the dry-run event dump)
grep -E "Topping up|Generating|Sent [0-9]+ events|Group-identified|DRY-RUN\] Total|already up to date|State saved" "$LOG" || true
sed -n '/FUNNEL SUMMARY/,$p' "$LOG" | head -n 14 || true

new_last="$("$PY" -c 'import json,sys;print(json.load(open(sys.argv[1]))["last_run_date"])' "$STATE")"
if [[ "$MODE" == "dry-run" ]]; then
  echo "✅ Dry run OK — nothing uploaded; state still at $new_last."
else
  echo "✅ Topped up $missing day(s): $(date -u -j -v+1d -f %Y-%m-%d "$last_run" +%Y-%m-%d 2>/dev/null || date -u -d "$last_run +1 day" +%Y-%m-%d) → $today. State now at $new_last."
fi
