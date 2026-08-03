import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawn } from 'node:child_process'

const require = createRequire(import.meta.url)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const staticServerPath = require.resolve('@lvce-editor/static-server')
const staticServerRoot = resolve(dirname(staticServerPath), '..')
const staticServerConfigPath = join(staticServerRoot, 'config.json')
const originalStaticServerConfig = await readFile(staticServerConfigPath, 'utf8')
const staticServerConfig = JSON.parse(originalStaticServerConfig)
const assetDir = staticServerConfig.commit
const builtinExtensionsPath = join(staticServerRoot, 'static', assetDir, 'extensions')
const extensionPath = join(builtinExtensionsPath, 'builtin.devcontainer')
const sourceExtensionPath = join(root, '.tmp', 'dist')
const testWithPlaywrightPackagePath = require.resolve('@lvce-editor/test-with-playwright/package.json')
const testWithPlaywrightPath = join(dirname(testWithPlaywrightPackagePath), 'bin', 'test-with-playwright.js')
const extensionBrowserUrl = `/${assetDir}/extensions/builtin.devcontainer/dist/devcontainerMain.js`
const existingJavaScriptUrl = `/${assetDir}/packages/renderer-worker/dist/rendererWorkerMain.js`

await mkdir(builtinExtensionsPath, { recursive: true })
await rm(extensionPath, { force: true, recursive: true })
await cp(sourceExtensionPath, extensionPath, { recursive: true })

staticServerConfig.files[extensionBrowserUrl] = staticServerConfig.files[existingJavaScriptUrl]
await writeFile(staticServerConfigPath, JSON.stringify(staticServerConfig))

const child = spawn(
  process.execPath,
  [testWithPlaywrightPath, `--only-extension=${extensionPath}`, '--test-path=.', ...process.argv.slice(2)],
  {
    env: {
      ...process.env,
      BUILTIN_EXTENSIONS_PATH: builtinExtensionsPath,
    },
    stdio: 'inherit',
  },
)

const { code, signal } = await new Promise((resolve) => {
  child.on('exit', (code, signal) => resolve({ code, signal }))
})

await writeFile(staticServerConfigPath, originalStaticServerConfig)
await rm(extensionPath, { force: true, recursive: true })

if (signal) {
  process.kill(process.pid, signal)
} else {
  process.exitCode = code ?? 1
}
