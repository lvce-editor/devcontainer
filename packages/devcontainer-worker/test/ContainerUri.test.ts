import { expect, test } from '@jest/globals'
import * as ContainerUri from '../src/parts/ContainerUri/ContainerUri.ts'

test('creates readable workspace URIs and preserves paths inside the container', () => {
  const uri = ContainerUri.create('/home/simon/Projects/my project!')

  expect(uri).toBe('devcontainers:///home/simon/Projects/my%20project%21!')
  expect(ContainerUri.parse(uri)).toEqual({
    id: 'workspace:/home/simon/Projects/my project!',
    path: '',
    workspaceFolder: '/home/simon/Projects/my project!',
  })
  expect(ContainerUri.parse(`${uri}/src/a%20b.ts`)).toEqual({
    id: 'workspace:/home/simon/Projects/my project!',
    path: 'src/a b.ts',
    workspaceFolder: '/home/simon/Projects/my project!',
  })
})

test('continues to parse saved container-id URIs', () => {
  expect(ContainerUri.parse('devcontainers:///abc123/src/a%20b.ts')).toEqual({
    id: 'abc123',
    path: 'src/a b.ts',
  })
})
