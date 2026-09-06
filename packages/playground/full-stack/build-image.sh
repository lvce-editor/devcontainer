#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../../.."
node packages/playground/full-stack/build-bundle.js
mkdir -p .tmp/c2w .tmp/full-stack/image
version=v0.8.4
archive="container2wasm-${version}-linux-amd64.tar.gz"
base="https://github.com/container2wasm/container2wasm/releases/download/${version}"
curl --fail --location --retry 3 "$base/$archive" -o ".tmp/c2w/$archive"
curl --fail --location --retry 3 "$base/SHA256SUMS" -o .tmp/c2w/SHA256SUMS
(cd .tmp/c2w && sha256sum --check --ignore-missing SHA256SUMS && tar -xzf "$archive")
.tmp/c2w/c2w --show-dockerfile > .tmp/full-stack/c2w.Dockerfile
node packages/playground/full-stack/prepare-converter.js
alpine='alpine:3.23.3@sha256:25109184c71bdad752c8312a8623239686a9a2071e8825f20acb8f2198c3f659'
docker pull --platform linux/amd64 "$alpine"
docker tag "$alpine" lvce-playground-alpine:3.23.3
docker save lvce-playground-alpine:3.23.3 -o .tmp/full-stack/context/alpine.tar
docker build --platform linux/amd64 -t lvce-full-stack:build -f packages/playground/full-stack/image/Dockerfile .tmp/full-stack/context
# Catch package, IPC and CLI issues before paying the emulation build cost.
trap 'timeout --kill-after=5s 15 docker rm -f lvce-full-stack-native >/dev/null 2>&1 || true' EXIT
timeout --kill-after=10s 180 docker run --name lvce-full-stack-native --rm --privileged --cgroupns=host --network none lvce-full-stack:build | tee .tmp/full-stack/native.log
grep -q '^FULL_STACK_PASS$' .tmp/full-stack/native.log
cache_flags=()
if [[ -n "${ACTIONS_RUNTIME_TOKEN:-}" ]]; then
  cache_flags=(
    --extra-flag=--cache-from=type=gha,scope=playground-c2w
    --extra-flag=--cache-from=type=gha,scope=full-stack-c2w
    --extra-flag=--cache-to=type=gha,mode=max,scope=full-stack-c2w,ignore-error=true
  )
fi
.tmp/c2w/c2w --to-js --dockerfile .tmp/full-stack/c2w.Dockerfile \
  --build-arg VM_MEMORY_SIZE_MB=1024 \
  --build-arg SOURCE_REPO=https://github.com/container2wasm/container2wasm \
  "${cache_flags[@]}" lvce-full-stack:build .tmp/full-stack/image/
