#!/usr/bin/env bash
# One command for local development: start local Supabase, write the apps'
# .env.local files if they are missing, regenerate the database types, then run
# the Admin app on :3000 and the Mobile app's web build on :8081.
#
# Usage: pnpm dev          (from the repo root; needs Docker running)
#        KEEP_SUPABASE=1 pnpm dev   leaves the Supabase stack running on exit
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> Starting local Supabase"
pnpm supabase start

status="$(pnpm --silent supabase status -o env)"
api_url="$(printf '%s\n' "$status" | sed -n 's/^API_URL="\(.*\)"$/\1/p')"
anon_key="$(printf '%s\n' "$status" | sed -n 's/^ANON_KEY="\(.*\)"$/\1/p')"
if [ -z "$anon_key" ]; then
  anon_key="$(printf '%s\n' "$status" | sed -n 's/^PUBLISHABLE_KEY="\(.*\)"$/\1/p')"
fi

write_env() {
  local file="$1" prefix="$2"
  if [ -f "$file" ]; then
    echo "==> $file exists, leaving it alone"
    return
  fi
  echo "==> Writing $file"
  {
    echo "${prefix}_SUPABASE_URL=${api_url}"
    echo "${prefix}_SUPABASE_ANON_KEY=${anon_key}"
    if [ "$prefix" = "NEXT_PUBLIC" ]; then echo "NEXT_PUBLIC_APP_URL=http://localhost:3000"; fi
    echo "${prefix}_SENTRY_DSN="
  } > "$file"
}
write_env apps/admin/.env.local NEXT_PUBLIC
write_env apps/mobile/.env.local EXPO_PUBLIC

echo "==> Generating database types"
pnpm gen:types

cleanup() {
  echo
  echo "==> Stopping dev servers"
  trap - EXIT INT TERM
  jobs -p | xargs -r kill 2>/dev/null || true
  wait 2>/dev/null || true
  if [ -z "${KEEP_SUPABASE:-}" ]; then
    echo "==> Stopping local Supabase"
    pnpm supabase stop --no-backup
  fi
}
trap cleanup EXIT INT TERM

echo "==> Admin app on http://localhost:3000, Mobile web on http://localhost:8081"
pnpm --filter @jnj/admin dev --port 3000 &
pnpm --filter @jnj/mobile exec expo start --web --port 8081 &
wait
