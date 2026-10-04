import { afterEach, expect, jest, test } from '@jest/globals'
import * as ContainerTerminal from '../src/parts/ContainerTerminal/ContainerTerminal.ts'
import * as ContainerTerminalSession from '../src/parts/ContainerTerminalSession/ContainerTerminalSession.ts'
import * as DevContainerState from '../src/parts/DevContainerState/DevContainerState.ts'

const createSession = jest.fn(async () => ({
  directory: '/tmp/lvce-terminal-test-token',
  token: 'test-token',
}))
const getOptions = (uri: string, cwd = '') =>
  ContainerTerminal.getSpawnOptions(uri, cwd, createSession)

const workspaceFolder = '/host/project with spaces'
const workspaceUri = 'devcontainers:///abc123'
const connect = () =>
  DevContainerState.set(workspaceFolder, {
    containerCli: '/custom/podman',
    containerId: 'abc123',
    remoteUser: 'node',
    remoteWorkspaceFolder: '/workspaces/project',
    status: 'running',
  })

afterEach(() => DevContainerState.reset())

test('launches a PTY through devcontainer exec with the configured environment and container id', async () => {
  connect()
  const options = await getOptions(workspaceUri)
  expect(options.command).toBe(process.execPath)
  expect(options.env).toEqual({ ELECTRON_RUN_AS_NODE: '1' })
  expect(options.cwd).toBe(workspaceFolder)
  expect(options.disposeCommand).toEqual({
    args: ['test-token'],
    command: 'devcontainer.disposeTerminal',
  })
  expect(options.args).toEqual([
    expect.stringContaining('devcontainer.js'),
    'exec',
    '--workspace-folder',
    workspaceFolder,
    '--docker-path',
    '/custom/podman',
    '--container-id',
    'abc123',
    'env',
    'LVCE_TERMINAL_SESSION=test-token',
    'sh',
    '-c',
    ContainerTerminalSession.shellScript,
    'devcontainer-terminal',
    '/workspaces/project',
    '/tmp/lvce-terminal-test-token',
  ])
})

test('opens an Explorer directory and passes special characters as a positional argument', async () => {
  connect()
  const options = await getOptions(
    workspaceUri,
    `${workspaceUri}/src/a%20b%3B%24x`,
  )
  expect(options.args.at(-2)).toBe('/workspaces/project/src/a b;$x')
})

test('refuses a terminal in another container', async () => {
  connect()
  await expect(
    getOptions(workspaceUri, 'devcontainers:///def456/src'),
  ).rejects.toThrow('different workspace')
})

test('refuses host directories in a container workspace', async () => {
  connect()
  await expect(getOptions(workspaceUri, 'file:///host')).rejects.toThrow(
    'Invalid devcontainer URI',
  )
})

test('does not launch a host shell for a stopped container', async () => {
  connect()
  DevContainerState.set(workspaceFolder, {
    ...DevContainerState.get(workspaceFolder)!,
    status: 'stopped',
  })
  await expect(getOptions(workspaceUri)).rejects.toThrow(
    'Devcontainer is not running',
  )
})
