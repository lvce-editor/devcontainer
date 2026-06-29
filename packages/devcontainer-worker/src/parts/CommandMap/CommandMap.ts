import * as DevContainer from '../DevContainer/DevContainer.ts'
import * as DevContainerCommandType from '../DevContainerCommandType/DevContainerCommandType.ts'
import * as HandleElectronMessagePort from '../HandleElectronMessagePort/HandleElectronMessagePort.ts'
import * as HandleNodeMessagePort from '../HandleNodeMessagePort/HandleNodeMessagePort.ts'
import * as HandleWebSocket from '../HandleWebSocket/HandleWebSocket.ts'

export const commandMap = {
  [DevContainerCommandType.DevContainerDetect]: DevContainer.detect,
  [DevContainerCommandType.DevContainerExec]: DevContainer.exec,
  [DevContainerCommandType.DevContainerGetState]: DevContainer.getState,
  [DevContainerCommandType.DevContainerReadConfiguration]:
    DevContainer.readConfiguration,
  [DevContainerCommandType.DevContainerRemove]: DevContainer.remove,
  [DevContainerCommandType.DevContainerStop]: DevContainer.stop,
  [DevContainerCommandType.DevContainerUp]: DevContainer.up,
  [DevContainerCommandType.HandleElectronMessagePort]:
    HandleElectronMessagePort.handleElectronMessagePort,
  [DevContainerCommandType.HandleNodeMessagePort]:
    HandleNodeMessagePort.handleNodeMessagePort,
  [DevContainerCommandType.HandleWebSocket]: HandleWebSocket.handleWebSocket,
}
