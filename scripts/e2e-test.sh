#!/usr/bin/env bash
# e2e-test.sh — smoke-tests the running stack via the HTTP API.
# Usage:
#   ./scripts/e2e-test.sh              # defaults to localhost:4000
#   API_BASE=http://localhost:4000 ./scripts/e2e-test.sh

set -euo pipefail

API_BASE="${API_BASE:-http://localhost:4000}"
PASS=0
FAIL=0
SKIP=0

# ── helpers ──────────────────────────────────────────────────────────────────

green()  { printf '\033[32m%s\033[0m\n' "$*"; }
red()    { printf '\033[31m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
bold()   { printf '\033[1m%s\033[0m\n'  "$*"; }

check() {
  local name="$1"; local cmd="$2"; local expect="$3"
  local out
  out=$(eval "$cmd" 2>&1) || true
  if echo "$out" | grep -qE "$expect"; then
    green "  PASS  $name"
    PASS=$((PASS + 1))
  else
    red   "  FAIL  $name"
    red   "        expected to find: $expect"
    red   "        got: $(echo "$out" | head -2)"
    FAIL=$((FAIL + 1))
  fi
}

http_status() {
  curl -s -o /dev/null -w "%{http_code}" "$@"
}

json_field() {
  # Minimal jq-free JSON field extractor
  python3 -c "import sys,json; d=json.load(sys.stdin); print(d$1)" 2>/dev/null || echo "PARSE_ERROR"
}

# ── suite ────────────────────────────────────────────────────────────────────

bold "═══════════════════════════════════════════"
bold "  Specter — E2E Test Suite"
bold "  API: $API_BASE"
bold "═══════════════════════════════════════════"
echo ""

# ── 1. Health ────────────────────────────────────────────────────────────────
bold "[ 1 ] Health & system"

check "GET /api/health returns 200" \
  "http_status '$API_BASE/api/health'" \
  "200"

check "GET /api/health body ok=true" \
  "curl -s '$API_BASE/api/health'" \
  '"ok":true'

check "GET /api/health does NOT expose database credentials" \
  "curl -s '$API_BASE/api/health'" \
  '"dbReady"'   # just has dbReady, no databaseUrl

HEALTH_RESP=$(curl -s "$API_BASE/api/health")
if echo "$HEALTH_RESP" | grep -q '"databaseUrl"'; then
  red "  FAIL  health endpoint must not expose databaseUrl"
  FAIL=$((FAIL + 1))
else
  green "  PASS  health endpoint does not expose databaseUrl"
  PASS=$((PASS + 1))
fi

check "GET /api/models returns 200" \
  "http_status '$API_BASE/api/models'" \
  "200"

echo ""

# ── 2. Settings ──────────────────────────────────────────────────────────────
bold "[ 2 ] Settings"

check "GET /api/settings returns ollamaModel" \
  "curl -s '$API_BASE/api/settings'" \
  "ollamaModel"

check "GET /api/settings does NOT expose databaseUrl" \
  "! curl -s '$API_BASE/api/settings' | grep -q databaseUrl && echo SAFE" \
  "SAFE"

ORIGINAL_SETTINGS=$(curl -s "$API_BASE/api/settings")
ORIGINAL_URL=$(echo "$ORIGINAL_SETTINGS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['ollamaBaseUrl'])" 2>/dev/null)
ORIGINAL_MODEL=$(echo "$ORIGINAL_SETTINGS" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['ollamaModel'])" 2>/dev/null)

check "PUT /api/settings accepts valid payload" \
  "http_status -X PUT '$API_BASE/api/settings' \
    -H 'Content-Type: application/json' \
    -d '{\"ollamaBaseUrl\":\"$ORIGINAL_URL\",\"ollamaModel\":\"$ORIGINAL_MODEL\"}'" \
  "200"

check "PUT /api/settings rejects empty ollamaModel" \
  "http_status -X PUT '$API_BASE/api/settings' \
    -H 'Content-Type: application/json' \
    -d '{\"ollamaBaseUrl\":\"http://localhost:11434\",\"ollamaModel\":\"\"}'" \
  "400"

echo ""

# ── 3. Projects ──────────────────────────────────────────────────────────────
bold "[ 3 ] Projects CRUD"

check "GET /api/projects returns array" \
  "curl -s '$API_BASE/api/projects'" \
  '\[|"id"'

# Create a test project
CREATE_RESP=$(curl -s -X POST "$API_BASE/api/projects" \
  -H 'Content-Type: application/json' \
  -d '{
    "name": "E2E Test Project",
    "depth": "basic",
    "vision": "Automated test project — safe to delete",
    "answers": {"project_name": "E2E Test Project", "depth": "basic"}
  }')
PROJECT_ID=$(echo "$CREATE_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['id'])" 2>/dev/null)

if [ -n "$PROJECT_ID" ] && [ "$PROJECT_ID" != "PARSE_ERROR" ]; then
  green "  PASS  POST /api/projects created id=$PROJECT_ID"
  PASS=$((PASS + 1))
else
  red "  FAIL  POST /api/projects — no id in response"
  red "        response: $(echo "$CREATE_RESP" | head -1)"
  FAIL=$((FAIL + 1))
  PROJECT_ID=""
fi

if [ -n "$PROJECT_ID" ]; then
  check "GET /api/projects/:id returns project" \
    "curl -s '$API_BASE/api/projects/$PROJECT_ID'" \
    '"E2E Test Project"'

  check "PUT /api/projects/:id updates name" \
    "http_status -X PUT '$API_BASE/api/projects/$PROJECT_ID' \
      -H 'Content-Type: application/json' \
      -d '{\"name\":\"E2E Test Project (updated)\",\"depth\":\"basic\",\"vision\":\"updated\",\"answers\":{}}'" \
    "200"

  check "GET /api/projects/:id/docs returns doc list" \
    "curl -s '$API_BASE/api/projects/$PROJECT_ID/docs'" \
    '"docKey"'
fi

echo ""

# ── 4. Conversations ─────────────────────────────────────────────────────────
bold "[ 4 ] Conversations"

if [ -n "$PROJECT_ID" ]; then
  check "GET /api/projects/:id/conversations returns array" \
    "curl -s '$API_BASE/api/projects/$PROJECT_ID/conversations'" \
    '\[|"id"|"role"'
fi

echo ""

# ── 5. Spec Sessions ─────────────────────────────────────────────────────────
bold "[ 5 ] Spec Sessions"

if [ -n "$PROJECT_ID" ]; then
  check "GET /api/projects/:id/spec/sessions returns array" \
    "curl -s '$API_BASE/api/projects/$PROJECT_ID/spec/sessions'" \
    '\[|"id"|"sessions"'

  # Create a spec session
  SESSION_RESP=$(curl -s -X POST "$API_BASE/api/projects/$PROJECT_ID/spec/sessions" \
    -H 'Content-Type: application/json' \
    -d '{"name": "E2E Test Session"}')
  SESSION_ID=$(echo "$SESSION_RESP" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['id'])" 2>/dev/null)

  if [ -n "$SESSION_ID" ] && [ "$SESSION_ID" != "PARSE_ERROR" ]; then
    green "  PASS  POST spec/sessions created id=$SESSION_ID"
    PASS=$((PASS + 1))
  else
    red "  FAIL  POST spec/sessions — no id in response"
    red "        response: $(echo "$SESSION_RESP" | head -1)"
    FAIL=$((FAIL + 1))
    SESSION_ID=""
  fi

  if [ -n "$SESSION_ID" ]; then
    check "GET spec/sessions/:id returns session with messages" \
      "curl -s '$API_BASE/api/projects/$PROJECT_ID/spec/sessions/$SESSION_ID'" \
      '"id"'

    check "PATCH spec/sessions/:id renames session" \
      "http_status -X PATCH '$API_BASE/api/projects/$PROJECT_ID/spec/sessions/$SESSION_ID' \
        -H 'Content-Type: application/json' \
        -d '{\"name\":\"Renamed Session\"}'" \
      "200"

    check "POST spec/sessions/:id/duplicate creates copy" \
      "curl -s -X POST '$API_BASE/api/projects/$PROJECT_ID/spec/sessions/$SESSION_ID/duplicate' | grep -o '\"id\"' | head -1" \
      '"id"'

    check "DELETE spec/sessions/:id removes session" \
      "http_status -X DELETE '$API_BASE/api/projects/$PROJECT_ID/spec/sessions/$SESSION_ID'" \
      "20"
  fi
fi

echo ""

# ── 6. Spec Versions ─────────────────────────────────────────────────────────
bold "[ 6 ] Spec Versions"

if [ -n "$PROJECT_ID" ]; then
  check "GET spec/versions returns array" \
    "curl -s '$API_BASE/api/projects/$PROJECT_ID/spec/versions'" \
    '\[|"id"|"versions"'
fi

echo ""

# ── 7. Cleanup ───────────────────────────────────────────────────────────────
bold "[ 7 ] Cleanup"

if [ -n "$PROJECT_ID" ]; then
  check "DELETE /api/projects/:id removes test project" \
    "http_status -X DELETE '$API_BASE/api/projects/$PROJECT_ID'" \
    "200|204"
fi

echo ""

# ── Summary ──────────────────────────────────────────────────────────────────
bold "═══════════════════════════════════════════"
TOTAL=$((PASS + FAIL + SKIP))
if [ "$FAIL" -eq 0 ]; then
  green "  ALL TESTS PASSED  $PASS/$TOTAL"
else
  red   "  FAILED: $FAIL/$TOTAL  (passed: $PASS, skipped: $SKIP)"
fi
bold "═══════════════════════════════════════════"

exit "$FAIL"
