import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import type { ErrorResult } from '../SerializeError/SerializeError.ts'
import * as Assert from '../Assert/Assert.ts'
import { serializeError } from '../SerializeError/SerializeError.ts'

export interface SuccessResult {
  exitCode: number | null
  stderr: string
  stdout: string
}

export interface ExecuteShellCommandOptions {
  args: readonly string[]
  cwd: string
  toSpawn: string
}

export type ExecuteShellCommandResult = SuccessResult | ErrorResult

const toPath = (pathOrUri: string) => {
  if (pathOrUri.startsWith('file://')) {
    return fileURLToPath(pathOrUri)
  }
  return pathOrUri
}

const toString = (chunks: readonly Uint8Array[]) => {
  return Buffer.concat(chunks).toString()
}

export const executeShellCommand = async ({
  args,
  cwd,
  toSpawn,
}: ExecuteShellCommandOptions) => {
  Assert.array(args)
  Assert.string(cwd)
  Assert.string(toSpawn)

  try {
    const { promise, resolve } =
      Promise.withResolvers<ExecuteShellCommandResult>()
    const childProcess = spawn(toSpawn, args, {
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

    const resolveWithCleanup = (result: ExecuteShellCommandResult) => {
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
