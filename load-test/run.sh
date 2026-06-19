#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# run.sh — QR Queue App Load Test Runner
#
# Usage:
#   ./load-test/run.sh [TEST_TYPE] [BASE_URL]
#
#   TEST_TYPE : smoke | load | stress | all  (default: load)
#   BASE_URL  : host:port of the running Meteor app (default: localhost:3000)
#
# Examples:
#   ./load-test/run.sh                        # load test against localhost:3000
#   ./load-test/run.sh smoke                  # quick 30-second sanity check
#   ./load-test/run.sh stress localhost:3000  # stress test
#   ./load-test/run.sh all                    # smoke → load → stress in sequence
#
# Requirements:
#   • k6   (https://k6.io/docs/getting-started/installation/)
#   • node (v14+) — for the HTML report generator
#   • The Meteor app must be running before you start
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

TEST_TYPE="${1:-load}"
BASE_URL="${2:-localhost:3000}"

SUMMARY_FILE="$SCRIPT_DIR/reports/summary.json"
REPORT_FILE="$SCRIPT_DIR/reports/report.html"
K6_SCRIPT="$SCRIPT_DIR/load-test.js"
REPORT_GEN="$SCRIPT_DIR/generate-report.js"

# ─── Colour helpers ───────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; RESET='\033[0m'

info()    { echo -e "${CYAN}[•]${RESET} $*"; }
success() { echo -e "${GREEN}[✓]${RESET} $*"; }
warn()    { echo -e "${YELLOW}[!]${RESET} $*"; }
error()   { echo -e "${RED}[✗]${RESET} $*" >&2; exit 1; }

# ─── Preflight checks ─────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════${RESET}"
echo -e "${BOLD}  QR Queue App — Load Test${RESET}"
echo -e "${BOLD}══════════════════════════════════════════════════════${RESET}"
echo ""

# Check k6
if ! command -v k6 &>/dev/null; then
  echo ""
  warn "k6 is not installed. Install it first:"
  echo ""
  echo "  macOS:   brew install k6"
  echo "  Linux:   sudo apt install k6   (or see https://k6.io/docs/get-started/installation/)"
  echo "  Windows: choco install k6"
  echo ""
  error "k6 not found — aborting."
fi
K6_VERSION=$(k6 version 2>&1 | head -1)
success "k6 found: $K6_VERSION"

# Check node
if ! command -v node &>/dev/null; then
  warn "node is not installed — HTML report will be skipped."
  HAS_NODE=false
else
  success "node found: $(node --version)"
  HAS_NODE=true
fi

# Check app is reachable
info "Checking app at $BASE_URL …"
if command -v curl &>/dev/null; then
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "http://$BASE_URL" 2>/dev/null || true)
  if [[ "$HTTP_CODE" == "200" || "$HTTP_CODE" == "301" || "$HTTP_CODE" == "302" ]]; then
    success "App responded with HTTP $HTTP_CODE"
  else
    warn "App at http://$BASE_URL returned HTTP '$HTTP_CODE' — make sure the Meteor server is running (meteor run)."
    echo ""
    read -r -p "  Continue anyway? [y/N] " yn
    [[ "$yn" =~ ^[Yy]$ ]] || exit 1
  fi
else
  warn "curl not found — skipping reachability check."
fi

# Ensure reports directory exists
mkdir -p "$SCRIPT_DIR/reports"

# ─── Run k6 ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}Running $TEST_TYPE test against ws://$BASE_URL …${RESET}"
echo ""

START_TIME=$(date +%s)

k6 run \
  --env TEST_TYPE="$TEST_TYPE" \
  --env BASE_URL="$BASE_URL" \
  --out "json=$SCRIPT_DIR/reports/metrics.jsonl" \
  "$K6_SCRIPT"

K6_EXIT=$?
END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo ""
info "k6 finished in ${ELAPSED}s (exit code: $K6_EXIT)"

# ─── Generate HTML report ─────────────────────────────────────────────────────
if $HAS_NODE && [[ -f "$SUMMARY_FILE" ]]; then
  info "Generating HTML report …"
  TEST_TYPE="$TEST_TYPE" BASE_URL="$BASE_URL" \
    node "$REPORT_GEN" "$SUMMARY_FILE" "$REPORT_FILE"
  success "HTML report → $REPORT_FILE"

  # Try to open the report in the default browser
  if command -v open &>/dev/null; then
    open "$REPORT_FILE"
  elif command -v xdg-open &>/dev/null; then
    xdg-open "$REPORT_FILE"
  fi
else
  if [[ ! -f "$SUMMARY_FILE" ]]; then
    warn "Summary JSON not found — HTML report skipped."
  fi
fi

# ─── Final banner ─────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}══════════════════════════════════════════════════════${RESET}"
if [[ $K6_EXIT -eq 0 ]]; then
  success "All thresholds passed!"
else
  warn "One or more thresholds failed (k6 exit: $K6_EXIT) — check the report for details."
fi

echo ""
echo "  Reports:"
[[ -f "$SUMMARY_FILE" ]] && echo "    JSON   → $SUMMARY_FILE"
[[ -f "$REPORT_FILE"  ]] && echo "    HTML   → $REPORT_FILE"
echo -e "${BOLD}══════════════════════════════════════════════════════${RESET}"
echo ""

exit $K6_EXIT
