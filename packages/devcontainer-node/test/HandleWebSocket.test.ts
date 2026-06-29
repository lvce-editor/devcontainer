import { beforeAll, expect, test } from '@jest/globals'
import * as http from 'node:http'
import * as Command from '../src/parts/Command/Command.js'
import * as CommandMap from '../src/parts/CommandMap/CommandMap.js'
import * as HandleWebSocket from '../src/parts/HandleWebSocket/HandleWebSocket.js'

// TODO move this to integration test / e2e test

beforeAll(() => {
  Command.register(CommandMap.commandMap)
})

const getHandleMessage = (request) => {
  return {
    headers: request.headers,
    httpVersionMajor: request.httpVersionMajor,
    httpVersionMinor: request.httpVersionMinor,
    method: request.method,
    path: request.path,
    query: request.query,
    url: request.url,
  }
}

const waitForFirstRequest = async (server) => {
  const { promise, resolve } = Promise.withResolvers<any>()
  let webSocket
  const handleUpgrade = (request) => {
    resolve({
      httpRequest: request,
      webSocket,
    })
  }
  server.on('upgrade', handleUpgrade)
  server.listen(0, () => {
    const { port } = server.address()

    // @ts-ignore
    webSocket = new WebSocket(`ws://localhost:${port}`)
  })
  return promise
}

const waitForWebSocketMessage = async (webSocket: any) => {
  const { promise: responsePromise, resolve } = Promise.withResolvers<any>()
  webSocket.addEventListener('message', resolve, { once: true })
  const nextResponse = await responsePromise
  // @ts-ignore
  const nextResponseString = nextResponse.data.toString()
  const nextResponseValue = JSON.parse(nextResponseString)
  return nextResponseValue
}

const waitForSocketToOpen = async (webSocket: any) => {
  const { promise, reject, resolve } = Promise.withResolvers<void>()

  const handleOpen = () => {
    cleanup()
    resolve()
  }

  const handleError = (error: any) => {
    cleanup()
    reject(error)
  }

  const cleanup = () => {
    webSocket.removeEventListener('open', handleOpen)
    webSocket.removeEventListener('error', handleError)
  }

  webSocket.addEventListener('open', handleOpen)
  webSocket.addEventListener('error', handleError)

  return promise
}

const isNodePtyAvailable = async () => {
  try {
    await import('node-pty')
    return true
  } catch {
    return false
  }
}

test('handleWebsocket', async () => {
  const nodePtyAvailable = await isNodePtyAvailable()
  const server = http.createServer()
  const { httpRequest, webSocket } = await waitForFirstRequest(server)
  const request = getHandleMessage(httpRequest)
  await HandleWebSocket.handleWebSocket(httpRequest.socket, request)
  await waitForSocketToOpen(webSocket)
  const responsePromise = waitForWebSocketMessage(webSocket)

  webSocket.send(
    JSON.stringify({
      id: 1,
      jsonrpc: '2.0',
      method: 'Terminal.create',
      params: [
        2,
        process.cwd(),
        process.execPath,
        ['-e', 'console.log("test")'],
      ],
    }),
  )
  const response = await responsePromise
  if (!nodePtyAvailable) {
    expect(response).toMatchObject({
      error: {
        code: -32_001,
        data: {
          code: 'MODULE_NOT_FOUND',
        },
      },
      id: 1,
      jsonrpc: '2.0',
    })
    // @ts-ignore
    httpRequest.socket.destroy()
    server.close()
    return
  }
  expect(response).toEqual({
    id: 1,
    jsonrpc: '2.0',
    result: null,
  })
  const nextResponse = await waitForWebSocketMessage(webSocket)
  const expectedValue =
    process.platform === 'win32'
      ? expect.anything() // TODO try to fix assertion on windows, it prints test on windows 2022 and 9001h1004h on windows 2025
      : {
          data: [...Buffer.from('test\r\n')],
          type: 'Buffer',
        }
  expect(nextResponse).toEqual({
    jsonrpc: '2.0',
    method: 'Viewlet.send',
    params: [2, 'handleData', expectedValue],
  })
  // @ts-ignore
  httpRequest.socket.destroy()
  server.close()
})

test('handleWebsocket - error - request is not defined', async () => {
  const request = undefined
  const socket = {}
  await expect(
    HandleWebSocket.handleWebSocket(socket, request),
  ).rejects.toThrow(new Error(`expected value to be of type object`))
})

test('handleWebsocket - error - socket is not defined', async () => {
  const request = {}
  const socket = undefined
  await expect(
    HandleWebSocket.handleWebSocket(socket, request),
  ).rejects.toThrow(new Error(`expected value to be of type object`))
})
