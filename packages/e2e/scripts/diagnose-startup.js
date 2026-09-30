import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const staticRoot = dirname(
  dirname(fileURLToPath(import.meta.resolve('@lvce-editor/static-server'))),
)
const { commit } = JSON.parse(
  await readFile(join(staticRoot, 'config.json'), 'utf8'),
)
const assetRoot = join(staticRoot, 'static', commit, 'packages')
const patch = async (path, changes) => {
  let source = await readFile(path, 'utf8')
  if (source.includes('DEVCONTAINER_STARTUP_DIAGNOSTIC')) return
  for (const [before, after] of changes) {
    if (source.split(before).length !== 2)
      throw new Error(`Diagnostic target is not unique: ${path}: ${before}`)
    source = source.replace(before, after)
  }
  await writeFile(path, `// DEVCONTAINER_STARTUP_DIAGNOSTIC\n${source}`)
  console.info(`Patched startup diagnostics: ${path}`)
}
const workerChanges = [
  [
    'const printTestError = async error => {',
    `const printTestError = async error => {
    console.error('DEVCONTAINER_STARTUP_DIAGNOSTIC original-error', performance.now(), error?.stack || String(error));`,
  ],
  [
    'const execute = async (href, platform, assetDir) => {',
    `const execute = async (href, platform, assetDir) => {
    console.info('DEVCONTAINER_STARTUP_DIAGNOSTIC dispatch', performance.now(), href);`,
  ],
  [
    'const executeTest2 = async (name, fn, globals, timestampGenerator) => {',
    `const executeTest2 = async (name, fn, globals, timestampGenerator) => {
    console.info('DEVCONTAINER_STARTUP_DIAGNOSTIC execute-test', performance.now(), name);`,
  ],
]
await patch(
  fileURLToPath(import.meta.resolve('@lvce-editor/test-worker')),
  workerChanges,
)
await patch(
  join(assetRoot, 'test-worker', 'dist', 'testWorkerMain.js'),
  workerChanges,
)
await patch(
  join(assetRoot, 'renderer-process', 'dist', 'rendererProcessMain.js'),
  [
    [
      'const listen$1 = rpc => {',
      `const listen$1 = rpc => {
    const capture = globalThis.__devcontainerStartup = { entries: [], dropped: 0 };
    rpc.ipc.addEventListener('message', event => {
      if (capture.entries.length >= 10000) { capture.dropped++; return; }
      try {
        const seen = new WeakSet();
        const payload = JSON.stringify(rpc.ipc.getData(event), (key, value) => {
          if (/token|secret|authorization|clipboard|password/i.test(key)) return '[redacted]';
          if (typeof value === 'bigint') return String(value);
          if (value && typeof value === 'object') {
            if (seen.has(value)) return '[circular]';
            seen.add(value);
          }
          return value;
        });
        capture.entries.push({ sequence: capture.entries.length, time: performance.now(), payload: payload?.slice(0, 16000), truncated: payload?.length > 16000 });
      } catch (error) { capture.entries.push({ captureError: String(error) }); }
    });`,
    ],
  ],
)
