import { ElectronMessagePortRpcClient } from '@lvce-editor/rpc'
import * as Assert from '../Assert/Assert.ts'
import * as RequiresSocket from '../RequiresSocket/RequiresSocket.ts'

export const handleElectronMessagePort = async (messagePort) => {
  Assert.object(messagePort)
  await ElectronMessagePortRpcClient.create({
    commandMap: {},
    messagePort,
    requiresSocket: RequiresSocket.requiresSocket,
  })
}
