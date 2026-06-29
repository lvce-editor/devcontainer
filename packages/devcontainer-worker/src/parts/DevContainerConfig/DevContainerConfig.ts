import { stat } from 'node:fs/promises'
import { join } from 'node:path'

export interface DetectResult {
  configPath: string | undefined
  found: boolean
  workspaceFolder: string
}

const exists = async (path: string) => {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

export const getConfigCandidates = (workspaceFolder: string) => {
  return [
    join(workspaceFolder, '.devcontainer', 'devcontainer.json'),
    join(workspaceFolder, '.devcontainer.json'),
  ]
}

export const detect = async ({
  workspaceFolder,
}: {
  workspaceFolder: string
}): Promise<DetectResult> => {
  for (const configPath of getConfigCandidates(workspaceFolder)) {
    if (await exists(configPath)) {
      return {
        configPath,
        found: true,
        workspaceFolder,
      }
    }
  }
  return {
    configPath: undefined,
    found: false,
    workspaceFolder,
  }
}
