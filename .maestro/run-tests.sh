#!/bin/bash
# =============================================================================
# Emberglow / unQuest — Maestro E2E test runner
# =============================================================================
# Usage:
#   .maestro/run-tests.sh [phase]
#
#   all         every phase, in chain order (default)
#   onboarding  01-onboarding/*        — fresh install through the first quest
#   signup      02-signup/*            — magic link + provisional -> full account
#   fresh       03-fresh-authenticated/* — second quest, tabs, profile numbers
#   coverage    04-screen-coverage/01..09 — every screen, still signed in
#   smoke       05-smoke/*             — fast critical-path check
#   social      04-screen-coverage/10-social-login.yaml — SIGNS THE DEVICE OUT
#
# The suite is ONE user's state chain: each phase inherits the previous phase's
# end state. Running a later phase on its own only works if an earlier run left
# the device in the right place.
#
# `all` ends with the `social` phase, so a full run finishes on the login screen
# with no session. That is deliberate — see note 7.
#
# -----------------------------------------------------------------------------
# WHY THIS SCRIPT LOOKS THE WAY IT DOES — read before changing any of it
# -----------------------------------------------------------------------------
#
# 1. THE TEST ADDRESS IS `@example.com`, NOT `@unquest.test`.
#    The server validates with `Joi.string().email()`
#    (unquest-server/src/validations/auth.validation.js:24), whose default TLD
#    check REJECTS the RFC 2606 reserved `.test` TLD with a 400. The old
#    `test-${TIMESTAMP}@unquest.test` meant the signup phase had never passed
#    on any branch. `example.com` is also RFC 2606 reserved — it can never
#    reach a real mailbox — and it validates.
#    THE PURGE REGEX BELOW MUST TRACK THIS ADDRESS. If they drift apart the
#    purge silently stops matching anything.
#
# 2. EVERY STORY-QUEST WAIT IS 135 SECONDS. Not 75, not 15.
#    The served template is `durationMinutes: 2`
#    (quest-template.controller.js:32/259), so QuestTimer fails the quest on any
#    unlock before 120s (quest-timer.ts:634/836), while the *recorded* run
#    window is only 60s (quest-run.controller.js:181 — a third, disagreeing copy
#    of the same dev-only knob, Linear SHE-28). Unlocking in the 60-120s gap
#    yields whichever signal lands first and reads as flakiness. 135s is the
#    only value that clears both clocks. Do not "optimise" it.
#
# 3. THE SIGNUP PHASE NEEDS NO SHELL HELP.
#    02-verify-authenticated.yaml is self-contained: it reads Mailpit itself via
#    `evalScript` + `http.get` filtered by recipient, and opens the deep link
#    with `openLink`. There is no poll-magic-link.sh call and no
#    `xcrun simctl openurl` step.
#    `.maestro/scripts/poll-magic-link.sh` still exists on disk and is invoked
#    by NOTHING — not this runner, not any flow (grep the repo). Linear SHE-55
#    asks to fix it or delete it. It is deliberately left alone here: the two
#    signup flows quote it at length as the worked example of the bug they were
#    written to avoid (it reads Mailpit's latest message without filtering by
#    recipient, so it can hand back another run's link), and deleting the file
#    would leave four comments in those flows naming something that no longer
#    exists. Editing flow files is out of this script's remit. Whoever closes
#    SHE-55 should delete the script and those four comment references in one
#    commit; until then, do not wire it back in.
#
# 4. PHASE 03 DOES NOT RUN IN FILENAME ORDER.
#    01-profile-verification.yaml runs LAST despite its `01-` prefix: its
#    `9 / 150 XP` assertion is only true once the second quest is complete
#    (after the onboarding quest alone it is `0 / 150 XP`). Verified on device
#    across units F/H/I. The file's own header says the same. Hence this script
#    drives an explicit ordered list, never a directory glob.
#
# 5. PHASES NEVER SHORT-CIRCUIT, AND TWO FLOWS ARE STILL MARKED UNREVIVED.
#    Every flow of phases 01-04 has now been rewritten and watched green on a
#    device, EXCEPT these two:
#      - 04-screen-coverage/05-settings.yaml — last touched in July 2026 on the
#        old branch. No unit re-ran it. Its first two steps are corroborated
#        second-hand (10-social-login.yaml taps `settings-tab` and asserts
#        `settings-screen` on a live device), its three text assertions are not.
#        It may well pass; it has simply never been proven to.
#      - 05-smoke/critical-paths.yaml — visibly stale (it asserts 'MaestroHero'
#        and taps a bare screen coordinate). Expected to fail.
#    They stay wired in — a hidden failure is worse than a red one — under
#    `add_stale`, which labels them in the output and counts their failure as
#    expected. Two properties keep them from taking a verified flow down:
#      (a) run-and-collect: a failing flow never stops the rest of its phase;
#      (b) no flow that follows an unrevived one may depend on where it stops.
#    (b) holds by inspection today. 05-settings.yaml sits in the middle of the
#    coverage order because 06-coop-ui.yaml is written to follow it, and a
#    05-settings failure can only strand the device on the settings tab —
#    06-coop-ui.yaml opens with an explicit `new-quest-tab` tap and recovers
#    from any tab. critical-paths.yaml has nothing after it but `social`, which
#    also opens with its own tab tap.
#    Once one link in a state chain breaks, later failures are usually cascades
#    rather than independent defects. The summary says so rather than pretending
#    each line is a separate bug.
#
# 6. THE COVERAGE ORDER IS FILE-NAME ORDER, AND THE FLOWS WERE WRITTEN FOR IT.
#    01 -> 02 -> 03 -> 04 -> 05 -> 06 -> 07 -> 08 -> 09. This list is the
#    authoritative order; several flows quote it in their own headers. The
#    couplings, all of them one-directional:
#      - 02-journal before 03-custom-quest. The custom quest adds a journal row
#        and +3 XP. Journal was deliberately written order-independent (no row
#        indexes, deep assertions on the two story quests only), so the other
#        order also works — but ONE order has to be the documented one, and this
#        is it. Same reason 01-profile-leaderboard-achievements runs first: its
#        header states the account has two completed quests at that point.
#      - 05-settings before 06-coop-ui. Settings ends on the PROFILE tab.
#        06-coop-ui taps its way back to home and says so in its header.
#      - 06-coop-ui before 07-invite and 08-guild. Both of those require an
#        entry tab that is NOT profile, and assert `profile-screen` absent as
#        their first command; 06-coop-ui ends on home.
#      - 08-guild before 09-scheduled. 09-scheduled deep-links immediately and
#        never normalises its tab, so it needs a predecessor that ends on home
#        with the Story deck card front. That is exactly 08-guild's stated exit
#        state. If 09 is ever run on its own, tap into home first.
#
# 7. 10-social-login.yaml IS NOT IN THE COVERAGE PHASE. IT IS THE `social`
#    PHASE, AND `all` RUNS IT LAST OF EVERYTHING.
#    That flow logs the account out on purpose and nothing puts it back; the
#    only way to a signed-in device afterwards is a fresh chain (onboarding,
#    the 135s wait, part 2, then the signup pair with a new address). File-name
#    order would have run it in the middle of the coverage tier and left every
#    later flow — and the whole smoke phase — running logged out.
#    Keeping it out of `coverage` rather than merely last inside it buys one
#    more thing: `pnpm e2e:coverage` can be re-run against the same account as
#    many times as you like.
#    So a full `pnpm e2e` ends signed out BY DESIGN. Re-running `pnpm e2e`
#    starts from onboarding with `clearState`, so that is a valid resting place.
#
# 8. THE PURGE ONLY RUNS FOR PHASES THAT CREATE A NEW USER.
#    See purge_stale_state() for the reasoning.
# =============================================================================

