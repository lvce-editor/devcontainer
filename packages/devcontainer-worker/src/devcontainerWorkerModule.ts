import * as DevContainerCli from '@lvce-editor/devcontainer-node/devcontainer-cli'
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

const up = (options: Parameters<typeof DevContainer.up>[0]) => {
  initialize()
  return DevContainer.up(options)
}

export const commandMap = {
  [DevContainerCommandType.DevContainerDetect]: detect,
  [DevContainerCommandType.DevContainerExec]: exec,
  [DevContainerCommandType.DevContainerGetState]: getState,
  [DevContainerCommandType.DevContainerReadConfiguration]: readConfiguration,
  [DevContainerCommandType.DevContainerRemove]: remove,
  [DevContainerCommandType.DevContainerStop]: stop,
  [DevContainerCommandType.DevContainerUp]: up,
}
