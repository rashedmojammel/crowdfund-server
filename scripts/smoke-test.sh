#!/usr/bin/env bash
# Manual smoke test for the crowdfund-server API (localhost:4000).
#
# Usage:
#   SUPPORTER=<jwt> CREATOR=<jwt> ADMIN=<jwt> bash scripts/smoke-test.sh
#
# Requires: curl, jq. Does not delete anything it creates — inspect the
# printed IDs in the DB afterwards.
set -uo pipefail

BASE_URL="${BASE_URL:-http://localhost:4000}"

: "${SUPPORTER:?Set SUPPORTER to a supporter-role JWT}"
: "${CREATOR:?Set CREATOR to a creator-role JWT}"
: "${ADMIN:?Set ADMIN to an admin-role JWT}"

command -v jq >/dev/null 2>&1 || { echo "jq is required (https://jqlang.github.io/jq/)"; exit 1; }

GREEN=$'\033[0;32m'; RED=$'\033[0;31m'; YELLOW=$'\033[1;33m'; BLUE=$'\033[0;34m'; NC=$'\033[0m'

PASS=0
FAIL=0

section() { echo; echo "${BLUE}== $1 ==${NC}"; }
note() { echo "  ${YELLOW}$1${NC}"; }
is_number() { [[ "$1" =~ ^-?[0-9]+$ ]]; }

# http METHOD PATH [TOKEN] [BODY] — sets HTTP_STATUS / HTTP_BODY.
http() {
  local method="$1" path="$2" token="${3:-}" body="${4:-}"
  local args=(-s -X "$method" "${BASE_URL}${path}" -H "Content-Type: application/json")
  [ -n "$token" ] && args+=(-H "Authorization: Bearer $token")
  [ -n "$body" ] && args+=(-d "$body")
  local raw
  raw=$(curl "${args[@]}" -w $'\n%{http_code}')
  HTTP_STATUS="${raw##*$'\n'}"
  HTTP_BODY="${raw%$'\n'*}"
}

jval() { echo "$1" | jq -r "$2" 2>/dev/null; }

assert_eq() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "${GREEN}PASS${NC}  $desc (got: $actual)"
    PASS=$((PASS + 1))
  else
    echo "${RED}FAIL${NC}  $desc (expected: $expected, got: $actual)"
    [ -n "${HTTP_BODY:-}" ] && echo "        body: $HTTP_BODY"
    FAIL=$((FAIL + 1))
  fi
}

# assert_status DESC METHOD PATH TOKEN BODY EXPECTED_STATUS
assert_status() {
  local desc="$1" method="$2" path="$3" token="$4" body="$5" expected="$6"
  http "$method" "$path" "$token" "$body"
  assert_eq "$desc" "$expected" "$HTTP_STATUS"
}