set -euo pipefail

# Run from the repo root regardless of the caller's cwd — every flow path below
# is repo-relative, and Maestro is invoked with those same relative paths.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$REPO_ROOT"

# -----------------------------------------------------------------------------
# Configuration (every value overridable from the environment)
# -----------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
DIM='\033[2m'
NC='\033[0m'

BUNDLE_ID="${BUNDLE_ID:-com.vaedros.unquest}"
BACKEND_URL="${BACKEND_URL:-http://localhost:3001}"
MAILPIT_URL="${MAILPIT_URL:-http://localhost:8025}"
# The real dev database. NOT `unquest-dev`: Mongo creates databases lazily, so a
# `ping` and a `deleteMany` against a misspelled name both succeed silently and
# the purge appears to work while never touching anything.
MONGODB_URI="${MONGODB_URI:-mongodb://127.0.0.1:27017/unquest}"

# See note 2 in the header. Both story-quest waits use this.
QUEST_WAIT_SECONDS="${QUEST_WAIT_SECONDS:-135}"

TIMESTAMP="$(date +%s)"
# See note 1. Deliberately NOT env-overridable: the TLD is the whole point, and
# `.test` (the previous value) is rejected by the server's Joi email validator.
TEST_EMAIL_DOMAIN="example.com"
TEST_EMAIL="test-${TIMESTAMP}@${TEST_EMAIL_DOMAIN}"
# Derived from the same domain so the two cannot drift apart — the drift is what
# made the old purge silently match nothing. The local part is still written
# twice, which preflight checks.
TEST_EMAIL_PURGE_REGEX="^test-[0-9]+@${TEST_EMAIL_DOMAIN//./\\.}$"

