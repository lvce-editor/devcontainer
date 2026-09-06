import { execFile, spawn } from 'node:child_process'
import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

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
const fixturesPath = join(root, 'packages', 'e2e', 'fixtures')
const workspacesPath = join(root, 'packages', 'e2e', '.tmp', 'fixtures')
const fixtures = await readdir(fixturesPath)
const execFileAsync = promisify(execFile)

// Also remove containers left by a failed startup before an id reached extension state.
// Restrict every Docker operation to the copied workspaces owned by this runner.
const cleanupContainers = async () => {
  for (const fixture of fixtures) {
    const { stdout } = await execFileAsync('docker', [
      'ps',
      '-aq',
      '--filter',
      `label=devcontainer.local_folder=${join(workspacesPath, fixture)}`,
    ])
    for (const containerId of stdout.trim().split('\n').filter(Boolean)) {
      await execFileAsync('docker', ['rm', '-f', containerId])
    }
  }
}

try {
  await cleanupContainers()
  await rm(workspacesPath, { force: true, recursive: true })
  await cp(fixturesPath, workspacesPath, { recursive: true })
  await mkdir(builtinExtensionsPath, { recursive: true })
  await rm(extensionPath, { force: true, recursive: true })
  await cp(sourceExtensionPath, extensionPath, { recursive: true })

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
    await cleanupContainers()
  } finally {
    await writeFile(staticServerConfigPath, originalStaticServerConfig)
    await rm(extensionPath, { force: true, recursive: true })
    await rm(workspacesPath, { force: true, recursive: true })
  }
}
