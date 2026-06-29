import * as DevContainer from '../DevContainer/DevContainer.ts'
import * as DevContainerCommandType from '../DevContainerCommandType/DevContainerCommandType.ts'
import * as HandleElectronMessagePort from '../HandleElectronMessagePort/HandleElectronMessagePort.ts'
import * as HandleNodeMessagePort from '../HandleNodeMessagePort/HandleNodeMessagePort.ts'
import * as HandleWebSocket from '../HandleWebSocket/HandleWebSocket.ts'

export const commandMap = {
  [DevContainerCommandType.HandleElectronMessagePort]:
    HandleElectronMessagePort.handleElectronMessagePort,
  [DevContainerCommandType.HandleNodeMessagePort]:
    HandleNodeMessagePort.handleNodeMessagePort,
  [DevContainerCommandType.HandleWebSocket]: HandleWebSocket.handleWebSocket,
  [DevContainerCommandType.DevContainerDetect]: DevContainer.detect,
  [DevContainerCommandType.DevContainerReadConfiguration]:
    DevContainer.readConfiguration,
  [DevContainerCommandType.DevContainerUp]: DevContainer.up,
  [DevContainerCommandType.DevContainerExec]: DevContainer.exec,
  [DevContainerCommandType.DevContainerStop]: DevContainer.stop,
  [DevContainerCommandType.DevContainerRemove]: DevContainer.remove,
  [DevContainerCommandType.DevContainerGetState]: DevContainer.getState,
}