# -----------------------------------------------------------------------------
# Flow inventory — one constant per file so preflight can prove each one exists
# -----------------------------------------------------------------------------
FLOW_ONBOARDING_1=".maestro/flows/01-onboarding/onboarding-part-1.yaml"
FLOW_ONBOARDING_2=".maestro/flows/01-onboarding/onboarding-part-2.yaml"

FLOW_SIGNUP_REQUEST=".maestro/flows/02-signup/01-request-magic-link.yaml"
FLOW_SIGNUP_VERIFY=".maestro/flows/02-signup/02-verify-authenticated.yaml"

FLOW_QUEST2_PART_1=".maestro/flows/03-fresh-authenticated/02-quest-second-part-1.yaml"
FLOW_QUEST2_PART_2=".maestro/flows/03-fresh-authenticated/02-quest-second-part-2.yaml"
FLOW_NAV_TABS=".maestro/flows/03-fresh-authenticated/04-navigation-tabs.yaml"
FLOW_PROFILE=".maestro/flows/03-fresh-authenticated/01-profile-verification.yaml"
FLOW_STREAK=".maestro/flows/03-fresh-authenticated/03-streak-celebration.yaml"

FLOW_COVERAGE_PROFILE=".maestro/flows/04-screen-coverage/01-profile-leaderboard-achievements.yaml"
FLOW_COVERAGE_JOURNAL=".maestro/flows/04-screen-coverage/02-journal.yaml"
FLOW_COVERAGE_CUSTOM=".maestro/flows/04-screen-coverage/03-custom-quest.yaml"
FLOW_COVERAGE_MAP=".maestro/flows/04-screen-coverage/04-map.yaml"
FLOW_COVERAGE_SETTINGS=".maestro/flows/04-screen-coverage/05-settings.yaml"
FLOW_COVERAGE_COOP=".maestro/flows/04-screen-coverage/06-coop-ui.yaml"
FLOW_COVERAGE_INVITE=".maestro/flows/04-screen-coverage/07-invite.yaml"
FLOW_COVERAGE_GUILD=".maestro/flows/04-screen-coverage/08-guild.yaml"
FLOW_COVERAGE_SCHEDULED=".maestro/flows/04-screen-coverage/09-scheduled.yaml"

# Lives in 04-screen-coverage/ but is NOT part of the coverage phase — see
# note 7. Its own phase, run last by `all`.
FLOW_SOCIAL_LOGIN=".maestro/flows/04-screen-coverage/10-social-login.yaml"

FLOW_SMOKE_CRITICAL=".maestro/flows/05-smoke/critical-paths.yaml"

