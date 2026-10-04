import { expect, jest, test } from '@jest/globals'
import * as Session from '../src/parts/ContainerTerminalSession/ContainerTerminalSession.ts'

test('disposal retains its owned container and user and is idempotent', async () => {
  const execute = jest.fn(async (_session: unknown, _script: string) => {})
  const manager = Session.createSessionManager(execute)
  const first = await manager.create(
    'first-container',
    '/custom/podman',
    'node',
  )
  const other = await manager.create('other-container', 'docker')
  execute.mockClear()
  await manager.dispose(first.token)
  expect(execute).toHaveBeenCalledWith(first, Session.cleanupScript)
  expect(first).toMatchObject({
    containerCli: '/custom/podman',
    containerId: 'first-container',
    remoteUser: 'node',
  })
  await manager.dispose(first.token)
  expect(execute).toHaveBeenCalledTimes(1)
  await manager.dispose(other.token)
  expect(execute).toHaveBeenCalledTimes(2)
})

test('concurrent disposal waits for the same cleanup operation', async () => {
  const execute = jest.fn(async (_session: unknown, _script: string) => {})
  const manager = Session.createSessionManager(execute)
  const session = await manager.create('container', 'docker')
  execute.mockClear()
  const gate = Promise.withResolvers<void>()
  execute.mockImplementationOnce(() => gate.promise)
  const first = manager.dispose(session.token)
  const second = manager.dispose(session.token)
  expect(second).toBe(first)
  expect(execute).toHaveBeenCalledTimes(1)
  gate.resolve()
  await first
})
