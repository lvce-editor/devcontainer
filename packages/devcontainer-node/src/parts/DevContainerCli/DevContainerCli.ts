import { createRequire } from 'node:module'
import type { ErrorResult } from '../SerializeError/SerializeError.ts'
import * as CliError from '../CliError/CliError.ts'
import * as CliJson from '../CliJson/CliJson.ts'
import * as ContainerFileSystem from '../ContainerFileSystem/ContainerFileSystem.ts'
import * as RunProcess from '../RunProcess/RunProcess.ts'

export interface CliCommandSuccess {
  commandName: string
  exitCode: number | null
  json?: unknown
  ok: true
  stderr: string
  stdout: string
}

export interface CliCommandError extends ErrorResult {
  commandName: string
  exitCode?: number | null
  ok: false
  stderr?: string
  stdout?: string
}

export type CliCommandResult = CliCommandSuccess | CliCommandError

export interface DockerCommandSuccess {
  commandName: string
  exitCode: number | null
  ok: true
  stderr: string
  stdout: string
}

export type DockerCommandResult = DockerCommandSuccess | CliCommandError

export interface WorkspaceOptions {
  containerCli?: string
  onOutput?: (text: string) => void
  workspaceFolder: string
}

export interface ExecOptions extends WorkspaceOptions {
  args?: readonly string[]
  command: string
}

export interface ContainerOptions {
  containerCli?: string
  containerId: string
}

const require = createRequire(import.meta.url)

let dockerPath = 'docker'

export const setDockerPath = (path: string): void => {
  dockerPath = path
}

const isErrorResult = (
  result: RunProcess.RunProcessResult,
): result is ErrorResult => {
  return 'errorMessage' in result
}

export const getDevcontainerCliPath = () => {
  return require.resolve('@devcontainers/cli/devcontainer.js')
}

export const getCliReadConfigurationArgs = ({
  containerCli = dockerPath,
  workspaceFolder,
}: WorkspaceOptions) => {
  return [
    'read-configuration',
    '--workspace-folder',
    workspaceFolder,
    '--docker-path',
    containerCli,
  ]
}

export const getCliUpArgs = ({
  containerCli = dockerPath,
  workspaceFolder,
}: WorkspaceOptions) => {
  return [
    'up',
    '--workspace-folder',
    workspaceFolder,
    '--no-lockfile',
    '--log-format',
    'text',
    '--log-level',
    'debug',
    '--docker-path',
    containerCli,
  ]
}

export const getCliExecArgs = ({
  args = [],
  command,
  containerCli = dockerPath,
  workspaceFolder,
}: ExecOptions) => {
  return [
    'exec',
    '--workspace-folder',
    workspaceFolder,
    '--docker-path',
    containerCli,
    command,
    ...args,
  ]
}

export const getDockerStopArgs = ({ containerId }: ContainerOptions) => {
  return ['stop', containerId]
}

export const getDockerRemoveArgs = ({ containerId }: ContainerOptions) => {
  return ['rm', '-f', containerId]
}

const toCliError = (
  commandName: string,
  result: RunProcess.RunProcessResult,
  containerCli: string,
): CliCommandError => {
  if (isErrorResult(result)) {
    return {
      ...result,
      commandName,
      ok: false,
    }
  }
  const { errorCode, errorMessage } = CliError.getCliError(
    result.stdout,
    result.stderr,
    containerCli,
  )
  return {
    commandName,
    errorCode,
    errorMessage: [
      `${commandName} failed with exit code ${result.exitCode}`,
      errorMessage,
    ]
      .filter(Boolean)
      .join('\n'),
    errorStack: undefined,
    exitCode: result.exitCode,
    ok: false,
    stderr: result.stderr,
    stdout: result.stdout,
  }
}

