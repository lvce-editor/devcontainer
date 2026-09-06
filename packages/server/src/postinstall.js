import { cp, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const staticServerPath = fileURLToPath(
  import.meta.resolve('@lvce-editor/static-server'),
)
const staticServerRoot = dirname(dirname(staticServerPath))
const { commit } = JSON.parse(
  await readFile(join(staticServerRoot, 'config.json'), 'utf8'),
)
const testWorkerPath = join(
  staticServerRoot,
  'static',
  commit,
  'packages',
  'test-worker',
  'dist',
  'testWorkerMain.js',
)

// Direct test URL visits need the same page objects as the command-line runner.
await cp(
  fileURLToPath(import.meta.resolve('@lvce-editor/test-worker')),
  testWorkerPath,
)
