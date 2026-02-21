#!/bin/bash
set -euo pipefail

# Only run in Claude Code remote (web) sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo '{"async": true, "asyncTimeout": 300000}'

# Install GitHub CLI if not already present
if ! command -v gh &> /dev/null; then
  apt-get install -y gh
fi

# Install Node dependencies (also runs prisma generate via postinstall)
npm install
