import type { Rpc } from '@lvce-editor/rpc'
import type { Duplex } from 'node:stream'
import {
  NodeForkedProcessRpcParent,
  WebSocketRpcParent,
} from '@lvce-editor/rpc'
import assert from 'node:assert/strict'
import { cp, mkdtemp, rm } from 'node:fs/promises'
import { createServer } from 'node:http'
import { createServer as createTcpServer } from 'node:net'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { dockerRemoveContainer } from '../src/parts/DevContainerCli/DevContainerCli.ts'

const connectProcess = async (directory: string) => {
  const path = fileURLToPath(
    new URL('../../../.tmp/dist/dist/devcontainerProcess.js', import.meta.url),
  )
  const control = await NodeForkedProcessRpcParent.create({
    commandMap: {},
    env: {
      ...process.env,
      LVCE_DEVCONTAINER_CONNECTIONS_DIR: join(directory, 'connections'),
    },
    path,
  })
  const server = createServer()
  const sockets = new Set<Duplex>()
  let rpc: Rpc | undefined
  const dispose = async (): Promise<void> => {
    await rpc?.dispose()
    await control.dispose()
    for (const socket of sockets) socket.destroy()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
  try {
    const attached = Promise.withResolvers<void>()
    server.on('upgrade', (request, socket) => {
      sockets.add(socket)
      socket.once('close', () => sockets.delete(socket))
      socket.pause()
      void control
        .invokeAndTransfer('NodeRpcProcess.handleWebSocket', socket, {
          headers: request.headers,
          method: request.method,
          url: request.url,
        })
        .then(() => attached.resolve(), attached.reject)
    })
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address()
    assert.ok(address && typeof address === 'object')
    const webSocket = new WebSocket(`ws://127.0.0.1:${address.port}`)
    rpc = await WebSocketRpcParent.create({ commandMap: {}, webSocket })
    await attached.promise
    return { dispose, rpc }
  } catch (error) {
    await dispose()
    throw error
  }
}

const poll = async (check: () => Promise<void>): Promise<void> => {
  const deadline = Date.now() + 30_000
  let lastError: unknown
  while (Date.now() < deadline) {
    try {
      await check()
      return
    } catch (error) {
      lastError = error
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }
  throw lastError
}

const shouldRespond = (): Promise<void> =>
  poll(async () => {
    const response = await fetch('http://127.0.0.1:3000/', {
      signal: AbortSignal.timeout(2000),
    })
    assert.equal(response.status, 200)
    assert.equal(
      await response.text(),
      'devcontainer forwardPorts acceptance\n',
    )
  })

const shouldReleasePort = (): Promise<void> =>
  poll(async () => {
    const server = createTcpServer()
    try {
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject)
        server.listen(3000, '127.0.0.1', resolve)
      })
    } finally {
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })

for (const fixture of ['forward-ports', 'forward-ports-python']) {
  await test(
    `${fixture}: forwardPorts exposes container localhost and cleans up across reopen, stop, remove and disconnect`,
    { timeout: 180_000 },
    async () => {
      const directory = await mkdtemp(
        join(tmpdir(), 'devcontainer-forward-ports-'),
      )
      const workspaceFolder = join(directory, 'workspace')
      await cp(
        new URL(`../../e2e/fixtures/${fixture}/`, import.meta.url),
        workspaceFolder,
        { recursive: true },
      )
      let connection: Awaited<ReturnType<typeof connectProcess>> | undefined
      let containerId: string | undefined
      try {
        await shouldReleasePort()
        connection = await connectProcess(directory)
        const opened = await connection.rpc.invoke(
          'DevContainer.openWorkspace',
          {
            workspaceFolder,
          },
        )
        assert.equal(opened.ok, true, JSON.stringify(opened))
        const state = await connection.rpc.invoke('DevContainer.getState', {
          workspaceFolder,
        })
        ;({ containerId } = state)
        assert.deepEqual(state.forwardPorts, [3000])
        await shouldRespond()
        const reopened = await connection.rpc.invoke(
          'DevContainer.openWorkspace',
          { workspaceFolder: opened.workspaceUri },
        )
        assert.equal(reopened.ok, true, JSON.stringify(reopened))
        await shouldRespond()

        await connection.dispose()
        connection = undefined
        await shouldReleasePort()
        connection = await connectProcess(directory)
        const restored = await connection.rpc.invoke('DevContainer.getState', {
          workspaceFolder: opened.workspaceUri,
        })
        assert.equal(restored.status, 'running')
        await shouldRespond()
        const stopped = await connection.rpc.invoke('DevContainer.stop', {
          workspaceFolder: opened.workspaceUri,
        })
        assert.equal(stopped.ok, true, JSON.stringify(stopped))
        await shouldReleasePort()
        const restarted = await connection.rpc.invoke(
          'DevContainer.openWorkspace',
          { workspaceFolder },
        )
        assert.equal(restarted.ok, true, JSON.stringify(restarted))
        const restartedState = await connection.rpc.invoke(
          'DevContainer.getState',
          { workspaceFolder },
        )
        ;({ containerId } = restartedState)
        await shouldRespond()
        const removed = await connection.rpc.invoke('DevContainer.remove', {
          workspaceFolder: restarted.workspaceUri,
        })
        assert.equal(removed.ok, true, JSON.stringify(removed))
        await shouldReleasePort()
      } finally {
        try {
          if (connection) {
            // Cleanup also works when startup reports a forwarding error.
            const state = await connection.rpc.invoke('DevContainer.getState', {
              workspaceFolder,
            })
            const { containerId: currentId } = state
            containerId = currentId ?? containerId
          }
          if (containerId) {
            const removed = await dockerRemoveContainer({ containerId })
            assert.ok(
              removed.ok || removed.stderr?.includes('No such container'),
              JSON.stringify(removed),
            )
          }
        } finally {
          await connection?.dispose()
          await rm(directory, { force: true, recursive: true })
        }
      }
    },
  )
}