# -----------------------------------------------------------------------------
# Logging
# -----------------------------------------------------------------------------
log_info() { printf '%b%s%b\n' "$BLUE" "$1" "$NC"; }
log_ok()   { printf '%b✓%b %s\n' "$GREEN" "$NC" "$1"; }
log_warn() { printf '%b⚠️  %s%b\n' "$YELLOW" "$1" "$NC"; }
log_fail() { printf '%b❌ %s%b\n' "$RED" "$1" "$NC"; }
log_dim()  { printf '%b%s%b\n' "$DIM" "$1" "$NC"; }
rule()     { log_info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"; }

# -----------------------------------------------------------------------------
# Step table
#
# A phase is an ordered list of steps, built before anything runs so that
# preflight can validate it. Two kinds:
#   flow|<path>|<revived|unrevived>
#   wait|<seconds>|<label>
# bash 3.2 is the /bin/bash on macOS — plain indexed arrays only.
# -----------------------------------------------------------------------------
STEPS=()
RESULTS=()

add_flow()   { STEPS+=("flow|$1|revived"); }
add_stale()  { STEPS+=("flow|$1|unrevived"); }
add_wait()   { STEPS+=("wait|$1|$2"); }

build_steps() {
  local phase="$1"

  if [ "$phase" = "all" ] || [ "$phase" = "onboarding" ]; then
    add_flow "$FLOW_ONBOARDING_1"
    add_wait "$QUEST_WAIT_SECONDS" "the onboarding quest"
    add_flow "$FLOW_ONBOARDING_2"
  fi

  if [ "$phase" = "all" ] || [ "$phase" = "signup" ]; then
    # No shell step between these two — see note 3 in the header.
    add_flow "$FLOW_SIGNUP_REQUEST"
    add_flow "$FLOW_SIGNUP_VERIFY"
  fi

  if [ "$phase" = "all" ] || [ "$phase" = "fresh" ]; then
    # Verified order (units F/H/I on device) — NOT filename order. See note 4.
    add_flow "$FLOW_QUEST2_PART_1"
    add_wait "$QUEST_WAIT_SECONDS" "the second story quest"
    add_flow "$FLOW_QUEST2_PART_2"
    add_flow "$FLOW_NAV_TABS"
    add_flow "$FLOW_PROFILE"
    # Rewritten and green on device (unit G). It enters through the profile
    # tab and hands back to home, so it stays last in the phase.
    add_flow "$FLOW_STREAK"
  fi

  if [ "$phase" = "all" ] || [ "$phase" = "coverage" ]; then
    # File-name order, and the flows were written for it — see note 6 for the
    # four couplings. 10-social-login.yaml is NOT here; see note 7.
    add_flow "$FLOW_COVERAGE_PROFILE"
    add_flow "$FLOW_COVERAGE_JOURNAL"
    add_flow "$FLOW_COVERAGE_CUSTOM"
    add_flow "$FLOW_COVERAGE_MAP"
    add_stale "$FLOW_COVERAGE_SETTINGS"   # never re-run this project — note 5
    add_flow "$FLOW_COVERAGE_COOP"
    add_flow "$FLOW_COVERAGE_INVITE"
    add_flow "$FLOW_COVERAGE_GUILD"
    add_flow "$FLOW_COVERAGE_SCHEDULED"
  fi

  if [ "$phase" = "all" ] || [ "$phase" = "smoke" ]; then
    add_stale "$FLOW_SMOKE_CRITICAL"
  fi

  # LAST, always. This signs the device out and nothing signs it back in.
  if [ "$phase" = "all" ] || [ "$phase" = "social" ]; then
    add_flow "$FLOW_SOCIAL_LOGIN"
  fi
}

# -----------------------------------------------------------------------------
# Preflight
# -----------------------------------------------------------------------------

# Every flow path this run will invoke must exist. This is the structural guard
# against the class of bug that made the old script point at `02-conversion/`
# (never existed) and the plan's draft point at `05-smoke/` (not renamed yet):
# a path that resolves to nothing, so the phase silently runs zero flows and
# reports success.
check_flow_paths() {
  local step kind path missing=0
  for step in ${STEPS[@]+"${STEPS[@]}"}; do
    kind="${step%%|*}"
    [ "$kind" = "flow" ] || continue
    path="${step#flow|}"
    path="${path%|*}"
    if [ ! -f "$path" ]; then
      log_fail "flow file missing: ${path}"
      missing=$((missing + 1))
    fi
  done
  if [ "$missing" -gt 0 ]; then
    log_fail "${missing} flow file(s) referenced by phase '${PHASE}' do not exist — refusing to run a phase that would silently skip them"
    exit 1
  fi
  log_ok "all ${#STEPS[@]} step(s) resolve — every flow file exists"
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    log_fail "$1 not on PATH ($2)"
    exit 1
  }
}

