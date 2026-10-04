import { expect, test } from '@jest/globals'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as ContainerUri from '../src/parts/ContainerUri/ContainerUri.ts'

test('creates readable workspace URIs and preserves paths inside the container', () => {
  const workspaceFolder = join(tmpdir(), 'my project!')
  const uri = ContainerUri.create(workspaceFolder)

  expect(uri).toContain('my%20project%21!')
  expect(uri).toMatch(/^devcontainers:\/\//)
  expect(ContainerUri.parse(uri)).toEqual({
    id: `workspace:${workspaceFolder}`,
    path: '',
    workspaceFolder,
  })
  expect(ContainerUri.parse(`${uri}/src/a%20b.ts`)).toEqual({
    id: `workspace:${workspaceFolder}`,
    path: 'src/a b.ts',
    workspaceFolder,
  })
})

test('continues to parse saved container-id URIs', () => {
  expect(ContainerUri.parse('devcontainers:///abc123/src/a%20b.ts')).toEqual({
    id: 'abc123',
    path: 'src/a b.ts',
  })
})
