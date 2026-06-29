import * as DevContainerCli from '../DevContainerCli/DevContainerCli.ts'
import * as HandleElectronMessagePort from '../HandleElectronMessagePort/HandleElectronMessagePort.ts'
import * as HandleNodeMessagePort from '../HandleNodeMessagePort/HandleNodeMessagePort.ts'
import * as HandleWebSocket from '../HandleWebSocket/HandleWebSocket.ts'
import * as DevContainerCommandType from '../DevContainerCommandType/DevContainerCommandType.ts'

export const commandMap = {
  [DevContainerCommandType.HandleElectronMessagePort]:
    HandleElectronMessagePort.handleElectronMessagePort,
  [DevContainerCommandType.HandleNodeMessagePort]:
    HandleNodeMessagePort.handleNodeMessagePort,
  [DevContainerCommandType.HandleWebSocket]: HandleWebSocket.handleWebSocket,
  [DevContainerCommandType.DevContainerNodeCliReadConfiguration]:
    DevContainerCli.cliReadConfiguration,
  [DevContainerCommandType.DevContainerNodeCliUp]: DevContainerCli.cliUp,
  [DevContainerCommandType.DevContainerNodeCliExec]: DevContainerCli.cliExec,
  [DevContainerCommandType.DevContainerNodeDockerStopContainer]:
    DevContainerCli.dockerStopContainer,
  [DevContainerCommandType.DevContainerNodeDockerRemoveContainer]:
    DevContainerCli.dockerRemoveContainer,
}
