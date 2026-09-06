import { appendFile, readdir, stat } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const root = fileURLToPath(
  new URL('../../../.tmp/playground/', import.meta.url),
)
let bytes = 0
for (const name of await readdir(root, { recursive: true })) {
  const info = await stat(join(root, name))
  if (info.isFile()) bytes += info.size
}
const message = `Combined Pages site: ${(bytes / 1024 / 1024).toFixed(1)} MiB`
console.log(message)
if (process.env.GITHUB_STEP_SUMMARY) {
  await appendFile(process.env.GITHUB_STEP_SUMMARY, `${message}\n`)
}
if (bytes > 900 * 1024 * 1024) {
  throw new Error('Combined site exceeds the 900 MiB Pages budget')
}
