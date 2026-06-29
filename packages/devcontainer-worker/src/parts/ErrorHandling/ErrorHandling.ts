import * as Character from '../Character/Character.ts'
import * as ExitCode from '../ExitCode/ExitCode.ts'
import * as GetNewLineIndex from '../GetNewLineIndex/GetNewLineIndex.ts'
import * as IsIgnoredError from '../IsIgnoredError/IsIgnoredError.ts'
import * as Logger from '../Logger/Logger.ts'
import * as PrettyError from '../PrettyError/PrettyError.ts'
import * as Process from '../Process/Process.ts'

const firstErrorLine = (error) => {
  if (error.stack) {
    return error.stack.slice(0, GetNewLineIndex.getNewLineIndex(error.stack))
  }
  if (error.message) {
    return error.message
  }
  return String(error)
}

export const handleUncaughtExceptionMonitor = (error: any): void => {
  Logger.info(`[pty host] uncaught exception: ${firstErrorLine(error)}`)
  if (IsIgnoredError.isIgnoredError(error)) {
    return
  }
  const prettyError = PrettyError.prepare(error)
  Logger.error(
    // @ts-ignore
    prettyError.codeFrame +
      Character.NewLine +
      prettyError.stack +
      Character.NewLine,
  )
  Process.setExitCode(ExitCode.Error)
}
