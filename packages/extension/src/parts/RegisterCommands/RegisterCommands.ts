import { registerCommand } from '@lvce-editor/api'
import * as BuildError from '../BuildError/BuildError.ts'
import * as DevContainerCommands from '../DevContainerCommands/DevContainerCommands.ts'

const commands = [
  { execute: BuildError.showLogs, id: 'devcontainer.showLogs' },
  {
    execute: DevContainerCommands.installDocker,
    id: 'devcontainer.installDocker',
  },
  {
    execute: DevContainerCommands.setDockerPath,
    id: 'devcontainer.setDockerPath',
  },
  {
    execute: DevContainerCommands.openWorkspace,
    id: 'devcontainer.openWorkspace',
  },
  {
    execute: DevContainerCommands.start,
    id: 'devcontainer.start',
  },
  {
    execute: DevContainerCommands.stop,
    id: 'devcontainer.stop',
  },
  {
    execute: DevContainerCommands.getState,
    id: 'devcontainer.getState',
  },
  {
    execute: DevContainerCommands.exec,
    id: 'devcontainer.exec',
  },
  {
    execute: DevContainerCommands.remove,
    id: 'devcontainer.remove',
  },
]

export const registerCommands = () => {
  for (const command of commands) {
    registerCommand(command)
  }
}
