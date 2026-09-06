import { build } from 'esbuild'
import { cp, mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const context = `${root}.tmp/full-stack/context`
await mkdir(context, { recursive: true })
for (const name of ['image', 'workspace']) {
  await cp(new URL(`./${name}`, import.meta.url), `${context}/${name}`, {
    recursive: true,
  })
}
await build({
  entryPoints: {
    'devcontainer-node': `${root}packages/devcontainer-node/src/devcontainerNodeMain.ts`,
    probe: fileURLToPath(new URL('./src/probe.ts', import.meta.url)),
  },
  outdir: `${context}/bundle`,
  outExtension: { '.js': '.mjs' },
  bundle: true,
  external: ['electron', '@devcontainers/cli/*'],
  platform: 'node',
  format: 'esm',
  target: 'node24',
  banner: {
    js: "import { createRequire as _createRequire } from 'node:module'; const require = _createRequire(import.meta.url);",
  },
})
// Copy the exact CLI package from the lockfile installation, including licenses.
await cp(
  `${root}node_modules/@devcontainers/cli`,
  `${context}/bundle/node_modules/@devcontainers/cli`,
  { recursive: true },
)
