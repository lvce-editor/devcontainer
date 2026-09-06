#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p ../../.tmp/c2w ../../.tmp/playground-image
version=v0.8.4
archive="container2wasm-${version}-linux-amd64.tar.gz"
base="https://github.com/container2wasm/container2wasm/releases/download/${version}"
curl --fail --location --retry 3 "$base/$archive" -o "../../.tmp/c2w/$archive"
curl --fail --location --retry 3 "$base/SHA256SUMS" -o ../../.tmp/c2w/SHA256SUMS
(cd ../../.tmp/c2w && sha256sum --check --ignore-missing SHA256SUMS && tar -xzf "$archive")
docker build --platform linux/amd64 -t lvce-playground:build image
../../.tmp/c2w/c2w --to-js --build-arg VM_MEMORY_SIZE_MB=128 \
  --extra-flag=--cache-from=type=gha,scope=playground-c2w \
  --extra-flag=--cache-to=type=gha,mode=max,scope=playground-c2w \
  lvce-playground:build ../../.tmp/playground-image/
