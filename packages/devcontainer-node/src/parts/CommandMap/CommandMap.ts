import * as ExecuteShellCommand from '../ExecuteShellCommand/ExecuteShellCommand.ts'
import * as HandleElectronMessagePort from '../HandleElectronMessagePort/HandleElectronMessagePort.ts'
import * as HandleNodeMessagePort from '../HandleNodeMessagePort/HandleNodeMessagePort.ts'
import * as HandleWebSocket from '../HandleWebSocket/HandleWebSocket.ts'
import * as PtyController from '../PtyController/PtyController.ts'
import * as TerminalProcessCommandType from '../TerminalProcessCommandType/TerminalProcessCommandType.ts'

export const commandMap = {
  [TerminalProcessCommandType.HandleElectronMessagePort]:
    HandleElectronMessagePort.handleElectronMessagePort,
  [TerminalProcessCommandType.HandleNodeMessagePort]:
    HandleNodeMessagePort.handleNodeMessagePort,
  [TerminalProcessCommandType.HandleWebSocket]: HandleWebSocket.handleWebSocket,
  [TerminalProcessCommandType.TerminalCreate]: PtyController.create,
  [TerminalProcessCommandType.TerminalDispose]: PtyController.dispose,
  [TerminalProcessCommandType.TerminalExecuteShellCommand]:
    ExecuteShellCommand.executeShellCommand,
  [TerminalProcessCommandType.TerminalResize]: PtyController.resize,
  [TerminalProcessCommandType.TerminalWrite]: PtyController.write,
}