const runDevcontainerCli = async (
  commandName: string,
  args: readonly string[],
  containerCli = dockerPath,
  onOutput?: (text: string) => void,
): Promise<CliCommandResult> => {
  const result = await RunProcess.runProcess({
    args,
    command: process.execPath,
    cwd: process.cwd(),
    onOutput,
  })

  if (isErrorResult(result) || result.exitCode) {
    return toCliError(commandName, result, containerCli)
  }

  try {
    const { json } = CliJson.parseFinalJson(result.stdout)
    return {
      commandName,
      exitCode: result.exitCode,
      json,
      ok: true,
      stderr: result.stderr,
      stdout: result.stdout,
    }
  } catch (error) {
    return {
      commandName,
      errorCode: 'DEVCONTAINER_JSON_PARSE_ERROR',
      errorMessage:
        error instanceof Error ? error.message : 'Failed to parse cli output',
      errorStack: error instanceof Error ? error.stack : undefined,
      exitCode: result.exitCode,
      ok: false,
      stderr: result.stderr,
      stdout: result.stdout,
    }
  }
}

const runDevcontainerCommand = async (
  commandName: string,
  args: readonly string[],
  containerCli = dockerPath,
): Promise<CliCommandResult> => {
  const result = await RunProcess.runProcess({
    args,
    command: process.execPath,
    cwd: process.cwd(),
  })

  if (isErrorResult(result) || result.exitCode) {
    return toCliError(commandName, result, containerCli)
  }

  return {
    commandName,
    exitCode: result.exitCode,
    ok: true,
    stderr: result.stderr,
    stdout: result.stdout,
  }
}

const runDocker = async (
  commandName: string,
  args: readonly string[],
  containerCli = dockerPath,
): Promise<DockerCommandResult> => {
  const result = await RunProcess.runProcess({
    args,
    command: containerCli,
    cwd: process.cwd(),
  })
  if (isErrorResult(result) || result.exitCode) {
    return toCliError(commandName, result, containerCli)
  }
  return {
    commandName,
    exitCode: result.exitCode,
    ok: true,
    stderr: result.stderr,
    stdout: result.stdout,
  }
}

export const cliReadConfiguration = (options: WorkspaceOptions) => {
  return runDevcontainerCli(
    'DevContainerNode.cliReadConfiguration',
    [getDevcontainerCliPath(), ...getCliReadConfigurationArgs(options)],
    options.containerCli,
  )
}

export const cliUp = (options: WorkspaceOptions) => {
  return runDevcontainerCli(
    'DevContainerNode.cliUp',
    [getDevcontainerCliPath(), ...getCliUpArgs(options)],
    options.containerCli,
    options.onOutput,
  )
}

export const cliExec = (options: ExecOptions) => {
  return runDevcontainerCommand(
    'DevContainerNode.cliExec',
    [getDevcontainerCliPath(), ...getCliExecArgs(options)],
    options.containerCli,
  )
}

export const dockerStopContainer = (options: ContainerOptions) => {
  return runDocker(
    'DevContainerNode.dockerStopContainer',
    getDockerStopArgs(options),
    options.containerCli,
  )
}

export const dockerRemoveContainer = (options: ContainerOptions) => {
  return runDocker(
    'DevContainerNode.dockerRemoveContainer',
    getDockerRemoveArgs(options),
    options.containerCli,
  )
}

export const containerFileSystem = (
  options: Parameters<typeof ContainerFileSystem.run>[0],
) => {
  return ContainerFileSystem.run({
    ...options,
    containerCli: options.containerCli ?? dockerPath,
  })
}

export const dockerInspectContainer = async ({
  containerCli = dockerPath,
  containerId,
}: ContainerOptions) => {
  const result = await runDocker(
    'DevContainerNode.dockerInspectContainer',
    ['inspect', '--format', '{{.State.Running}}', containerId],
    containerCli,
  )
  if (!result.ok) {
    throw new Error(result.errorMessage)
  }
  return result.stdout.trim() === 'true'
}
