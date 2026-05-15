#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$SCRIPT_DIR/dev-lan-common.sh"

if [ -z "${LOCAL_USER_EMAIL:-}" ] && [ -z "${LOCAL_USER_EMAILS:-}" ]; then
  echo "Set LOCAL_USER_EMAIL or LOCAL_USER_EMAILS before running this script." >&2
  exit 1
fi

if [ -z "${NEXT_PUBLIC_LOCAL_USER_EMAIL:-}" ] && [ -n "${LOCAL_USER_EMAIL:-}" ]; then
  NEXT_PUBLIC_LOCAL_USER_EMAIL="$LOCAL_USER_EMAIL"
fi

LOCAL_USER_LOGIN="${LOCAL_USER_LOGIN:-true}" \
NEXT_PUBLIC_ENABLE_LOCAL_USER_LOGIN="${NEXT_PUBLIC_ENABLE_LOCAL_USER_LOGIN:-true}" \
DISABLE_GOOGLE_AUTH="${DISABLE_GOOGLE_AUTH:-true}" \
NEXT_PUBLIC_DISABLE_GOOGLE_AUTH="${NEXT_PUBLIC_DISABLE_GOOGLE_AUTH:-true}" \
NEXT_PUBLIC_LOCAL_USER_EMAIL="${NEXT_PUBLIC_LOCAL_USER_EMAIL:-}" \
NEXTAUTH_URL="$URL" \
exec npm run dev --workspace=@forti/web -- -H 0.0.0.0 -p "$PORT"
