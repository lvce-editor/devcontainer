import * as Callback from '../Callback/Callback.ts'
import * as Command from '../Command/Command.ts'
import * as JsonRpc from '../JsonRpc/JsonRpc.ts'
import * as RequiresSocket from '../RequiresSocket/RequiresSocket.ts'

const preparePrettyError = (error) => {
  return error
}

const logError = () => {
  // PrintPrettyError.printPrettyError(prettyError, `[terminal-process] `)
}

export const handleMessage = (event) => {
  return JsonRpc.handleJsonRpcMessage(
    event.target,
    event.data,
    Command.execute,
    Callback.resolve,
    preparePrettyError,
    logError,
    RequiresSocket.requiresSocket,
  )
}
