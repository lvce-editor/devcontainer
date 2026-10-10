/* eslint-disable unicorn/no-top-level-side-effects */
import {
  activate as activateExtensionApi,
  registerFileSystemProvider,
} from '@lvce-editor/api'
import * as BuildError from './parts/BuildError/BuildError.ts'
import { fileSystem } from './parts/FileSystem/FileSystem.ts'
import * as Progress from './parts/Progress/Progress.ts'
import * as RegisterCommands from './parts/RegisterCommands/RegisterCommands.ts'

const state = {
  isActivated: false,
}

export const activate = async (): Promise<void> => {
  if (state.isActivated) {
    return
  }
  state.isActivated = true
  await activateExtensionApi()
  Progress.registerWorkspaceProgress()
  registerFileSystemProvider(fileSystem)
  registerFileSystemProvider(BuildError.fileSystem)
  RegisterCommands.registerCommands()
}

export const deactivate = (): void => {
  void Progress.deactivateWorkspaceProgress()
}

await activate()
