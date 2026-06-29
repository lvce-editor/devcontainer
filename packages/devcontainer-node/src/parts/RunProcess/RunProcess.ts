import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import type { ErrorResult } from '../SerializeError/SerializeError.ts'
import { serializeError } from '../SerializeError/SerializeError.ts'

export interface RunProcessSuccess {
  exitCode: number | null
  stderr: string
  stdout: string
}

export type RunProcessResult = RunProcessSuccess | ErrorResult

export interface RunProcessOptions {
  args: readonly string[]
  command: string
  cwd?: string
}

const toPath = (pathOrUri: string | undefined) => {
  if (pathOrUri && pathOrUri.startsWith('file://')) {
    return fileURLToPath(pathOrUri)
  }
  return pathOrUri
}

const toString = (chunks: readonly Uint8Array[]) => {
  return Buffer.concat(chunks).toString()
}

export const runProcess = async ({
  args,
  command,
  cwd,
}: RunProcessOptions): Promise<RunProcessResult> => {
  try {
    const { promise, resolve } = Promise.withResolvers<RunProcessResult>()
    const childProcess = spawn(command, [...args], {
      cwd: toPath(cwd),
    })
    const stdoutChunks: Uint8Array[] = []
    const stderrChunks: Uint8Array[] = []

    const handleStdoutData = (chunk: Uint8Array) => {
      stdoutChunks.push(chunk)
    }

    const handleStderrData = (chunk: Uint8Array) => {
      stderrChunks.push(chunk)
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
        stderr: toString(stderrChunks),
        stdout: toString(stdoutChunks),
      })
    }

    childProcess.stdout.on('data', handleStdoutData)
    childProcess.stderr.on('data', handleStderrData)
    childProcess.on('error', handleError)
    childProcess.on('close', handleClose)

    return await promise
  } catch (error) {
    return serializeError(error)
  }
}
