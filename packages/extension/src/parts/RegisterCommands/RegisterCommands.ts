import * as DevContainerCommands from '../DevContainerCommands/DevContainerCommands.ts'

const commands = [
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
    // @ts-ignore
    vscode.registerCommand(command)
  }
}
