import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import type { ErrorResult } from '../SerializeError/SerializeError.ts'
import { serializeError } from '../SerializeError/SerializeError.ts'

interface RunProcessSuccess {
  exitCode: number | null
  stderr: string
  stdout: string
}

export type RunProcessResult = RunProcessSuccess | ErrorResult

export interface RunProcessOptions {
  args: readonly string[]
  command: string
  cwd?: string
  input?: string
  onOutput?: (text: string) => void
}

const toPath = (pathOrUri: string | undefined) => {
  if (pathOrUri && pathOrUri.startsWith('file://')) {
    return fileURLToPath(pathOrUri)
  }
  return pathOrUri
}

export const runProcess = async ({
  args,
  command,
  cwd,
  input,
  onOutput,
}: RunProcessOptions): Promise<RunProcessResult> => {
  try {
    const { promise, resolve } = Promise.withResolvers<RunProcessResult>()
    const childProcess = spawn(command, [...args], {
      cwd: toPath(cwd),
    })
    childProcess.stdout.setEncoding('utf8')
    childProcess.stderr.setEncoding('utf8')
    const stdoutChunks: string[] = []
    const stderrChunks: string[] = []

    const handleStdoutData = (chunk: string) => {
      stdoutChunks.push(chunk)
      onOutput?.(chunk)
    }

    const handleStderrData = (chunk: string) => {
      stderrChunks.push(chunk)
      onOutput?.(chunk)
    }

    const cleanup = () => {
      childProcess.stdout.off('data', handleStdoutData)
      childProcess.stderr.off('data', handleStderrData)
      childProcess.off('error', handleError)
      childProcess.off('close', handleClose)
    }

    const resolveWithCleanup = (result: RunProcessResult) => {
      cleanup()
      resolve(result)
    }

    const handleError = (error: unknown) => {
      resolveWithCleanup(serializeError(error))
    }

    const handleClose = (exitCode: number | null) => {
      resolveWithCleanup({
        exitCode,
        stderr: stderrChunks.join(''),
        stdout: stdoutChunks.join(''),
      })
    }

    childProcess.stdin.on('error', (error: NodeJS.ErrnoException) => {
      if (error.code !== 'EPIPE') {
        handleError(error)
      }
    })
    childProcess.stdin.end(input)
    childProcess.stdout.on('data', handleStdoutData)
    childProcess.stderr.on('data', handleStderrData)
    childProcess.on('error', handleError)
    childProcess.on('close', handleClose)

    return await promise
  } catch (error) {
    return serializeError(error)
  }
}
