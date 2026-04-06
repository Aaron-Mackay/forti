#!/bin/zsh

set -euo pipefail

DEV_LOG=/tmp/forti-dev.log
CF_LOG=/tmp/cloudflared.log
DEV_PID_FILE=/tmp/forti-dev.pid
CF_PID_FILE=/tmp/forti-cloudflared.pid
QR_PNG=/tmp/forti-share.png
PORT=3000
LOCAL_URL="http://localhost:$PORT"

for cmd in curl cloudflared qrencode rg; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Missing required command: $cmd" >&2
    exit 1
  fi
done

is_macos_jetbrains_runner() {
  [ "$(uname -s)" = "Darwin" ] || return 1

  [ -n "${JETBRAINS_IDE:-}" ] && return 0
  [ -n "${IDEA_INITIAL_DIRECTORY:-}" ] && return 0
  [ -n "${PYCHARM_HOSTED:-}" ] && return 0
  [ "${TERMINAL_EMULATOR:-}" = "JetBrains-JediTerm" ] && return 0

  case "${TERM_PROGRAM:-}" in
    *JetBrains*|*JediTerm*)
      return 0
      ;;
  esac

  return 1
}

if [ -f "$DEV_PID_FILE" ] && kill -0 "$(cat "$DEV_PID_FILE")" 2>/dev/null; then
  echo "Dev server already running with pid $(cat "$DEV_PID_FILE"). Run npm run dev:share:kill first if needed." >&2
  exit 1
fi

if [ -f "$CF_PID_FILE" ] && kill -0 "$(cat "$CF_PID_FILE")" 2>/dev/null; then
  echo "Cloudflared already running with pid $(cat "$CF_PID_FILE"). Run npm run dev:share:kill first if needed." >&2
  exit 1
fi

: > "$DEV_LOG"
: > "$CF_LOG"

npm run dev >"$DEV_LOG" 2>&1 &
DEV_PID=$!
echo "$DEV_PID" > "$DEV_PID_FILE"

until curl -fsS "$LOCAL_URL" >/dev/null 2>&1; do
  if ! kill -0 "$DEV_PID" 2>/dev/null; then
    echo "Dev server exited unexpectedly. See $DEV_LOG" >&2
    rm -f "$DEV_PID_FILE"
    exit 1
  fi
  sleep 0.5
done

cloudflared tunnel --url "$LOCAL_URL" >"$CF_LOG" 2>&1 &
CF_PID=$!
echo "$CF_PID" > "$CF_PID_FILE"

URL=""
until [ -n "$URL" ]; do
  if ! kill -0 "$CF_PID" 2>/dev/null; then
    echo "cloudflared exited unexpectedly. See $CF_LOG" >&2
    rm -f "$CF_PID_FILE"
    exit 1
  fi
  URL=$(rg -o 'https://[-a-z0-9]+\.trycloudflare\.com' -m 1 "$CF_LOG" || true)
  sleep 0.2
done

echo "$URL"
if is_macos_jetbrains_runner; then
  qrencode -o "$QR_PNG" "$URL"
  open "$QR_PNG"
  echo "QR saved to $QR_PNG and opened in Preview"
else
  qrencode -t ANSIUTF8 "$URL"
fi
echo "dev pid: $DEV_PID | cloudflared pid: $CF_PID"
echo "logs: $DEV_LOG | $CF_LOG"
