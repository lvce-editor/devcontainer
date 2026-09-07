import { afterEach, expect, test } from '@jest/globals'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as DevContainerCli from '../src/parts/DevContainerCli/DevContainerCli.js'

test('getCliReadConfigurationArgs', () => {
  expect(
    DevContainerCli.getCliReadConfigurationArgs({
      workspaceFolder: '/workspace',
    }),
  ).toEqual(['read-configuration', '--workspace-folder', '/workspace'])
})

test('getCliUpArgs', () => {
  expect(
    DevContainerCli.getCliUpArgs({
      workspaceFolder: '/workspace',
    }),
  ).toEqual([
    'up',
    '--workspace-folder',
    '/workspace',
    '--no-lockfile',
    '--docker-path',
    'docker',
  ])
})

test('getCliExecArgs', () => {
  expect(
    DevContainerCli.getCliExecArgs({
      args: ['--version'],
      command: 'node',
      workspaceFolder: '/workspace',
    }),
  ).toEqual([
    'exec',
    '--workspace-folder',
    '/workspace',
    '--docker-path',
    'docker',
    'node',
    '--version',
  ])
})

test('getDockerStopArgs', () => {
  expect(
    DevContainerCli.getDockerStopArgs({
      containerId: 'abc123',
    }),
  ).toEqual(['stop', 'abc123'])
})

test('getDockerRemoveArgs', () => {
  expect(
    DevContainerCli.getDockerRemoveArgs({
      containerId: 'abc123',
    }),
  ).toEqual(['rm', '-f', 'abc123'])
})

afterEach(() => {
  DevContainerCli.setDockerPath('docker')
})

test('passes the configured Docker path as a separate CLI argument', () => {
  DevContainerCli.setDockerPath('/missing docker')
  expect(
    DevContainerCli.getCliUpArgs({ workspaceFolder: '/workspace' }),
  ).toContain('/missing docker')
  expect(
    DevContainerCli.getCliExecArgs({
      command: 'node',
      workspaceFolder: '/workspace',
    }),
  ).toEqual([
    'exec',
    '--workspace-folder',
    '/workspace',
    '--docker-path',
    '/missing docker',
    'node',
  ])
})

test('missing Docker returns an error result without throwing', async () => {
  DevContainerCli.setDockerPath('/nonexistent-lvce-docker/docker')
  await expect(
    DevContainerCli.dockerStopContainer({ containerId: 'unused' }),
  ).resolves.toMatchObject({ errorCode: 'ENOENT', ok: false })
})

test('cliUp preserves the missing Docker cause, error code, and raw output', async () => {
  const workspaceFolder = await mkdtemp(
    join(tmpdir(), 'devcontainer-cli-error-'),
  )
  const dockerPath = join(workspaceFolder, 'missing-docker')
  try {
    await mkdir(join(workspaceFolder, '.devcontainer'))
    await writeFile(
      join(workspaceFolder, '.devcontainer', 'devcontainer.json'),
      JSON.stringify({ image: 'ubuntu' }),
    )
    DevContainerCli.setDockerPath(dockerPath)
    const result = await DevContainerCli.cliUp({ workspaceFolder })
    expect(result).toMatchObject({
      errorCode: 'ENOENT',
      errorMessage: expect.stringContaining('Docker executable was not found'),
      exitCode: 1,
      ok: false,
      stderr: expect.stringContaining('ENOENT'),
      stdout: expect.stringContaining('"outcome":"error"'),
    })
    expect(result).toMatchObject({
      errorMessage: expect.stringContaining(`spawn ${dockerPath} ENOENT`),
    })
  } finally {
    await rm(workspaceFolder, { force: true, recursive: true })
  }
})
