import * as Progress from './parts/Progress/Progress.ts'
import * as DevContainerCli from '@lvce-editor/devcontainer-node/devcontainer-cli'
import * as ContainerFileSystem from './parts/ContainerFileSystem/ContainerFileSystem.ts'
import * as DevContainer from './parts/DevContainer/DevContainer.ts'
import * as DevContainerCommandType from './parts/DevContainerCommandType/DevContainerCommandType.ts'
import * as DevContainerNodeClient from './parts/DevContainerNodeClient/DevContainerNodeClient.ts'

const initialize = () => {
  DevContainerNodeClient.setNodeApi(DevContainerCli)
}

const detect = (options: Parameters<typeof DevContainer.detect>[0]) => {
  initialize()
  return DevContainer.detect(options)
}

const exec = (options: Parameters<typeof DevContainer.exec>[0]) => {
  initialize()
  return DevContainer.exec(options)
}

const getState = (options: Parameters<typeof DevContainer.getState>[0]) => {
  initialize()
  return DevContainer.getState(options)
}

const readConfiguration = (
  options: Parameters<typeof DevContainer.readConfiguration>[0],
) => {
  initialize()
  return DevContainer.readConfiguration(options)
}

const remove = (options: Parameters<typeof DevContainer.remove>[0]) => {
  initialize()
  return DevContainer.remove(options)
}

const stop = (options: Parameters<typeof DevContainer.stop>[0]) => {
  initialize()
  return DevContainer.stop(options)
}

const up = (
  options: Parameters<typeof DevContainer.up>[0] & { progressId?: string },
) => {
  initialize()
  return Progress.run(options.progressId || '', (onOutput) =>
    DevContainer.up({ ...options, onOutput }),
  )
}

const openWorkspace = (
  options: Parameters<typeof DevContainer.openWorkspace>[0] & {
    progressId?: string
  },
) => {
  initialize()
  return Progress.run(options.progressId || '', (onOutput) =>
    DevContainer.openWorkspace({ ...options, onOutput }),
  )
}

const fileSystem = (...args: Parameters<typeof ContainerFileSystem.invoke>) => {
  initialize()
  return ContainerFileSystem.invoke(...args)
}

export const commandMap = {
  'DevContainer.getProgress': Progress.getProgress,
  [DevContainerCommandType.DevContainerDetect]: detect,
  [DevContainerCommandType.DevContainerExec]: exec,
  [DevContainerCommandType.DevContainerFileSystem]: fileSystem,
  [DevContainerCommandType.DevContainerGetState]: getState,
  [DevContainerCommandType.DevContainerOpenWorkspace]: openWorkspace,
  [DevContainerCommandType.DevContainerReadConfiguration]: readConfiguration,
  [DevContainerCommandType.DevContainerRemove]: remove,
  [DevContainerCommandType.DevContainerSetDockerPath]:
    DevContainerCli.setDockerPath,
  [DevContainerCommandType.DevContainerStop]: stop,
  [DevContainerCommandType.DevContainerUp]: up,
}
