#!/usr/bin/env bash
# Run every static harness. No network, no browser, no backend needed.
set -u
cd "$(dirname "$0")/.."
node test/prepare.js >/dev/null || { echo "prepare failed"; exit 1; }
fail=0
for t in c-merge-equivalence d-migration-decision f-account-ui sw-cache-policy demo-pile-filter; do
  out=$(node "test/$t.js" 2>&1); rc=$?
  printf "%-26s %s\n" "$t" "$(echo "$out" | tail -1)"
  [ $rc -ne 0 ] && { fail=1; echo "$out" | grep '^  FAIL' | sed 's/^/    /'; }
done
echo
if [ $fail -eq 0 ]; then echo "ALL SUITES PASSED"; else echo "SUITE FAILURES - see above"; fi
exit $fail
