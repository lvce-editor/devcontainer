import { spawn } from 'node:child_process'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cleanupContainers } from './cleanup-containers.js'

const require = createRequire(import.meta.url)
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const staticServerPath = require.resolve('@lvce-editor/static-server')
const staticServerRoot = resolve(dirname(staticServerPath), '..')
const staticServerConfigPath = join(staticServerRoot, 'config.json')
const originalStaticServerConfig = await readFile(
  staticServerConfigPath,
  'utf8',
)
const staticServerConfig = JSON.parse(originalStaticServerConfig)
const assetDir = staticServerConfig.commit
const builtinExtensionsPath = join(
  staticServerRoot,
  'static',
  assetDir,
  'extensions',
)
const extensionPath = join(builtinExtensionsPath, 'builtin.devcontainer')
const sourceExtensionPath = join(root, '.tmp', 'dist')
const testWithPlaywrightPackagePath =
  require.resolve('@lvce-editor/test-with-playwright/package.json')
const testWithPlaywrightPath = join(
  dirname(testWithPlaywrightPackagePath),
  'bin',
  'test-with-playwright.js',
)
const extensionBrowserUrl = `/${assetDir}/extensions/builtin.devcontainer/dist/devcontainerMain.js`
const existingJavaScriptUrl = `/${assetDir}/packages/renderer-worker/dist/rendererWorkerMain.js`
const workspacesPath = join(root, 'packages', 'e2e', '.tmp', 'fixtures')
const testWorkerPath = join(
  staticServerRoot,
  'static',
  assetDir,
  'packages',
  'test-worker',
  'dist',
  'testWorkerMain.js',
)
const originalTestWorker = await readFile(testWorkerPath)
const installedTestWorkerPath = require.resolve('@lvce-editor/test-worker')

try {
  await cleanupContainers(workspacesPath)
  await rm(workspacesPath, { force: true, recursive: true })
  await mkdir(builtinExtensionsPath, { recursive: true })
  await rm(extensionPath, { force: true, recursive: true })
  await cp(sourceExtensionPath, extensionPath, { recursive: true })
  // Use the page objects from our declared dependency instead of the editor's bundled version.
  await cp(installedTestWorkerPath, testWorkerPath)

  staticServerConfig.files[extensionBrowserUrl] =
    staticServerConfig.files[existingJavaScriptUrl]
  await writeFile(staticServerConfigPath, JSON.stringify(staticServerConfig))

  const child = spawn(
    process.execPath,
    [
      testWithPlaywrightPath,
      `--only-extension=${extensionPath}`,
      '--test-path=.',
      '--timeout=180000',
      ...process.argv.slice(2),
    ],
    {
      cwd: join(root, 'packages', 'e2e'),
      env: {
        ...process.env,
        BUILTIN_EXTENSIONS_PATH: builtinExtensionsPath,
        LVCE_DEVCONTAINER_CONNECTIONS_DIR: join(workspacesPath, '.connections'),
      },
      stdio: 'inherit',
    },
  )

  const code = await new Promise((resolve, reject) => {
    child.once('error', reject)
    child.once('exit', resolve)
  })
  process.exitCode = code ?? 1
} finally {
  try {
    await cleanupContainers(workspacesPath)
  } finally {
    await writeFile(staticServerConfigPath, originalStaticServerConfig)
    await writeFile(testWorkerPath, originalTestWorker)
    await rm(extensionPath, { force: true, recursive: true })
    await rm(workspacesPath, { force: true, recursive: true })
  }
}
