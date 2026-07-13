import * as ExtensionInfo from './parts/ExtensionInfo/ExtensionInfo.ts'
import * as RegisterCommands from './parts/RegisterCommands/RegisterCommands.ts'

export const activate = ({ path }: { path: string }) => {
  ExtensionInfo.setPath(path)
  RegisterCommands.registerCommands()
}
