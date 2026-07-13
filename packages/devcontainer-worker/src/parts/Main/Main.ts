import * as DevContainerCli from '@lvce-editor/devcontainer-node/devcontainer-cli'
import * as Command from '../Command/Command.ts'
import * as CommandMap from '../CommandMap/CommandMap.ts'
import * as DevContainerNodeClient from '../DevContainerNodeClient/DevContainerNodeClient.ts'
import * as Listen from '../Listen/Listen.ts'
import * as ProcessListeners from '../ProcessListeners/ProcessListeners.ts'

export const main = async () => {
  process.on(
    'uncaughtExceptionMonitor',
    ProcessListeners.handleUncaughtExceptionMonitor,
  )
  process.on('disconnect', ProcessListeners.handleDisconnect)
  DevContainerNodeClient.setNodeApi(DevContainerCli)
  Command.register(CommandMap.commandMap)
  await Listen.listen()
}
