import { expect, test } from '@jest/globals'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import * as WorkspaceFolder from '../src/parts/WorkspaceFolder/WorkspaceFolder.js'

test('toPath - file uri', () => {
  const workspacePath = resolve('workspace', 'sample')
  expect(WorkspaceFolder.toPath(pathToFileURL(workspacePath).href)).toBe(
    workspacePath,
  )
})

test('toPath - remote url', () => {
  expect(
    WorkspaceFolder.toPath(
      'http://localhost:3000/remote/workspace/sample%20folder',
    ),
  ).toBe('/workspace/sample folder')
})

test('toPath - path', () => {
  expect(WorkspaceFolder.toPath('/workspace/sample')).toBe('/workspace/sample')
})
