/* eslint-disable jest/no-disabled-tests */
import { afterEach, beforeEach, describe, expect, test } from '@jest/globals'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as DevContainer from '../src/parts/DevContainer/DevContainer.js'
import * as DevContainerNodeClient from '../src/parts/DevContainerNodeClient/DevContainerNodeClient.js'
import * as DevContainerState from '../src/parts/DevContainerState/DevContainerState.js'

const roots: string[] = []

const createWorkspace = async ({ config }: { config?: string } = {}) => {
  const root = await mkdtemp(join(tmpdir(), 'devcontainer-e2e-'))
  roots.push(root)
  if (config !== undefined) {
    const configDir = join(root, '.devcontainer')
    await mkdir(configDir)
    await writeFile(join(configDir, 'devcontainer.json'), config)
  }
  return root
}

const getStringProperty = (value: unknown, property: string) => {
  if (value && typeof value === 'object' && property in value) {
    const propertyValue = value[property as keyof typeof value]
    if (typeof propertyValue === 'string') {
      return propertyValue
    }
  }
  return ''
}

const removeDevContainer = async (workspaceFolder: string) => {
  const state = DevContainer.getState({ workspaceFolder })
  if (state.containerId) {
    await DevContainer.remove({ workspaceFolder })
  }
}

const getDevContainerNodeApi = async () => {
  const moduleUrl = new URL(
    '../../devcontainer-node/src/parts/DevContainerCli/DevContainerCli.ts',
    import.meta.url,
  )
  return (await import(
    moduleUrl.href
  )) as Parameters<typeof DevContainerNodeClient.setNodeApi>[0]
}

beforeEach(async () => {
  DevContainerNodeClient.setNodeApi(await getDevContainerNodeApi())
})

afterEach(async () => {
  for (const root of roots) {
    await removeDevContainer(root)
  }
  DevContainerState.reset()
  DevContainerNodeClient.resetNodeApi()
  for (const root of roots.splice(0)) {
    await rm(root, { force: true, recursive: true })
  }
})

describe.skip('devcontainer e2e', () => {
  test('up - missing config', async () => {
    const workspaceFolder = await createWorkspace()

    expect(await DevContainer.up({ workspaceFolder })).toMatchObject({
      errorCode: 'DEVCONTAINER_CONFIG_NOT_FOUND',
      ok: false,
      workspaceFolder,
    })
  })

  test('readConfiguration - devcontainer json with comments', async () => {
    const workspaceFolder = await createWorkspace({
      config: `{
  // Devcontainer configuration should support jsonc comments.
  "image": "ubuntu:24.04",
  "remoteUser": "root"
}`,
    })

    expect(await DevContainer.readConfiguration({ workspaceFolder })).toMatchObject({
      ok: true,
    })
  })

  test('readConfiguration - invalid devcontainer json', async () => {
    const workspaceFolder = await createWorkspace({
      config: '{"image":',
    })

    expect(await DevContainer.readConfiguration({ workspaceFolder })).toMatchObject({
      ok: false,
    })
  })

  test('up - docker image not found', async () => {
    const workspaceFolder = await createWorkspace({
      config: JSON.stringify(
        {
          image: 'ghcr.io/lvce-editor/devcontainer-e2e-image-not-found:missing',
          remoteUser: 'root',
        },
        null,
        2,
      ),
    })

    expect(await DevContainer.up({ workspaceFolder })).toMatchObject({
      ok: false,
    })
    expect(DevContainer.getState({ workspaceFolder })).toMatchObject({
      status: 'error',
    })
  })

  test('up and exec - valid ubuntu devcontainer', async () => {
    const workspaceFolder = await createWorkspace({
      config: JSON.stringify(
        {
          image: 'ubuntu:24.04',
          remoteUser: 'root',
        },
        null,
        2,
      ),
    })

    expect(await DevContainer.up({ workspaceFolder })).toMatchObject({
      ok: true,
    })
    expect(DevContainer.getState({ workspaceFolder })).toMatchObject({
      status: 'running',
    })

    const execResult = await DevContainer.exec({
      args: ['hello world'],
      command: 'echo',
      workspaceFolder,
    })

    expect(execResult).toMatchObject({
      ok: true,
    })
    expect(getStringProperty(execResult, 'stdout')).toContain('hello world')

    expect(await DevContainer.remove({ workspaceFolder })).toMatchObject({
      ok: true,
    })
    expect(DevContainer.getState({ workspaceFolder })).toEqual({
      status: 'stopped',
    })
  })
})