preflight() {
  log_info "Preflight..."

  check_flow_paths

  require_cmd maestro "install: curl -Ls 'https://get.maestro.mobile.dev' | bash"
  log_ok "maestro installed: $(maestro --version)"

  require_cmd curl "curl ships with macOS — check your PATH"
  require_cmd xcrun "install Xcode command line tools: xcode-select --install"

  curl -sf "${BACKEND_URL}/v1/health" >/dev/null || {
    log_fail "backend not reachable at ${BACKEND_URL}/v1/health (run: npm run dev in unquest-server)"
    exit 1
  }
  log_ok "backend reachable at ${BACKEND_URL}"

  curl -sf "${MAILPIT_URL}/api/v1/messages" >/dev/null || {
    log_fail "Mailpit not reachable at ${MAILPIT_URL} (run: npm run mailpit:start in unquest-server)"
    exit 1
  }
  log_ok "Mailpit reachable at ${MAILPIT_URL}"

  # mongosh is only needed by the purge, so only phases that purge require it.
  if [ "$DO_PURGE" -eq 1 ]; then
    require_cmd mongosh "install: brew install mongosh"

    # The purge is worth nothing unless it matches the addresses this runner
    # actually generates. That pairing has already broken once: the address moved
    # off `.test` and a hand-written regex would have kept matching `.test`,
    # deleting nothing while reporting success.
    if ! printf '%s' "$TEST_EMAIL" | grep -Eq "$TEST_EMAIL_PURGE_REGEX"; then
      log_fail "TEST_EMAIL (${TEST_EMAIL}) does not match the purge regex /${TEST_EMAIL_PURGE_REGEX}/ — the purge would silently match nothing"
      exit 1
    fi
    log_ok "purge regex matches the generated address"

    mongosh "$MONGODB_URI" --quiet --eval "db.runCommand('ping')" >/dev/null || {
      log_fail "MongoDB not reachable at ${MONGODB_URI}"
      exit 1
    }
    log_ok "MongoDB reachable at ${MONGODB_URI}"
  fi

  xcrun simctl list devices booted 2>/dev/null | grep -q "Booted" || {
    log_fail "no booted iOS simulator (open Simulator.app, or: xcrun simctl boot <udid>)"
    exit 1
  }
  log_ok "iOS simulator booted"

  xcrun simctl get_app_container booted "$BUNDLE_ID" >/dev/null 2>&1 || {
    log_fail "${BUNDLE_ID} not installed on the booted simulator (run: pnpm e2e:build)"
    exit 1
  }
  log_ok "${BUNDLE_ID} installed"
}

# -----------------------------------------------------------------------------
# Purge
#
# Only phases that BEGIN the chain purge. `onboarding-part-1.yaml` is the only
# flow carrying `clearState: true`, so `all` and `onboarding` are the only entry
# points that create a new user — for them the purge delivers its guarantee
# ("a crashed run never poisons the next one").
#
# `signup`, `fresh`, `coverage`, `smoke` and `social` are CONTINUATION phases:
# they run against the account a previous run left on the device. Purging there
# would delete exactly the user their own flows need.
# -----------------------------------------------------------------------------
purge_stale_state() {
  log_info "Purging stale e2e state..."
  curl -sf -X DELETE "${MAILPIT_URL}/api/v1/messages" >/dev/null
  mongosh "$MONGODB_URI" --quiet \
    --eval "db.users.deleteMany({email: {\$regex: /${TEST_EMAIL_PURGE_REGEX}/}})" >/dev/null
  log_ok "purged Mailpit messages and users matching /${TEST_EMAIL_PURGE_REGEX}/"
}

# -----------------------------------------------------------------------------
# Execution
# -----------------------------------------------------------------------------

# TEST_EMAIL is the runner->flow contract (02-signup/*, 03-fresh-authenticated/*).
# MAILPIT_URL is passed too because 02-verify-authenticated.yaml reads it
# (with its own localhost:8025 fallback); without this the runner and the flow
# would disagree the moment anyone overrides MAILPIT_URL.
run_flow() {
  maestro test "$1" \
    --env TEST_EMAIL="$TEST_EMAIL" \
    --env MAILPIT_URL="$MAILPIT_URL"
}

execute_steps() {
  local step kind arg1 arg2 label
  local last_flow_ok=1

  for step in ${STEPS[@]+"${STEPS[@]}"}; do
    kind="${step%%|*}"
    arg1="${step#*|}"
    arg2="${arg1#*|}"
    arg1="${arg1%%|*}"

    case "$kind" in
      wait)
        if [ "$last_flow_ok" -eq 0 ]; then
          log_warn "skipping the ${arg1}s wait for ${arg2} — the preceding flow failed, so nothing is running"
        else
          log_warn "waiting ${arg1}s for ${arg2} to finish (2-min served duration + buffer; see header note 2)..."
          sleep "$arg1"
        fi
        ;;
      flow)
        label="${arg1#.maestro/flows/}"
        echo ""
        if [ "$arg2" = "unrevived" ]; then
          log_info "▶ ${label}"
          log_warn "KNOWN-UNREVIVED — this flow has not been revived yet and is expected to fail"
        else
          log_info "▶ ${label}"
        fi

        if run_flow "$arg1"; then
          last_flow_ok=1
          if [ "$arg2" = "unrevived" ]; then
            RESULTS+=("XPASS|${label}")
            log_ok "${label} passed — it is marked known-unrevived, so update the marking"
          else
            RESULTS+=("PASS|${label}")
            log_ok "${label} passed"
          fi
        else
          last_flow_ok=0
          if [ "$arg2" = "unrevived" ]; then
            RESULTS+=("XFAIL|${label}")
            log_fail "${label} failed (known-unrevived)"
          else
            RESULTS+=("FAIL|${label}")
            log_fail "${label} failed"
          fi
        fi
        ;;
    esac
  done
}

