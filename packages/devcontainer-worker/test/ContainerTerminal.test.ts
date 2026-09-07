import { afterEach, expect, test } from '@jest/globals'
import * as ContainerTerminal from '../src/parts/ContainerTerminal/ContainerTerminal.ts'
import * as DevContainerState from '../src/parts/DevContainerState/DevContainerState.ts'

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
  const options = await ContainerTerminal.getSpawnOptions(workspaceUri)
  expect(options.command).toBe(process.execPath)
  expect(options.cwd).toBe(workspaceFolder)
  expect(options.args).toEqual([
    expect.stringContaining('devcontainer.js'),
    'exec',
    '--workspace-folder',
    workspaceFolder,
    '--docker-path',
    '/custom/podman',
    '--container-id',
    'abc123',
    'sh',
    '-c',
    'cd -- "$1" && exec "${SHELL:-/bin/sh}" -il',
    'devcontainer-terminal',
    '/workspaces/project',
  ])
})

test('opens an Explorer directory and passes special characters as a positional argument', async () => {
  connect()
  const options = await ContainerTerminal.getSpawnOptions(
    workspaceUri,
    `${workspaceUri}/src/a%20b%3B%24x`,
  )
  expect(options.args.at(-1)).toBe('/workspaces/project/src/a b;$x')
})

test('refuses a terminal in another container', async () => {
  connect()
  await expect(
    ContainerTerminal.getSpawnOptions(
      workspaceUri,
      'devcontainers:///def456/src',
    ),
  ).rejects.toThrow('different workspace')
})

test('refuses host directories in a container workspace', async () => {
  connect()
  await expect(
    ContainerTerminal.getSpawnOptions(workspaceUri, 'file:///host'),
  ).rejects.toThrow('Invalid devcontainer URI')
})

test('does not launch a host shell for a stopped container', async () => {
  connect()
  DevContainerState.set(workspaceFolder, {
    ...DevContainerState.get(workspaceFolder)!,
    status: 'stopped',
  })
  await expect(ContainerTerminal.getSpawnOptions(workspaceUri)).rejects.toThrow(
    'Devcontainer is not running',
  )
})
