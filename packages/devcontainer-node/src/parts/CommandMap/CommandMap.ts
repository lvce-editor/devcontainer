import * as DevContainerCli from '../DevContainerCli/DevContainerCli.ts'
import * as DevContainerCommandType from '../DevContainerCommandType/DevContainerCommandType.ts'
import * as HandleElectronMessagePort from '../HandleElectronMessagePort/HandleElectronMessagePort.ts'
import * as HandleNodeMessagePort from '../HandleNodeMessagePort/HandleNodeMessagePort.ts'
import * as HandleWebSocket from '../HandleWebSocket/HandleWebSocket.ts'

export const commandMap = {
  [DevContainerCommandType.DevContainerNodeCliExec]: DevContainerCli.cliExec,
  [DevContainerCommandType.DevContainerNodeCliReadConfiguration]:
    DevContainerCli.cliReadConfiguration,
  [DevContainerCommandType.DevContainerNodeCliUp]: DevContainerCli.cliUp,
  [DevContainerCommandType.DevContainerNodeDockerRemoveContainer]:
    DevContainerCli.dockerRemoveContainer,
  [DevContainerCommandType.DevContainerNodeDockerStopContainer]:
    DevContainerCli.dockerStopContainer,
  [DevContainerCommandType.HandleElectronMessagePort]:
    HandleElectronMessagePort.handleElectronMessagePort,
  [DevContainerCommandType.HandleNodeMessagePort]:
    HandleNodeMessagePort.handleNodeMessagePort,
  [DevContainerCommandType.HandleWebSocket]: HandleWebSocket.handleWebSocket,
}
