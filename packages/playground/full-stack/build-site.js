import { build } from 'esbuild'
import { cp, mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const output = `${root}.tmp/full-stack/site`
await mkdir(output, { recursive: true })
await cp(`${root}.tmp/full-stack/image`, `${output}/runtime`, {
  recursive: true,
})
await cp(new URL('./public', import.meta.url), output, { recursive: true })
await cp(
  new URL('../public/isolation.js', import.meta.url),
  `${output}/isolation.js`,
)
await cp(
  fileURLToPath(import.meta.resolve('coi-serviceworker/coi-serviceworker.js')),
  `${output}/coi-serviceworker.js`,
)
await build({
  entryPoints: {
    app: fileURLToPath(new URL('./src/app.ts', import.meta.url)),
    'runtime-worker': fileURLToPath(
      new URL('../src/runtime-worker.ts', import.meta.url),
    ),
  },
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2022',
  outdir: output,
})
for (const name of ['load.js', 'arg-module.js']) {
  const path = `${output}/runtime/${name}`
  await writeFile(
    path,
    `var Module = globalThis.Module;\n${await readFile(path, 'utf8')}`,
  )
}
const assets = []
for (const name of await readdir(`${output}/runtime`)) {
  assets.push({ name, bytes: (await stat(`${output}/runtime/${name}`)).size })
}
await writeFile(`${output}/assets.json`, JSON.stringify(assets))
console.log(
  'Full stack assets:',
  assets.reduce((size, asset) => size + asset.bytes, 0),
)
