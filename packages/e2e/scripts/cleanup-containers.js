import { execFile } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

export const cleanupContainers = async (workspacesPath) => {
  let workspaces
  try {
    workspaces = await readdir(workspacesPath, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') {
      return
    }
    throw error
  }
  // Include containers left by a failed startup before an id reached extension state.
  // Restrict every Docker operation to copied workspaces owned by this checkout.
  for (const workspace of workspaces) {
    if (!workspace.isDirectory()) {
      continue
    }
    let stdout
    try {
      ;({ stdout } = await execFileAsync('docker', [
        'ps',
        '-aq',
        '--filter',
        `label=devcontainer.local_folder=${join(workspacesPath, workspace.name)}`,
      ]))
    } catch (error) {
      if (error.code === 'ENOENT') {
        return
      }
      throw error
    }
    for (const containerId of stdout.trim().split('\n').filter(Boolean)) {
      await execFileAsync('docker', ['rm', '-f', containerId])
    }
  }
}
