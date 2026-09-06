import { readFile, writeFile } from 'node:fs/promises'

const path = new URL('../../../.tmp/full-stack/c2w.Dockerfile', import.meta.url)
const original = await readFile(path, 'utf8')
const marker = 'RUN mv initconfig.json /out/oci/'
const emulatorMarker = 'COPY --from=qemu-x86_64-pack /pack /pack'
if (
  original.split(marker).length !== 2 ||
  original.split(emulatorMarker).length !== 2
)
  throw new Error('Unexpected container2wasm Dockerfile')
await writeFile(
  path,
  original
    .replace(
      marker,
      `${marker}\nRUN go run /out/oci/rootfs/opt/playground/prepare-vm.go /out/oci/spec.json`,
    )
    // Firefox allocates executable memory for each compiled Wasm module.
    // Keep QEMU's live translations below its per-process code limit, letting
    // the emulator's existing eviction and interpreter fallback manage reuse.
    .replace(
      emulatorMarker,
      () =>
        `RUN test "$(grep -c '^#define MAX_INSTANCE_ALIVE 15000$' /qemu/tcg/wasm32.c)" = 1 && \\\n    sed -i 's/^#define MAX_INSTANCE_ALIVE 15000$/#define MAX_INSTANCE_ALIVE 8192/' /qemu/tcg/wasm32.c && \\\n    emmake make -j $(nproc) qemu-system-x86_64\n${emulatorMarker}`,
    ),
)
