import { expect, test } from '@jest/globals'
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
  ).toEqual(['up', '--workspace-folder', '/workspace', '--no-lockfile'])
})

test('getCliExecArgs', () => {
  expect(
    DevContainerCli.getCliExecArgs({
      args: ['--version'],
      command: 'node',
      workspaceFolder: '/workspace',
    }),
  ).toEqual(['exec', '--workspace-folder', '/workspace', 'node', '--version'])
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
