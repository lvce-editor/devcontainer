import * as ExitCode from '../ExitCode/ExitCode.ts'
import * as IsIgnoredError from '../IsIgnoredError/IsIgnoredError.ts'
import * as Logger from '../Logger/Logger.ts'
import * as PrettyError from '../PrettyError/PrettyError.ts'
import * as Process from '../Process/Process.ts'

const firstErrorLine = (error) => {
  if (error.stack) {
    const newLineIndex = error.stack.indexOf('\n')
    if (newLineIndex === -1) {
      return error.stack
    }
    return error.stack.slice(0, newLineIndex)
  }
  if (error.message) {
    return error.message
  }
  return String(error)
}

export const handleUncaughtExceptionMonitor = (error: any): void => {
  Logger.info(
    `[devcontainer-worker] uncaught exception: ${firstErrorLine(error)}`,
  )
  if (IsIgnoredError.isIgnoredError(error)) {
    return
  }
  const prettyError = PrettyError.prepare(error)
  Logger.error(
    // @ts-ignore
    prettyError.codeFrame +
      '\n' +
      prettyError.stack +
      '\n',
  )
  Process.setExitCode(ExitCode.Error)
}
