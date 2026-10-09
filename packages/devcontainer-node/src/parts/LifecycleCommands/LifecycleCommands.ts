import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import { spawn } from 'node:child_process'
import { join } from 'node:path'

interface Operation {
  child: ChildProcessWithoutNullStreams
  containerId: string
  errorMessage?: string
  output: string
  running: boolean
}

const operations = new Map<string, Operation>()
const limit = 1024 * 1024

export const getProgress = (workspaceFolder: string) => {
  const value = operations.get(workspaceFolder)
  return {
    errorMessage: value?.errorMessage,
    output: value?.output ?? '',
    running: value?.running ?? false,
  }
}

const terminate = (value: Operation): void => {
  if (!value.running || !value.child.pid) return
  if (process.platform === 'win32') {
    spawn(
      join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe'),
      ['/pid', String(value.child.pid), '/T', '/F'],
      {
        stdio: 'ignore',
      },
    ).on('error', () => value.child.kill())
  } else {
    try {
      process.kill(-value.child.pid, 'SIGTERM')
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error
    }
  }
}

export const remove = (containerId: string): void => {
  for (const [workspace, value] of operations) {
    if (value.containerId !== containerId) continue
    operations.delete(workspace)
    terminate(value)
  }
}

export const dispose = (): void => {
  for (const value of operations.values()) terminate(value)
  operations.clear()
}

export const start = async (
  workspaceFolder: string,
  containerId: string,
  cliPath: string,
  containerCli: string,
): Promise<void> => {
  const previous = operations.get(workspaceFolder)
  if (previous?.running && previous.containerId === containerId) return
  if (previous) {
    operations.delete(workspaceFolder)
    terminate(previous)
  }
  const child = spawn(
    process.execPath,
    [
      cliPath,
      'run-user-commands',
      '--workspace-folder',
      workspaceFolder,
      '--container-id',
      containerId,
      '--docker-path',
      containerCli,
      '--log-format',
      'text',
    ],
    {
      detached: process.platform !== 'win32',
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    },
  )
  const value: Operation = { child, containerId, output: '', running: true }
  operations.set(workspaceFolder, value)
  const append = (chunk: string) => {
    value.output = (value.output + chunk).slice(-limit)
  }
  child.stdout.setEncoding('utf8')
  child.stderr.setEncoding('utf8')
  child.stdout.on('data', append)
  child.stderr.on('data', append)
  child.stdin.on('error', (error: NodeJS.ErrnoException) => {
    if (error.code !== 'EPIPE') append(String(error))
  })
  child.stdin.end()
  child.on('error', (error) => {
    value.running = false
    value.errorMessage = `Devcontainer lifecycle commands failed: ${error.message}`
    append(value.errorMessage)
  })
  child.once('close', (code, signal) => {
    value.running = false
    if (operations.get(workspaceFolder) !== value) return
    if (code !== 0) {
      const reason = signal ?? `exit code ${code}`
      value.errorMessage = `Devcontainer lifecycle commands failed (${reason}). See Dev Containers output.`
      append(`\n${value.errorMessage}\n`)
    }
  })
  await new Promise<void>((resolve, reject) => {
    child.once('spawn', resolve)
    child.once('error', reject)
  })
}
