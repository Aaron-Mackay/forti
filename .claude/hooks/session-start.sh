#!/bin/bash
set -euo pipefail

# Only run in Claude Code remote (web) sessions
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

echo '{"async": true, "asyncTimeout": 300000}'

echo "[session-start] Starting setup at $(date)"

# Install GitHub CLI if not already present
if ! command -v gh &> /dev/null; then
  echo "[session-start] gh not found, installing..."
  apt-get install -y gh
  echo "[session-start] gh installed at $(date)"
else
  echo "[session-start] gh already installed, skipping"
fi

# Install Node dependencies (also runs prisma generate via postinstall)
echo "[session-start] Running npm install at $(date)"
npm install
echo "[session-start] npm install complete at $(date)"

# Install Playwright browsers
echo "[session-start] Installing Playwright browsers at $(date)"
npx playwright install --with-deps chromium || echo "[session-start] Playwright browser install skipped (already cached or download unavailable)"
echo "[session-start] Playwright browsers step complete at $(date)"

echo "[session-start] Setup complete at $(date)"
