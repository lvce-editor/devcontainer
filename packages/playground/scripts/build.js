import { build } from 'esbuild'
import {
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const playground = join(root, 'packages/playground')
const output = join(root, '.tmp/playground')
await rm(output, { recursive: true, force: true })
await mkdir(output, { recursive: true })
await cp(join(playground, 'public'), output, { recursive: true })
await cp(join(root, '.tmp/playground-image'), join(output, 'runtime'), {
  recursive: true,
})
await cp(
  join(playground, 'image/workspace/.devcontainer/devcontainer.json'),
  join(output, 'devcontainer.json'),
)
await cp(
  fileURLToPath(import.meta.resolve('coi-serviceworker/coi-serviceworker.js')),
  join(output, 'coi-serviceworker.js'),
)
await cp(join(root, 'LICENSE'), join(output, 'LICENSE.txt'))
const result = await build({
  entryPoints: [
    join(playground, 'src/app.ts'),
    join(playground, 'src/runtime-worker.ts'),
  ],
  bundle: true,
  platform: 'browser',
  format: 'esm',
  target: 'es2022',
  outdir: output,
  metafile: true,
})
if (
  Object.keys(result.metafile.inputs).some((path) => path.startsWith('node:'))
) {
  throw new Error('Node modules must not enter the browser bundle')
}
// Emscripten's generated loaders share Module through global scope.
// Turn the generated script into an explicit module used only by the VM worker.
const runtime = join(output, 'runtime')
for (const name of ['load.js', 'arg-module.js']) {
  const source = await readFile(join(runtime, name), 'utf8')
  await writeFile(
    join(runtime, name),
    `var Module = globalThis.Module;\n${source}`,
  )
}
const assets = []
for (const name of await readdir(runtime)) {
  const info = await stat(join(runtime, name))
  if (info.isFile()) assets.push({ name, bytes: info.size })
}
await writeFile(join(output, 'assets.json'), JSON.stringify(assets))
const bytes = assets.reduce((total, asset) => total + asset.bytes, 0)
if (bytes > 900 * 1024 * 1024)
  throw new Error('Runtime exceeds the 900 MiB Pages budget')
console.log(`Runtime assets: ${(bytes / 1024 / 1024).toFixed(1)} MiB`)
if (process.env.GITHUB_STEP_SUMMARY) {
  const { appendFile } = await import('node:fs/promises')
  await appendFile(
    process.env.GITHUB_STEP_SUMMARY,
    `Runtime assets: ${(bytes / 1024 / 1024).toFixed(1)} MiB\n`,
  )
}
