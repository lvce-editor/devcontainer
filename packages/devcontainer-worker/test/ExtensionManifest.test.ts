import { expect, test } from '@jest/globals'
import { readFile } from 'node:fs/promises'

test('declares the self-hosted Dev Containers node process', async () => {
  const manifestUrl = new URL('../../extension/extension.json', import.meta.url)
  const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'))

  expect(manifest.rpc).toContainEqual({
    id: 'builtin.devcontainer.node',
    name: 'Dev Containers',
    type: 'node-process',
    url: 'dist/devcontainerProcess.js',
  })
})
