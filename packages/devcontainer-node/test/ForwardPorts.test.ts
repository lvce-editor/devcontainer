import type { Server, Socket } from 'node:net'
import { afterEach, expect, jest, test } from '@jest/globals'
import { spawn as realSpawn } from 'node:child_process'
import { connect, createServer } from 'node:net'

const children: ReturnType<typeof realSpawn>[] = []
let probeResult = { exitCode: 0, stderr: '', stdout: '/usr/bin/node\n' }
const probe = jest.fn(async () => probeResult)
const spawn = jest.fn((_command: string, args: readonly string[]) => {
  const index = args.indexOf('-e')
  const child = realSpawn(process.execPath, args.slice(index), {
    stdio: 'pipe',
  })
  children.push(child)
  return child
})
const { createForwardPorts } =
  await import('../src/parts/ForwardPorts/ForwardPorts.ts')
const ForwardPorts = createForwardPorts({ runProcess: probe, spawn })
const servers: Server[] = []
const sockets: Socket[] = []

const listen = async (server: Server): Promise<number> => {
  servers.push(server)
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  if (!address || typeof address !== 'object')
    throw new Error('Missing server address')
  return address.port
}
const freePort = async (): Promise<number> => {
  const server = createServer()
  const port = await listen(server)
  await new Promise<void>((resolve) => server.close(() => resolve()))
  return port
}
const read = async (port: number, content: Buffer): Promise<Buffer> => {
  const socket = connect(port, '127.0.0.1')
  sockets.push(socket)
  const chunks: Buffer[] = []
  return new Promise((resolve, reject) => {
    socket.once('error', reject)
    socket.on('data', (chunk) => {
      chunks.push(chunk)
    })
    socket.once('end', () => resolve(Buffer.concat(chunks)))
    socket.end(content)
  })
}

afterEach(async () => {
  await ForwardPorts.remove('one')
  await ForwardPorts.remove('two')
  ForwardPorts.dispose()
  for (const socket of sockets.splice(0)) socket.destroy()
  for (const child of children.splice(0)) {
    if (!(child.exitCode === null && child.signalCode === null)) {
      continue
    }

    const closed = new Promise((resolve) => child.once('close', resolve))
    child.kill()
    await closed
  }
  for (const server of servers.splice(0))
    await new Promise<void>((resolve) => server.close(() => resolve()))
  probeResult = { exitCode: 0, stderr: '', stdout: '/usr/bin/node\n' }
  jest.clearAllMocks()
})

test('no configuration does not launch any container commands', async () => {
  await ForwardPorts.ensure({ containerId: 'one' })
  expect(probe).not.toHaveBeenCalled()
  expect(spawn).not.toHaveBeenCalled()
})

test('reports invalid ports and conflicting destinations', async () => {
  for (const forwardPorts of [
    [0],
    [65_536],
    ['3000'],
    [1.5],
    {},
    ['db:3000', 3000],
  ]) {
    await expect(
      ForwardPorts.ensure({ containerId: 'one', forwardPorts }),
    ).rejects.toThrow(/forwardPorts/)
  }
})

test('relays binary data after a client half-close and reuses concurrent starts', async () => {
  const target = await listen(
    createServer({ allowHalfOpen: true }, (socket) => {
      sockets.push(socket)
      const chunks: Buffer[] = []
      socket.on('data', (chunk) => {
        chunks.push(chunk)
      })
      socket.on('end', () => socket.end(Buffer.concat(chunks)))
    }),
  )
  const port = await freePort()
  // Route the real relay to the test service, retaining the production listener.
  spawn.mockImplementationOnce((_command, args) => {
    const index = args.indexOf('-e')
    const relayArgs = args.slice(index)
    relayArgs[relayArgs.length - 1] = String(target)
    const child = realSpawn(process.execPath, relayArgs, { stdio: 'pipe' })
    children.push(child)
    return child
  })
  const options = {
    containerCli: 'podman',
    containerId: 'one',
    forwardPorts: [port, port],
    remoteUser: 'node',
  }
  await Promise.all([
    ForwardPorts.ensure(options),
    ForwardPorts.ensure(options),
  ])
  expect(probe).toHaveBeenCalledTimes(1)
  const payload = Buffer.alloc(1024 * 1024, 0x80)
  expect(await read(port, payload)).toEqual(payload)
  expect(spawn.mock.calls[0].slice(0, 2)).toEqual([
    'podman',
    expect.arrayContaining(['--user', 'node', 'one']),
  ])
  await ForwardPorts.remove('one')
  await expect(read(port, Buffer.from('closed'))).rejects.toThrow()
  await ForwardPorts.ensure(options)
  await ForwardPorts.remove('one')
})

test('host conflicts roll back all newly opened listeners and preserve the other owner', async () => {
  const occupied = await listen(
    createServer((socket) => {
      sockets.push(socket)
      socket.end('owner')
    }),
  )
  const first = await freePort()
  await expect(
    ForwardPorts.ensure({
      containerId: 'one',
      forwardPorts: [first, occupied],
    }),
  ).rejects.toThrow(/Free this host port/)
  await expect(read(first, Buffer.from('closed'))).rejects.toThrow()
  const response = await read(occupied, Buffer.from('test'))
  expect(response.toString()).toBe('owner')
})

test('reports a missing relay before opening any listeners', async () => {
  probeResult = { exitCode: 127, stderr: 'not found', stdout: '' }
  await expect(
    ForwardPorts.ensure({
      containerId: 'one',
      forwardPorts: [await freePort()],
    }),
  ).rejects.toThrow(/install socat, Node.js or Python 3/)
})

test('disposing an active connection releases its listener and engine process', async () => {
  const port = await freePort()
  spawn.mockImplementationOnce(() => {
    const child = realSpawn(
      process.execPath,
      ['-e', 'process.stdin.resume()'],
      { stdio: 'pipe' },
    )
    children.push(child)
    return child
  })
  await ForwardPorts.ensure({ containerId: 'one', forwardPorts: [port] })
  const socket = connect(port, '127.0.0.1')
  sockets.push(socket)
  await new Promise<void>((resolve) => socket.once('connect', resolve))
  const closed = new Promise((resolve) => socket.once('close', resolve))
  ForwardPorts.dispose()
  await closed
  await expect(read(port, Buffer.from('closed'))).rejects.toThrow()
  await ForwardPorts.ensure({ containerId: 'one', forwardPorts: [port] })
})

test('replacing a workspace container closes its previous listener', async () => {
  const first = await freePort()
  const second = await freePort()
  await ForwardPorts.ensure({
    containerId: 'one',
    forwardPorts: [first],
    workspaceFolder: '/workspace',
  })
  await ForwardPorts.ensure({
    containerId: 'two',
    forwardPorts: [second],
    workspaceFolder: '/workspace',
  })
  await expect(read(first, Buffer.from('closed'))).rejects.toThrow()
  await ForwardPorts.remove('two')
  await expect(read(second, Buffer.from('closed'))).rejects.toThrow()
})
