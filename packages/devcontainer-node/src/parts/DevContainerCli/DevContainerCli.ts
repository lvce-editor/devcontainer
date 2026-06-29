import { createRequire } from 'node:module'
import type { ErrorResult } from '../SerializeError/SerializeError.ts'
import * as CliJson from '../CliJson/CliJson.ts'
import * as RunProcess from '../RunProcess/RunProcess.ts'

export interface CliCommandSuccess {
  commandName: string
  exitCode: number | null
  json: unknown
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
  workspaceFolder: string
}

export interface ExecOptions extends WorkspaceOptions {
  args?: readonly string[]
  command: string
}

export interface ContainerOptions {
  containerId: string
}

const require = createRequire(import.meta.url)

const isErrorResult = (
  result: RunProcess.RunProcessResult,
): result is ErrorResult => {
  return 'errorMessage' in result
}

export const getDevcontainerCliPath = () => {
  return require.resolve('@devcontainers/cli/devcontainer.js')
}

export const getCliReadConfigurationArgs = ({ workspaceFolder }: WorkspaceOptions) => {
  return ['read-configuration', '--workspace-folder', workspaceFolder]
}

export const getCliUpArgs = ({ workspaceFolder }: WorkspaceOptions) => {
  return ['up', '--workspace-folder', workspaceFolder, '--no-lockfile']
}

export const getCliExecArgs = ({
  args = [],
  command,
  workspaceFolder,
}: ExecOptions) => {
  return ['exec', '--workspace-folder', workspaceFolder, command, ...args]
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
): CliCommandError => {
  if (isErrorResult(result)) {
    return {
      ...result,
      commandName,
      ok: false,
    }
  }
  return {
    commandName,
    errorCode: undefined,
    errorMessage: `${commandName} failed with exit code ${result.exitCode}`,
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
): Promise<CliCommandResult> => {
  const result = await RunProcess.runProcess({
    args,
    command: process.execPath,
    cwd: process.cwd(),
  })

  if (isErrorResult(result) || result.exitCode) {
    return toCliError(commandName, result)
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

const runDocker = async (
  commandName: string,
  args: readonly string[],
): Promise<DockerCommandResult> => {
  const result = await RunProcess.runProcess({
    args,
    command: 'docker',
    cwd: process.cwd(),
  })
  if (isErrorResult(result) || result.exitCode) {
    return toCliError(commandName, result)
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
  return runDevcontainerCli('DevContainerNode.cliReadConfiguration', [
    getDevcontainerCliPath(),
    ...getCliReadConfigurationArgs(options),
  ])
}

export const cliUp = (options: WorkspaceOptions) => {
  return runDevcontainerCli('DevContainerNode.cliUp', [
    getDevcontainerCliPath(),
    ...getCliUpArgs(options),
  ])
}

export const cliExec = (options: ExecOptions) => {
  return runDevcontainerCli('DevContainerNode.cliExec', [
    getDevcontainerCliPath(),
    ...getCliExecArgs(options),
  ])
}

export const dockerStopContainer = (options: ContainerOptions) => {
  return runDocker(
    'DevContainerNode.dockerStopContainer',
    getDockerStopArgs(options),
  )
}

export const dockerRemoveContainer = (options: ContainerOptions) => {
  return runDocker(
    'DevContainerNode.dockerRemoveContainer',
    getDockerRemoveArgs(options),
  )
}
