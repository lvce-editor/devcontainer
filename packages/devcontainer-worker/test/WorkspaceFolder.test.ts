import { expect, test } from '@jest/globals'
import { pathToFileURL } from 'node:url'
import * as WorkspaceFolder from '../src/parts/WorkspaceFolder/WorkspaceFolder.js'

test('toPath - file uri', () => {
  expect(WorkspaceFolder.toPath(pathToFileURL('/workspace/sample').href)).toBe(
    '/workspace/sample',
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
