import * as ErrorCodes from '../ErrorCodes/ErrorCodes.ts'
import * as Process from '../Process/Process.ts'

export const isIgnoredError = (error) => {
  return Boolean(
    error &&
      ((error.code === ErrorCodes.EPIPE && !process.connected) ||
        (error.code === ErrorCodes.ERR_IPC_CHANNEL_CLOSED &&
          !Process.isConnected())),
  )
}
