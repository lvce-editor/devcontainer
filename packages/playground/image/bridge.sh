#!/bin/sh
# Requests and responses use base64 to keep user output out of the control channel.
workspace="${PLAYGROUND_WORKSPACE:-/workspace}"
stty -echo -icanon 2>/dev/null || true
printf '\nLVCE_READY\n'
while IFS=' ' read -r request_id encoded; do
  case "$request_id" in ''|*[!0-9]*) continue ;; esac
  dir=$(mktemp -d)
  printf '%s' "$encoded" | base64 -d > "$dir/command"
  # Bound runaway output and execution; commands cannot consume protocol input.
  (ulimit -f 2048; cd "$workspace" && timeout 30 sh -lc "$(cat "$dir/command")" </dev/null) > "$dir/stdout" 2> "$dir/stderr"
  result=$?
  printf 'LVCE_RESULT %s %s ' "$request_id" "$result"
  base64 "$dir/stdout" | tr -d '\n'
  printf ' '
  base64 "$dir/stderr" | tr -d '\n'
  printf '\n'
  rm -rf "$dir"
done