# assert_keys DESC JSON KEY...
assert_keys() {
  local desc="$1" json="$2"
  shift 2
  local missing=()
  for k in "$@"; do
    echo "$json" | jq -e --arg k "$k" 'has($k)' >/dev/null 2>&1 || missing+=("$k")
  done
  if [ ${#missing[@]} -eq 0 ]; then
    echo "${GREEN}PASS${NC}  $desc"
    PASS=$((PASS + 1))
  else
    echo "${RED}FAIL${NC}  $desc (missing: ${missing[*]})"
    echo "        body: $json"
    FAIL=$((FAIL + 1))
  fi
}

# ---------------------------------------------------------------------------
section "0. Preflight"
# ---------------------------------------------------------------------------

if ! curl -s -o /dev/null "$BASE_URL/api/health"; then
  echo "${RED}Cannot reach $BASE_URL — is the server running (npm run dev)?${NC}"
  exit 1
fi
http GET "/api/health" "" ""
assert_eq "GET /api/health: server reachable, DB connected" 200 "$HTTP_STATUS"
assert_keys "GET /api/health response shape" "$HTTP_BODY" ok db

# ---------------------------------------------------------------------------
section "1. Auth matrix — 401 (no token) / 403 (wrong role) / 200 (correct role)"
# ---------------------------------------------------------------------------

assert_status "campaigns/mine: no token"                GET "/api/campaigns/mine" ""          "" 401
assert_status "campaigns/mine: wrong role (supporter)"  GET "/api/campaigns/mine" "$SUPPORTER" "" 403
assert_status "campaigns/mine: correct role (creator)"  GET "/api/campaigns/mine" "$CREATOR"   "" 200

assert_status "users: no token"                GET "/api/users" ""         "" 401
assert_status "users: wrong role (creator)"    GET "/api/users" "$CREATOR" "" 403
assert_status "users: correct role (admin)"    GET "/api/users" "$ADMIN"   "" 200

assert_status "stats/supporter: no token"                    GET "/api/stats/supporter" ""          "" 401
assert_status "stats/supporter: wrong role (creator)"        GET "/api/stats/supporter" "$CREATOR"  "" 403
assert_status "stats/supporter: correct role (supporter)"    GET "/api/stats/supporter" "$SUPPORTER" "" 200

assert_status "stats/creator: no token"                GET "/api/stats/creator" ""        "" 401
assert_status "stats/creator: wrong role (admin)"      GET "/api/stats/creator" "$ADMIN"   "" 403
assert_status "stats/creator: correct role (creator)"  GET "/api/stats/creator" "$CREATOR" "" 200

assert_status "stats/platform: no token"               GET "/api/stats/platform" ""        "" 401
assert_status "stats/platform: wrong role (creator)"   GET "/api/stats/platform" "$CREATOR" "" 403
assert_status "stats/platform: correct role (admin)"   GET "/api/stats/platform" "$ADMIN"   "" 200

assert_status "withdrawals (admin queue): no token"               GET "/api/withdrawals" ""          "" 401
assert_status "withdrawals (admin queue): wrong role (supporter)" GET "/api/withdrawals" "$SUPPORTER" "" 403
assert_status "withdrawals (admin queue): correct role (admin)"   GET "/api/withdrawals" "$ADMIN"    "" 200

# POST endpoints that create data: 401/403 only here. Success (200/201) is
# exercised in section 4, so real data isn't created twice.
assert_status "POST campaigns: no token"               POST "/api/campaigns" ""          "{}" 401
assert_status "POST campaigns: wrong role (supporter)" POST "/api/campaigns" "$SUPPORTER" "{}" 403

assert_status "POST contributions: no token"             POST "/api/contributions" ""        "{}" 401
assert_status "POST contributions: wrong role (creator)" POST "/api/contributions" "$CREATOR" "{}" 403

assert_status "POST withdrawals: no token"               POST "/api/withdrawals" ""          "{}" 401
assert_status "POST withdrawals: wrong role (supporter)" POST "/api/withdrawals" "$SUPPORTER" "{}" 403

# Never send a body matching a real CREDIT_PACKAGES entry here — that would
# call live Stripe. Auth failures short-circuit before Stripe either way.
assert_status "POST payments: no token"               POST "/api/payments" ""          "{}" 401
assert_status "POST payments: wrong role (creator)"   POST "/api/payments" "$CREATOR"   "{}" 403

assert_status "POST reports: no token"               POST "/api/reports" ""        "{}" 401
assert_status "POST reports: wrong role (creator)"   POST "/api/reports" "$CREATOR" "{}" 403

# Bogus-but-well-formed ObjectId so we never touch a real account.
DUMMY_ID="000000000000000000000000"
assert_status "PATCH users/:id/role: no token"             PATCH "/api/users/$DUMMY_ID/role" ""          '{"role":"creator"}' 401
assert_status "PATCH users/:id/role: wrong role (supporter)" PATCH "/api/users/$DUMMY_ID/role" "$SUPPORTER" '{"role":"creator"}' 403

# ---------------------------------------------------------------------------
section "2. Validation — malformed bodies must 400, never 500"
# ---------------------------------------------------------------------------

PAD60=$(printf 'x%.0s' $(seq 1 60))

assert_status "POST campaigns: missing required fields" \
  POST "/api/campaigns" "$CREATOR" '{"title":"short"}' 400
assert_status "POST campaigns: wrong type (fundingGoal as string) + extra field" \
  POST "/api/campaigns" "$CREATOR" \
  "{\"title\":\"Valid Enough Title\",\"story\":\"$PAD60\",\"category\":\"technology\",\"coverImage\":\"https://example.com/x.jpg\",\"fundingGoal\":\"10000\",\"minimumContribution\":10,\"deadline\":\"2030-01-01T00:00:00.000Z\",\"reward\":\"A nice reward for backers\",\"extraField\":true}" 400
assert_status "POST campaigns: deadline in the past" \
  POST "/api/campaigns" "$CREATOR" \
  "{\"title\":\"Valid Enough Title\",\"story\":\"$PAD60\",\"category\":\"technology\",\"coverImage\":\"https://example.com/x.jpg\",\"fundingGoal\":10000,\"minimumContribution\":10,\"deadline\":\"2020-01-01T00:00:00.000Z\",\"reward\":\"A nice reward for backers\"}" 400

assert_status "GET contributions: missing ?mine / ?forCreator" \
  GET "/api/contributions" "$SUPPORTER" "" 400
assert_status "POST contributions: invalid campaignId format" \
  POST "/api/contributions" "$SUPPORTER" '{"campaignId":"not-an-id","amount":50}' 400
assert_status "POST contributions: non-positive amount" \
  POST "/api/contributions" "$SUPPORTER" "{\"campaignId\":\"$DUMMY_ID\",\"amount\":0}" 400
assert_status "POST contributions: extra field rejected (strict schema)" \
  POST "/api/contributions" "$SUPPORTER" "{\"campaignId\":\"$DUMMY_ID\",\"amount\":50,\"supporterEmail\":\"x@y.com\"}" 400

assert_status "POST withdrawals: below 200-credit minimum" \
  POST "/api/withdrawals" "$CREATOR" '{"credits":100,"paymentSystem":"bkash","accountNumber":"01712345678"}' 400
assert_status "POST withdrawals: invalid paymentSystem enum" \
  POST "/api/withdrawals" "$CREATOR" '{"credits":200,"paymentSystem":"paypal","accountNumber":"01712345678"}' 400

assert_status "POST payments: credits/amountUsd don't match a package" \
  POST "/api/payments" "$SUPPORTER" '{"credits":150,"amountUsd":15}' 400
assert_status "POST payments: wrong type (credits as string)" \
  POST "/api/payments" "$SUPPORTER" '{"credits":"100","amountUsd":10}' 400

assert_status "POST reports: reason under 10 chars" \
  POST "/api/reports" "$SUPPORTER" "{\"campaignId\":\"$DUMMY_ID\",\"reason\":\"short\"}" 400
assert_status "POST reports: invalid campaignId format" \
  POST "/api/reports" "$SUPPORTER" '{"campaignId":"nope","reason":"This is a sufficiently long reason text"}' 400

assert_status "PATCH users/:id/role: invalid role enum" \
  PATCH "/api/users/$DUMMY_ID/role" "$ADMIN" '{"role":"superadmin"}' 400

# ---------------------------------------------------------------------------
section "3. Response shapes"
# ---------------------------------------------------------------------------

http GET "/api/campaigns" "" ""
assert_keys "GET /api/campaigns (public list)" "$HTTP_BODY" campaigns total page limit

http GET "/api/contributions?mine=true" "$SUPPORTER" ""
assert_keys "GET /api/contributions?mine=true" "$HTTP_BODY" items total page limit

http GET "/api/contributions?forCreator=true" "$CREATOR" ""
assert_keys "GET /api/contributions?forCreator=true" "$HTTP_BODY" items total page limit

http GET "/api/payments" "$SUPPORTER" ""
assert_keys "GET /api/payments" "$HTTP_BODY" items total page limit

http GET "/api/users" "$ADMIN" ""
assert_keys "GET /api/users" "$HTTP_BODY" items total page limit

http GET "/api/withdrawals?mine=true" "$CREATOR" ""
assert_keys "GET /api/withdrawals?mine=true" "$HTTP_BODY" items total page limit

http GET "/api/users/me" "$SUPPORTER" ""
assert_keys "GET /api/users/me (named key)" "$HTTP_BODY" user

http GET "/api/stats/supporter" "$SUPPORTER" ""
assert_keys "GET /api/stats/supporter (named key)" "$HTTP_BODY" stats

http GET "/api/notifications/unread-count" "$SUPPORTER" ""
assert_keys "GET /api/notifications/unread-count (named key)" "$HTTP_BODY" count

# ---------------------------------------------------------------------------
section "4. Campaign lifecycle (create -> approve -> report)"
# ---------------------------------------------------------------------------

DEADLINE=$(date -u -d "+30 days" +"%Y-%m-%dT%H:%M:%S.000Z" 2>/dev/null \
  || date -u -v+30d +"%Y-%m-%dT%H:%M:%S.000Z")
CAMPAIGN_BODY=$(cat <<JSON
{"title":"Smoke Test Campaign $(date +%s)","story":"This is a smoke-test campaign created by scripts/smoke-test.sh to exercise the create, approve, contribute and review lifecycle end to end. Safe to ignore.","category":"technology","coverImage":"https://example.com/smoke-test.jpg","fundingGoal":100000,"minimumContribution":5,"deadline":"$DEADLINE","reward":"A heartfelt thank-you note and project updates for backers."}
JSON
)

http POST "/api/campaigns" "$CREATOR" "$CAMPAIGN_BODY"
assert_eq "POST /api/campaigns: creator can create (success case for auth matrix)" 201 "$HTTP_STATUS"
assert_keys "POST /api/campaigns response shape" "$HTTP_BODY" campaign
CAMPAIGN_ID=$(jval "$HTTP_BODY" '.campaign._id')
note "campaign id: $CAMPAIGN_ID"

if [ "$CAMPAIGN_ID" = "null" ] || [ -z "$CAMPAIGN_ID" ]; then
  echo "${RED}FAIL${NC}  could not create test campaign — skipping lifecycle, credit round-trip and idempotency tests"
  FAIL=$((FAIL + 1))
else
  http PATCH "/api/campaigns/$CAMPAIGN_ID/approve" "$ADMIN" ""
  assert_eq "PATCH .../approve: admin can approve (success case for auth matrix)" 200 "$HTTP_STATUS"
  assert_eq "approve: changed=true on first approval" "true" "$(jval "$HTTP_BODY" '.changed')"

  http PATCH "/api/campaigns/$CAMPAIGN_ID/approve" "$ADMIN" ""
  assert_eq "approve replay: still 200" 200 "$HTTP_STATUS"
  assert_eq "approve replay: changed=false (idempotent, same-status no-op)" "false" "$(jval "$HTTP_BODY" '.changed')"

  http POST "/api/reports" "$SUPPORTER" "{\"campaignId\":\"$CAMPAIGN_ID\",\"reason\":\"Smoke test report from scripts/smoke-test.sh - please ignore\"}"
  assert_eq "POST /api/reports: supporter can report (success case for auth matrix)" 201 "$HTTP_STATUS"
  assert_keys "POST /api/reports response shape" "$HTTP_BODY" report
  REPORT_ID=$(jval "$HTTP_BODY" '.report._id')
  note "report id: $REPORT_ID"

  # -------------------------------------------------------------------------
  section "5. Credit round-trip (contribute -> reject)"
  # -------------------------------------------------------------------------

  http GET "/api/users/me" "$SUPPORTER" ""
  CREDITS_BEFORE=$(jval "$HTTP_BODY" '.user.credits')
  note "supporter credits before: $CREDITS_BEFORE"

  CONTRIB_AMOUNT=10
  if ! is_number "$CREDITS_BEFORE"; then
    echo "${RED}FAIL${NC}  could not read supporter credits via GET /api/users/me — skipping credit round-trip and idempotency tests"
    FAIL=$((FAIL + 1))
  elif [ "$CREDITS_BEFORE" -lt "$CONTRIB_AMOUNT" ]; then
    note "WARN supporter has fewer than $CONTRIB_AMOUNT credits — skipping credit round-trip and idempotency tests"
  else
    http POST "/api/contributions" "$SUPPORTER" "{\"campaignId\":\"$CAMPAIGN_ID\",\"amount\":$CONTRIB_AMOUNT}"
    assert_eq "POST /api/contributions: supporter can contribute (success case for auth matrix)" 201 "$HTTP_STATUS"
    CONTRIB_ID_1=$(jval "$HTTP_BODY" '.contribution._id')
    note "contribution id (to be rejected): $CONTRIB_ID_1"

    http GET "/api/users/me" "$SUPPORTER" ""
    CREDITS_AFTER_CONTRIB=$(jval "$HTTP_BODY" '.user.credits')
    note "supporter credits after contribute: $CREDITS_AFTER_CONTRIB"
    assert_eq "credits dropped by exactly $CONTRIB_AMOUNT after contribute" \
      "$((CREDITS_BEFORE - CONTRIB_AMOUNT))" "$CREDITS_AFTER_CONTRIB"

    http PATCH "/api/contributions/$CONTRIB_ID_1/reject" "$CREATOR" ""
    assert_eq "PATCH .../reject: creator can reject own campaign's contribution" 200 "$HTTP_STATUS"

    http GET "/api/users/me" "$SUPPORTER" ""
    CREDITS_AFTER_REJECT=$(jval "$HTTP_BODY" '.user.credits')
    note "supporter credits after reject: $CREDITS_AFTER_REJECT"
    assert_eq "credits restored to exactly the pre-contribution balance after reject" \
      "$CREDITS_BEFORE" "$CREDITS_AFTER_REJECT"

    # -----------------------------------------------------------------------
    section "6. Idempotency (approve the same contribution twice)"
    # -----------------------------------------------------------------------

    http POST "/api/contributions" "$SUPPORTER" "{\"campaignId\":\"$CAMPAIGN_ID\",\"amount\":$CONTRIB_AMOUNT}"
    assert_eq "second contribution created for idempotency test" 201 "$HTTP_STATUS"
    CONTRIB_ID_2=$(jval "$HTTP_BODY" '.contribution._id')
    note "contribution id (to be approved twice): $CONTRIB_ID_2"

    http GET "/api/campaigns/$CAMPAIGN_ID" "$CREATOR" ""
    RAISED_BEFORE=$(jval "$HTTP_BODY" '.campaign.amountRaised')

    http PATCH "/api/contributions/$CONTRIB_ID_2/approve" "$CREATOR" ""
    assert_eq "first approve: 200" 200 "$HTTP_STATUS"
    assert_eq "first approve: changed=true" "true" "$(jval "$HTTP_BODY" '.changed')"

    http GET "/api/campaigns/$CAMPAIGN_ID" "$CREATOR" ""
    RAISED_AFTER_FIRST=$(jval "$HTTP_BODY" '.campaign.amountRaised')
    note "campaign.amountRaised: before=$RAISED_BEFORE after first approve=$RAISED_AFTER_FIRST"
    assert_eq "amountRaised increased by exactly $CONTRIB_AMOUNT on first approve" \
      "$((RAISED_BEFORE + CONTRIB_AMOUNT))" "$RAISED_AFTER_FIRST"

    http PATCH "/api/contributions/$CONTRIB_ID_2/approve" "$CREATOR" ""
    assert_eq "replayed approve: still 200" 200 "$HTTP_STATUS"
    assert_eq "replayed approve: changed=false (idempotent no-op)" "false" "$(jval "$HTTP_BODY" '.changed')"

    http GET "/api/campaigns/$CAMPAIGN_ID" "$CREATOR" ""
    RAISED_AFTER_REPLAY=$(jval "$HTTP_BODY" '.campaign.amountRaised')
    note "campaign.amountRaised after replayed approve: $RAISED_AFTER_REPLAY"
    assert_eq "amountRaised unchanged after replayed approve (only incremented once)" \
      "$RAISED_AFTER_FIRST" "$RAISED_AFTER_REPLAY"
  fi
fi

# ---------------------------------------------------------------------------
section "Summary"
# ---------------------------------------------------------------------------

TOTAL=$((PASS + FAIL))
echo "Total: $TOTAL   ${GREEN}Passed: $PASS${NC}   ${RED}Failed: $FAIL${NC}"
[ "$FAIL" -eq 0 ]
