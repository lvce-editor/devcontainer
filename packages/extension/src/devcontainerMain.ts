/* eslint-disable unicorn/no-top-level-side-effects */
import {
  activate as activateExtensionApi,
  registerFileSystemProvider,
} from '@lvce-editor/api'
import { fileSystem } from './parts/FileSystem/FileSystem.ts'
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
  registerFileSystemProvider(fileSystem)
  RegisterCommands.registerCommands()
}

export const deactivate = (): void => {}

await activate()
