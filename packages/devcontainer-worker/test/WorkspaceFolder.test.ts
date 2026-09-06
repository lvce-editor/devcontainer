import { expect, test } from '@jest/globals'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import * as WorkspaceFolder from '../src/parts/WorkspaceFolder/WorkspaceFolder.js'

test('toPath - file uri', async () => {
  const workspacePath = resolve('workspace', 'sample')
  expect(await WorkspaceFolder.toPath(pathToFileURL(workspacePath).href)).toBe(
    workspacePath,
  )
})

test('toPath - remote url', async () => {
  expect(
    await WorkspaceFolder.toPath(
      'http://localhost:3000/remote/workspace/sample%20folder',
    ),
  ).toBe('/workspace/sample folder')
})

test('toPath - path', async () => {
  expect(await WorkspaceFolder.toPath('/workspace/sample')).toBe(
    '/workspace/sample',
  )
})
