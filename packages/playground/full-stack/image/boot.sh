#!/bin/sh
set -eu
stty -echo -icanon 2>/dev/null || true
daemon=''
containerd_pid=''
cleanup() {
  result=$?
  if [ "$result" -ne 0 ]; then
    cat /tmp/containerd.log /tmp/docker.log 2>/dev/null || true
    printf '\nFULL_STACK_FAIL Guest startup exited with status %s\n' "$result"
  fi
  if [ -n "$daemon" ]; then kill "$daemon" 2>/dev/null || true; fi
  if [ -n "$containerd_pid" ]; then kill "$containerd_pid" 2>/dev/null || true; fi
}
trap cleanup EXIT
mkdir -p /var/lib/docker /run/docker
# Fail early with a useful diagnostic if the prepared OCI mount regresses.
if [ ! -f /sys/fs/cgroup/cgroup.controllers ]; then
  printf '\nFULL_STACK_PHASE The guest requires a writable cgroup v2 mount\n'
  exit 1
fi
# Start containerd independently: Docker's managed-child startup deadline is
# shorter than a cold Go process can take under browser CPU emulation.
printf '\nFULL_STACK_PHASE Starting containerd inside Linux\n'
containerd --config /opt/playground/containerd.toml >/tmp/containerd.log 2>&1 &
containerd_pid=$!
attempt=0
until [ -S /run/containerd/containerd.sock ]; do
  if ! kill -0 "$containerd_pid" 2>/dev/null || [ "$attempt" -ge 180 ]; then
    printf '\nFULL_STACK_PHASE containerd did not become ready\n'
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 1
done
printf '\nFULL_STACK_PHASE Starting Docker inside Linux\n'
# The VM has no guest networking. Docker also creates no bridge or firewall rules.
dockerd --containerd=/run/containerd/containerd.sock \
  --storage-driver=vfs --bridge=none --iptables=false --ip6tables=false \
  --ip-forward=false --ip-masq=false --userland-proxy=false \
  --exec-opt native.cgroupdriver=cgroupfs >/tmp/docker.log 2>&1 &
daemon=$!
attempt=0
# Avoid starting an expensive second Go process while dockerd is still loading.
until [ -S /var/run/docker.sock ]; do
  if ! kill -0 "$daemon" 2>/dev/null || [ "$attempt" -ge 180 ]; then
    printf '\nFULL_STACK_PHASE Docker did not open its socket\n'
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 1
done
attempt=0
until docker info >/dev/null 2>&1; do
  if ! kill -0 "$daemon" 2>/dev/null || [ "$attempt" -ge 120 ]; then
    printf '\nFULL_STACK_PHASE Docker did not become ready\n'
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 1
done
printf '\nFULL_STACK_PHASE Loading the bundled Alpine image\n'
docker load --quiet -i /opt/playground/alpine.tar
printf '\nFULL_STACK_PHASE Starting the real Node process and CLI\n'
# Reuse Node bytecode between real CLI child processes within this VM session.
export NODE_COMPILE_CACHE=/tmp/lvce-node-compile-cache
node /opt/playground/probe.mjs
