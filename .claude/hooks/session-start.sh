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
  curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
    | dd of=/usr/share/keyrings/githubcli-archive-keyring.gpg
  chmod go+r /usr/share/keyrings/githubcli-archive-keyring.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
    > /etc/apt/sources.list.d/github-cli.list
  apt-get update -qq
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

# Set up local PostgreSQL for E2E tests
# The remote environment has a postgres cluster but it starts 'down'. Start it,
# set a password, write .env.local pointing to localhost, push the schema, and
# seed so that auth + all E2E tests work without needing the Neon DB.
echo "[session-start] Setting up local PostgreSQL at $(date)"
pg_ctlcluster 16 main start 2>/dev/null || true

# Set password so psql / Prisma can connect via TCP
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'postgres';" 2>/dev/null || true

# Write .env.local only if it doesn't already point at localhost
if ! grep -q "localhost" .env.local 2>/dev/null; then
  cat > .env.local <<'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
NEXTAUTH_SECRET=local-dev-secret
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=dummy
GOOGLE_CLIENT_SECRET=dummy
EOF
  echo "[session-start] Wrote .env.local for local DB"
fi

# Push Prisma schema and seed (idempotent — safe to re-run)
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres npx prisma db push --skip-generate 2>&1 | tail -3
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres npm run seed 2>&1 | tail -3

echo "[session-start] Local PostgreSQL ready at $(date)"

echo "[session-start] Setup complete at $(date)"
