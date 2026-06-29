import * as Assert from '../Assert/Assert.ts'
import * as HandleMessage from '../HandleMessage/HandleMessage.ts'

export const handleIpc = (ipc) => {
  Assert.object(ipc)
  if ('addEventListener' in ipc) {
    ipc.addEventListener('message', HandleMessage.handleMessage)
  } else if ('onmessage' in ipc) {
    // deprecated
    ipc.onmessage = HandleMessage.handleMessage
  } else if ('on' in ipc) {
    // deprecated
    ipc.on('message', HandleMessage.handleMessage)
  }
}
