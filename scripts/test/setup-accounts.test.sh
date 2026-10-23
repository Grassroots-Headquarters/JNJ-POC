#!/usr/bin/env bash
#
# Tests for scripts/setup-accounts.sh without bats. Run: bash scripts/test/setup-accounts.test.sh
#
# Seams under test:
#   - the wizard library (everything above the STAGES marker), sourced on its own:
#     write_env upserts, keeps secrets off the screen, and ask() reads them back;
#   - the whole script as a program: it parses, TOTAL_STAGES matches the stage()
#     calls, the GitHub secret/variable names match the delivery contracts, and
#     with no human on stdin it renders the banner and stage 1 then stops.

set -uo pipefail

HERE=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
SCRIPT="$HERE/../setup-accounts.sh"
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

PASS=0; FAIL=0
ok()   { PASS=$((PASS + 1)); printf 'ok   %s\n' "$1"; }
fail() { FAIL=$((FAIL + 1)); printf 'FAIL %s\n     %s\n' "$1" "${2:-}"; }
check() { # check "name" <condition...>
  local name="$1"; shift
  if "$@"; then ok "$name"; else fail "$name" "$*"; fi
}

[[ -f "$SCRIPT" ]] || { fail "script exists" "$SCRIPT missing"; printf '\n%d passed, %d failed\n' "$PASS" "$FAIL"; exit 1; }

# ── The script parses ───────────────────────────────────────────────────────
if bash -n "$SCRIPT" 2>"$TMP/syntax"; then ok "bash -n"; else fail "bash -n" "$(cat "$TMP/syntax")"; fi

# ── Library seam: source only what's above the STAGES marker ────────────────
sed '/^# STAGES: author this section/,$d' "$SCRIPT" > "$TMP/lib.sh"
check "library extracted" grep -q '^write_env()' "$TMP/lib.sh"

lib_test() { # lib_test "name" 'bash snippet run with the library loaded'
  local name="$1" snippet="$2" out
  out=$(cd "$TMP" && ENV_FILE="$TMP/env" bash -c "set -euo pipefail; source '$TMP/lib.sh'; $snippet" 2>&1)
  local rc=$?
  if (( rc == 0 )); then ok "$name"; else fail "$name" "$out"; fi
}

rm -f "$TMP/env"
lib_test "write_env creates the file at mode 600 with KEY='VALUE'" '
  write_env FIRST "one" >/dev/null
  [[ "$(stat -c %a "$ENV_FILE")" == 600 ]]
  [[ "$(cat "$ENV_FILE")" == "FIRST='"'"'one'"'"'" ]]
  [[ "$FIRST" == one ]]'

lib_test "write_env upserts: the second write replaces the first and leaves other keys alone" '
  write_env OTHER "keep me" >/dev/null
  write_env FIRST "two" >/dev/null
  [[ "$(grep -c "^FIRST=" "$ENV_FILE")" == 1 ]]
  [[ "$(grep "^FIRST=" "$ENV_FILE")" == "FIRST='"'"'two'"'"'" ]]
  [[ "$(grep -c "^OTHER=" "$ENV_FILE")" == 1 ]]'

lib_test "write_env never prints the value" '
  out=$(write_env API_KEY "sk_live_hunter2")
  [[ "$out" != *hunter2* ]]
  [[ "$out" == *"API_KEY"* ]]'

lib_test "ask offers the stored value back on a re-run, even one with a single quote" '
  write_env QUOTED "it'"'"'s a value" >/dev/null
  unset QUOTED
  ask QUOTED "Prompt:" <<< "" >/dev/null
  [[ "$QUOTED" == "it'"'"'s a value" ]]'

lib_test "ask_secret keeps the stored value on Enter and fails at EOF with nothing stored" '
  write_env TOKEN "shh" >/dev/null
  unset TOKEN
  ask_secret TOKEN "Token:" <<< "" >/dev/null
  [[ "$TOKEN" == shh ]]
  if ask_secret MISSING "Missing:" </dev/null >/dev/null; then exit 1; fi'

# ── Whole-script seam ───────────────────────────────────────────────────────
declared=$(grep -E '^[[:space:]]*TOTAL_STAGES=[0-9]+' "$SCRIPT" | tail -n1 | sed -E 's/.*=([0-9]+).*/\1/')
actual=$(grep -cE '^[[:space:]]*stage "' "$SCRIPT")
if [[ "$declared" == "$actual" && "$actual" -gt 0 ]]; then ok "TOTAL_STAGES ($declared) equals the number of stage calls ($actual)"
else fail "TOTAL_STAGES equals the number of stage calls" "declared=$declared actual=$actual"; fi

# Names from contracts.md "Delivery pipeline names"; #26's workflows read these.
expected_secrets="EXPO_TOKEN
SENTRY_AUTH_TOKEN
SUPABASE_ACCESS_TOKEN
SUPABASE_PRODUCTION_DB_PASSWORD
SUPABASE_PRODUCTION_PROJECT_REF
SUPABASE_STAGING_DB_PASSWORD
SUPABASE_STAGING_PROJECT_REF"
expected_vars="SENTRY_ORG
SENTRY_PROJECT_ADMIN
SENTRY_PROJECT_EDGE
SENTRY_PROJECT_MOBILE
SENTRY_URL"
found_secrets=$(grep -oE '^[[:space:]]*set_secret [A-Z_]+' "$SCRIPT" | awk '{print $2}' | sort -u)
found_vars=$(grep -oE '^[[:space:]]*set_var [A-Z_]+' "$SCRIPT" | awk '{print $2}' | sort -u)
if [[ "$found_secrets" == "$expected_secrets" ]]; then ok "set_secret names match the delivery contracts"
else fail "set_secret names match the delivery contracts" "found: $(echo "$found_secrets" | tr '\n' ' ')"; fi
if [[ "$found_vars" == "$expected_vars" ]]; then ok "set_var names match the delivery contracts"
else fail "set_var names match the delivery contracts" "found: $(echo "$found_vars" | tr '\n' ' ')"; fi

check "the wizard writes to .env.accounts, not .env" grep -q 'ENV_FILE=.*\.env\.accounts' "$SCRIPT"
check "no secret value is echoed anywhere in the script" \
  bash -c "! grep -nE 'echo .*(\\\$SUPABASE_ACCESS_TOKEN|\\\$STRIPE_SECRET_KEY|\\\$TWILIO_AUTH_TOKEN|\\\$SENTRY_AUTH_TOKEN|\\\$EXPO_TOKEN|_DB_PASSWORD)' '$SCRIPT'"

# With no human on stdin and a stub gh that is not logged in, the wizard must
# show the banner and stage 1, then stop without writing anything.
mkdir -p "$TMP/bin"
printf '#!/usr/bin/env bash\nexit 1\n' > "$TMP/bin/gh"; chmod +x "$TMP/bin/gh"
rm -f "$TMP/env"
smoke=$(cd "$TMP" && PATH="$TMP/bin:$PATH" ACCOUNTS_ENV_FILE="$TMP/env" bash "$SCRIPT" </dev/null 2>&1)
smoke_rc=$?
check "headless run exits non-zero instead of hanging" test "$smoke_rc" -ne 0
check "headless run renders the banner" bash -c "grep -q 'stages' <<< \"\$1\"" _ "$smoke"
check "headless run renders stage 1" bash -c "grep -q 'Stage 1/' <<< \"\$1\"" _ "$smoke"
check "headless run writes nothing" test ! -e "$TMP/env"

printf '\n%d passed, %d failed\n' "$PASS" "$FAIL"
(( FAIL == 0 ))
