#!/usr/bin/env bash
# Run from packages/cli. Each registered isolated suite runs in its own Bun process.
set -euo pipefail

mode=${1:?expected shard or isolated}
selection=${2:?expected shard number or group name}
declare -A groups=()
selected=()

fail() {
  echo "::error::$*" >&2
  exit 1
}

register() {
  local group=$1 file
  shift
  for file in "$@"; do
    [[ -z "${groups[$file]-}" ]] || fail "duplicate suite registration: $file"
    groups[$file]=$group
    if [[ $group == "$selection" ]]; then selected+=("$file"); fi
  done
}

register mcp-mocks \
  test/mcp/lifecycle.test.ts \
  test/mcp/headers.test.ts \
  test/mcp/oauth-auto-connect.test.ts \
  test/mcp/oauth-browser.test.ts
register provider-refresh \
  test/provider/refresh.test.ts \
  test/provider/refresh-boundaries.test.ts \
  test/provider/refresh-harness.test.ts
register stdio-exit-observe test/mcp/stdio-exit-observe.test.ts
register resume-negatives test/actor/subagent-resume-negatives.test.ts
register bus-integration test/bus/bus-integration.test.ts

# These suites are executed in the ordinary shards but emit no JUnit suite on Linux.
register zero-case test/config/plugin.test.ts test/provider/gitlab-duo.test.ts test/pty/pty-shell.test.ts

run_suite() {
  local report=$1 file
  shift
  local expected=()
  for file in "$@"; do
    [[ ${groups[$file]-} == zero-case ]] || expected+=("$file")
  done
  (( ${#expected[@]} )) || fail "$selection expects zero JUnit suites"
  mkdir -p -- "$(dirname "$report")"
  rm -f -- "$report"
  bun test "$@" --timeout 120000 --reporter=junit --reporter-outfile="$report"
  python3 "$GITHUB_WORKSPACE/.github/scripts/verify-junit.py" "$report" "${expected[@]}"
}

if [[ $mode == isolated ]]; then
  (( ${#selected[@]} )) || fail "unknown or empty suite group: $selection"
  directory=${3:?expected report directory}
  for file in "${selected[@]}"; do
    [[ -f $file ]] || fail "missing isolated suite: $file"
    report=$directory/junit.xml
    if (( ${#selected[@]} > 1 )); then report=$directory/${file##*/}.xml; fi
    run_suite "$report" "$file"
  done
  exit
fi

[[ $mode == shard && $selection =~ ^([1-9][0-9]*)/([1-9][0-9]*)$ ]] || fail "invalid shard: $selection"
index=${BASH_REMATCH[1]}
count=${BASH_REMATCH[2]}
(( index <= count )) || fail "invalid shard: $selection"

# Keep the same path-hash membership and sorted invocation order across runs.
mapfile -d '' discovered < <(find test -type f \( -name '*.test.ts' -o -name '*.test.tsx' \) -print0 | sort -z)
declare -A found=()
has_tsx=0
files=()
for file in "${discovered[@]}"; do
  found[$file]=1
  if [[ $file == *.test.tsx ]]; then has_tsx=1; fi
  group=${groups[$file]-}
  if [[ -n $group && $group != zero-case ]]; then continue; fi
  hash=$(printf '%s' "$file" | cksum)
  if (( ${hash%% *} % count == index - 1 )); then files+=("$file"); fi
done
(( has_tsx )) || fail "discovery lost all TSX suites"
for file in test/workflow/runtime-worktree.test.ts "${!groups[@]}"; do
  [[ -n "${found[$file]-}" ]] || fail "required suite is not discoverable: $file"
done
(( ${#files[@]} )) || fail "shard $selection received zero files"
run_suite .artifacts/unit/junit.xml "${files[@]}"
