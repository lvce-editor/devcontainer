import * as ErrorHandling from '../ErrorHandling/ErrorHandling.ts'
import * as ExitCode from '../ExitCode/ExitCode.ts'
import * as Process from '../Process/Process.ts'

export const handleDisconnect = () => {
  console.info('[pty host] disconnected')
  Process.exit(ExitCode.Success)
}

export const handleUncaughtExceptionMonitor = (error) => {
  // @ts-ignore
  ErrorHandling.handleUncaughtExceptionMonitor(error)
}
