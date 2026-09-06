import { createDevContainer } from '../CreateDevContainer/CreateDevContainer.ts'
import * as DevContainerConfig from '../DevContainerConfig/DevContainerConfig.ts'
import * as DevContainerNodeClient from '../DevContainerNodeClient/DevContainerNodeClient.ts'
import * as DevContainerState from '../DevContainerState/DevContainerState.ts'
import * as WorkspaceFolder from '../WorkspaceFolder/WorkspaceFolder.ts'

export const {
  detect,
  exec,
  getState,
  openWorkspace,
  readConfiguration,
  remove,
  stop,
  up,
} = createDevContainer({
  DevContainerConfig,
  DevContainerNodeClient: {
    cliExec: DevContainerNodeClient.cliExec,
    cliReadConfiguration: DevContainerNodeClient.cliReadConfiguration,
    cliUp: DevContainerNodeClient.cliUp,
    containerFileSystem: DevContainerNodeClient.containerFileSystem,
    dockerRemoveContainer: DevContainerNodeClient.dockerRemoveContainer,
    dockerStopContainer: DevContainerNodeClient.dockerStopContainer,
  },
  DevContainerState: {
    forget: DevContainerState.forget,
    get: DevContainerState.get,
    persist: DevContainerState.persist,
    remove: DevContainerState.remove,
    set: DevContainerState.set,
  },
  WorkspaceFolder,
})
