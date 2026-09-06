import { readFile, writeFile } from 'node:fs/promises'

const path = new URL('../../../.tmp/full-stack/c2w.Dockerfile', import.meta.url)
const original = await readFile(path, 'utf8')
const marker = 'RUN mv initconfig.json /out/oci/'
if (original.split(marker).length !== 2)
  throw new Error('Unexpected container2wasm Dockerfile')
await writeFile(
  path,
  original.replace(
    marker,
    `${marker}\nRUN go run /out/oci/rootfs/opt/playground/prepare-vm.go /out/oci/spec.json`,
  ),
)
