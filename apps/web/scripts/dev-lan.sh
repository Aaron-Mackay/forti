#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
. "$SCRIPT_DIR/dev-lan-common.sh"

# Caller-provided LOCAL_USER_* and NEXT_PUBLIC_* env vars flow through unchanged.
NEXTAUTH_URL="$URL" exec npm run dev --workspace=@forti/web -- -H 0.0.0.0 -p "$PORT"
