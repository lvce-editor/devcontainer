import type { Rpc } from '@lvce-editor/rpc'
import type { Duplex } from 'node:stream'
import { expect, test } from '@jest/globals'
import {
  NodeForkedProcessRpcParent,
  WebSocketRpcParent,
} from '@lvce-editor/rpc'
import { createServer } from 'node:http'
import { fileURLToPath } from 'node:url'

test('starts the packaged Dev Containers process and invokes a representative command', async () => {
  const processPath = fileURLToPath(
    new URL('../../../.tmp/dist/dist/devcontainerProcess.js', import.meta.url),
  )
  const server = createServer()
  const sockets = new Set<Duplex>()
  let controlRpc: Rpc | undefined
  let rpc: Rpc | undefined
  try {
    controlRpc = await NodeForkedProcessRpcParent.create({
      commandMap: {},
      path: processPath,
    })
    const { promise: attached, reject, resolve } = Promise.withResolvers<void>()
    server.on('upgrade', (request, socket) => {
      sockets.add(socket)
      socket.once('close', () => sockets.delete(socket))
      socket.pause()
      const serializableRequest = {
        headers: request.headers,
        method: request.method,
        url: request.url,
      }
      const attach = async (): Promise<void> => {
        try {
          await controlRpc?.invokeAndTransfer(
            'NodeRpcProcess.handleWebSocket',
            socket,
            serializableRequest,
          )
          resolve()
        } catch (error) {
          reject(error)
        }
      }
      void attach()
    })
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject)
      server.listen(0, '127.0.0.1', resolve)
    })
    const address = server.address()
    expect(address && typeof address === 'object').toBe(true)
    if (!address || typeof address !== 'object') {
      throw new Error('Expected the WebSocket server to have an address')
    }
    const webSocket = new WebSocket(`ws://127.0.0.1:${address.port}`)
    rpc = await WebSocketRpcParent.create({ commandMap: {}, webSocket })
    await attached

    const result = await rpc.invoke('DevContainer.getState', {
      workspaceFolder: '/tmp/devcontainer-process-test',
    })

    expect(result).toEqual({ status: 'stopped' })
  } finally {
    await rpc?.dispose()
    await controlRpc?.dispose()
    for (const socket of sockets) {
      socket.destroy()
    }
    server.closeAllConnections()
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
})
