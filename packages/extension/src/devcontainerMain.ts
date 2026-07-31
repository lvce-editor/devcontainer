/* eslint-disable unicorn/no-top-level-side-effects */
import { activate as activateExtensionApi } from '@lvce-editor/api'
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
  RegisterCommands.registerCommands()
}

export const deactivate = (): void => {}

await activate()
