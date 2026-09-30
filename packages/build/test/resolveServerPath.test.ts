import assert from 'node:assert/strict'
import { access } from 'node:fs/promises'
import { basename } from 'node:path'
import { test } from 'node:test'
import { resolveServerPath } from '../src/resolveServerPath.ts'

test('resolves the development server from its owning workspace', async () => {
  const serverPath = resolveServerPath()
  assert.equal(basename(serverPath), 'server.js')
  await access(serverPath)
})
