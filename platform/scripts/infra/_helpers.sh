#!/usr/bin/env bash

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0
MANUAL_STEPS=()
MANUAL_STEP_NUM=0

pass() {
  echo -e "  ${GREEN}[ok]${NC} $*"
  PASS=$((PASS + 1))
}

fail() {
  echo -e "  ${RED}[fail]${NC} $*"
  FAIL=$((FAIL + 1))
}

warn() {
  echo -e "  ${YELLOW}[warn]${NC} $*"
  WARN=$((WARN + 1))
}

info() {
  echo -e "  ${CYAN}[info]${NC} $*"
}

section() {
  echo ""
  echo -e "${BOLD}== $* ==${NC}"
}

manual_step() {
  MANUAL_STEP_NUM=$((MANUAL_STEP_NUM + 1))
  MANUAL_STEPS+=("[$MANUAL_STEP_NUM] $*")
  warn "Manual step $MANUAL_STEP_NUM required"
}

run() {
  if ${DRY_RUN:-false}; then
    echo -e "  ${CYAN}[dry-run]${NC} $*"
    return 0
  fi

  "$@"
}

run_with_retry() {
  local attempts="$1"
  local delay_seconds="$2"
  shift 2

  if ${DRY_RUN:-false}; then
    echo -e "  ${CYAN}[dry-run]${NC} $*"
    return 0
  fi

  local attempt=1
  local output_file
  output_file="$(mktemp)"

  while [[ "$attempt" -le "$attempts" ]]; do
    if "$@" >"$output_file" 2>&1; then
      cat "$output_file"
      rm -f "$output_file"
      return 0
    fi

    if grep -Eq "RESOURCE_EXHAUSTED|RATE_LIMIT_EXCEEDED|status.: 429|Quota exceeded" "$output_file"; then
      if [[ "$attempt" -lt "$attempts" ]]; then
        warn "Rate limit hit; retrying in ${delay_seconds}s (attempt $attempt/$attempts)"
        sleep "$delay_seconds"
        attempt=$((attempt + 1))
        delay_seconds=$((delay_seconds * 2))
        continue
      fi
    fi

    cat "$output_file"
    rm -f "$output_file"
    return 1
  done

  cat "$output_file"
  rm -f "$output_file"
  return 1
}

require_command() {
  local command_name="$1"
  if command -v "$command_name" >/dev/null 2>&1; then
    pass "$command_name found at $(command -v "$command_name")"
  else
    fail "$command_name is not installed"
    return 1
  fi
}

print_summary() {
  local title="${1:-Setup}"

  echo ""
  echo -e "${BOLD}${title} summary${NC}"
  echo "  passed: $PASS"
  echo "  warnings: $WARN"
  echo "  failed: $FAIL"

  if [[ ${#MANUAL_STEPS[@]} -gt 0 ]]; then
    echo ""
    echo -e "${BOLD}Manual steps${NC}"
    for step in "${MANUAL_STEPS[@]}"; do
      echo "  $step"
    done
  fi

  if [[ "$FAIL" -gt 0 ]]; then
    return 1
  fi

  return 0
}
