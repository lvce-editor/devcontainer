import { afterEach, expect, test } from '@jest/globals'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as DevContainerConfig from '../src/parts/DevContainerConfig/DevContainerConfig.js'

const roots: string[] = []

const createWorkspace = async () => {
  const root = await mkdtemp(join(tmpdir(), 'devcontainer-worker-'))
  roots.push(root)
  return root
}

afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { force: true, recursive: true })
  }
})

test('detect - .devcontainer/devcontainer.json', async () => {
  const workspaceFolder = await createWorkspace()
  const configDir = join(workspaceFolder, '.devcontainer')
  await mkdir(configDir)
  const configPath = join(configDir, 'devcontainer.json')
  await writeFile(configPath, '{}')

  expect(await DevContainerConfig.detect({ workspaceFolder })).toEqual({
    configPath,
    found: true,
    workspaceFolder,
  })
})

test('detect - .devcontainer.json', async () => {
  const workspaceFolder = await createWorkspace()
  const configPath = join(workspaceFolder, '.devcontainer.json')
  await writeFile(configPath, '{}')

  expect(await DevContainerConfig.detect({ workspaceFolder })).toEqual({
    configPath,
    found: true,
    workspaceFolder,
  })
})

test('detect - missing config', async () => {
  const workspaceFolder = await createWorkspace()

  expect(await DevContainerConfig.detect({ workspaceFolder })).toEqual({
    configPath: undefined,
    found: false,
    workspaceFolder,
  })
})
