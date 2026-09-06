#!/bin/sh
set -eu
stty -echo -icanon 2>/dev/null || true
printf '\nFULL_STACK_PHASE Starting Docker inside Linux\n'
mkdir -p /var/lib/docker /run/docker
# The VM has no guest networking. Docker also creates no bridge or firewall rules.
dockerd --storage-driver=vfs --bridge=none --iptables=false --ip6tables=false \
  --ip-forward=false --ip-masq=false --userland-proxy=false \
  --exec-opt native.cgroupdriver=cgroupfs >/tmp/docker.log 2>&1 &
daemon=$!
trap 'kill "$daemon" 2>/dev/null || true' EXIT
attempt=0
until docker info >/dev/null 2>&1; do
  if ! kill -0 "$daemon" 2>/dev/null || [ "$attempt" -ge 120 ]; then
    cat /tmp/docker.log
    printf '\nFULL_STACK_FAIL Docker did not become ready\n'
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 1
done
printf '\nFULL_STACK_PHASE Loading the bundled Alpine image\n'
if ! docker load -i /opt/playground/alpine.tar; then
  cat /tmp/docker.log
  printf '\nFULL_STACK_FAIL Unable to load Alpine\n'
  exit 1
fi
printf '\nFULL_STACK_PHASE Starting the real Node process and CLI\n'
node /opt/playground/probe.mjs
