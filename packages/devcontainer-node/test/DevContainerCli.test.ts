import { afterEach, expect, test } from '@jest/globals'
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
