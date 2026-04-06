#!/bin/zsh

set -euo pipefail

DEV_PID_FILE=/tmp/forti-dev.pid
CF_PID_FILE=/tmp/forti-cloudflared.pid

kill_from_pid_file() {
  local pid_file="$1"
  local label="$2"

  if [ ! -f "$pid_file" ]; then
    echo "$label not running"
    return
  fi

  local pid
  pid=$(cat "$pid_file")

  if kill -0 "$pid" 2>/dev/null; then
    kill "$pid"
    echo "stopped $label ($pid)"
  else
    echo "$label pid file was stale ($pid)"
  fi

  rm -f "$pid_file"
}

kill_from_pid_file "$CF_PID_FILE" "cloudflared"
kill_from_pid_file "$DEV_PID_FILE" "dev server"