# -----------------------------------------------------------------------------
# Main
# -----------------------------------------------------------------------------
PHASE="${1:-all}"

case "$PHASE" in
  all|onboarding|signup|fresh|coverage|smoke|social) ;;
  *)
    log_fail "invalid phase: ${PHASE}"
    echo "Valid phases: all, onboarding, signup, fresh, coverage, smoke, social"
    exit 1
    ;;
esac

if [ "$PHASE" = "all" ] || [ "$PHASE" = "onboarding" ]; then
  DO_PURGE=1
else
  DO_PURGE=0
fi

rule
log_info "  Emberglow E2E — phase: ${PHASE}"
rule
echo "  Test email:  ${TEST_EMAIL}"
echo "  Backend:     ${BACKEND_URL}"
echo "  Mailpit:     ${MAILPIT_URL}"
echo "  MongoDB:     ${MONGODB_URI}"
echo "  Quest wait:  ${QUEST_WAIT_SECONDS}s"
echo ""

# Say it before the run, not only in the summary: these two phases end on the
# login screen with no session, and the account cannot be signed back in.
if [ "$PHASE" = "all" ] || [ "$PHASE" = "social" ]; then
  log_warn "this phase ends SIGNED OUT — 10-social-login.yaml logs the device out and nothing signs it back in. The next signed-in run must start from 'onboarding' or 'all'."
  echo ""
fi

build_steps "$PHASE"
preflight

if [ "$DO_PURGE" -eq 1 ]; then
  purge_stale_state
else
  log_dim "skipping purge — '${PHASE}' is a continuation phase and runs against the previous run's account"
fi

START_TIME="$(date +%s)"
execute_steps
END_TIME="$(date +%s)"

DURATION=$((END_TIME - START_TIME))
ELAPSED_MINS=$((DURATION / 60))
ELAPSED_SECS=$((DURATION % 60))   # NB: `SECONDS` is a bash special variable

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
echo ""
rule
log_info "  Results — phase: ${PHASE}"
rule

PASSED=0
FAILED=0
FAILED_KNOWN=0
UNEXPECTED_PASS=0

for result in ${RESULTS[@]+"${RESULTS[@]}"}; do
  status="${result%%|*}"
  name="${result#*|}"
  case "$status" in
    PASS)  log_ok "$name"; PASSED=$((PASSED + 1)) ;;
    XPASS) log_ok "$name  (known-unrevived but PASSED — update the marking)"
           PASSED=$((PASSED + 1)); UNEXPECTED_PASS=$((UNEXPECTED_PASS + 1)) ;;
    FAIL)  log_fail "$name"; FAILED=$((FAILED + 1)) ;;
    XFAIL) log_fail "$name  (known-unrevived)"
           FAILED=$((FAILED + 1)); FAILED_KNOWN=$((FAILED_KNOWN + 1)) ;;
  esac
done

echo ""
echo "  ${PASSED} passed, ${FAILED} failed (${FAILED_KNOWN} of them known-unrevived)"
echo "  Duration:   ${ELAPSED_MINS}m ${ELAPSED_SECS}s"
echo "  Test email: ${TEST_EMAIL}"

if [ "$UNEXPECTED_PASS" -gt 0 ]; then
  echo ""
  log_warn "${UNEXPECTED_PASS} flow(s) marked known-unrevived passed — flip their add_stale to add_flow in build_steps() and update note 5"
fi

echo ""
if [ "$FAILED" -eq 0 ]; then
  log_ok "all flows passed"
  exit 0
fi

log_fail "${FAILED} flow(s) failed"
log_dim "  This suite is a single user's state chain. Once one flow fails, the flows"
log_dim "  after it inherit the wrong state, so later failures are usually cascades"
log_dim "  of the first one rather than independent defects. Fix the earliest"
log_dim "  failure in the list above first, then re-run."
exit 1
