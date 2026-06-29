import { NodeWebSocketRpcClient } from '@lvce-editor/rpc'
import * as Assert from '../Assert/Assert.ts'
import * as RequiresSocket from '../RequiresSocket/RequiresSocket.ts'

export const handleWebSocket = async (handle, request) => {
  Assert.object(handle)
  Assert.object(request)
  await NodeWebSocketRpcClient.create({
    commandMap: {},
    handle,
    request,
    requiresSocket: RequiresSocket.requiresSocket,
  })
}
