import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { test } from 'node:test'

const manifest = JSON.parse(
  await readFile(new URL('../extension.json', import.meta.url), 'utf8'),
)

await test('Dev Containers output channel activates when Output is opened', () => {
  assert.ok(manifest.activation.includes('onOutput'))
  assert.deepEqual(
    manifest.outputChannels.filter(
      (channel: { id: string }) => channel.id === 'dev-containers',
    ),
    [{ id: 'dev-containers', label: 'Dev Containers' }],
  )
})
