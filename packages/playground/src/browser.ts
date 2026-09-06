import type { DevContainerState } from '../../devcontainer-worker/src/parts/DevContainerState/DevContainerState.ts'
import { createDevContainer } from '../../devcontainer-worker/src/parts/CreateDevContainer/CreateDevContainer.ts'
import { Runtime } from './runtime.ts'

export const workspaceFolder = '/workspace'
export const configuration = {
  image: 'alpine:3.23.3',
  name: 'Alpine Linux playground',
  workspaceFolder,
}
const unsupported = () => ({
  errorCode: 'DEVCONTAINER_BROWSER_UNSUPPORTED',
  errorMessage:
    'This playground supports only the bundled Alpine workspace and shell commands.',
  ok: false,
})

export const createBrowserDevContainer = (
  progress: (message: string) => void,
  runtime = new Runtime(progress),
) => {
  const state = new Map<string, DevContainerState>()
  const stop = async () => runtime.stop()
  const adapter = {
    cliExec: async ({
      args = [],
      command,
    }: {
      command: string
      args?: readonly string[]
    }) => {
      if (command !== 'sh' || args.length !== 2 || args[0] !== '-lc')
        return unsupported()
      return runtime.exec(args[1])
    },
    cliReadConfiguration: async () => ({ json: configuration, ok: true }),
    cliUp: async () => runtime.start(),
    containerFileSystem: async () => {
      throw new Error(
        'Editor filesystem integration is unavailable in this playground',
      )
    },
    dockerRemoveContainer: stop,
    dockerStopContainer: stop,
  }
  const lifecycle = createDevContainer({
    cancelStart: stop,
    DevContainerConfig: {
      detect: async ({ workspaceFolder: folder }) => ({
        configPath:
          folder === workspaceFolder
            ? '/workspace/.devcontainer/devcontainer.json'
            : undefined,
        found: folder === workspaceFolder,
        workspaceFolder: folder,
      }),
    },
    DevContainerNodeClient: adapter,
    DevContainerState: {
      forget: async () => {},
      get: (folder) => state.get(folder),
      persist: async () => {},
      remove: (folder) => {
        state.delete(folder)
      },
      set: (folder, value) => {
        state.set(folder, value)
        return value
      },
    },
    WorkspaceFolder: { toPath: async (folder) => folder },
  })
  // Restrict the entrypoint before forwarding to shared lifecycle operations.
  const supported =
    (method: (options: any) => Promise<unknown>) =>
    async (options: { workspaceFolder: string; [key: string]: unknown }) =>
      options.workspaceFolder === workspaceFolder
        ? method(options)
        : unsupported()
  return {
    detect: supported(lifecycle.detect),
    exec: supported(lifecycle.exec),
    getState: lifecycle.getState,
    readConfiguration: supported(lifecycle.readConfiguration),
    remove: supported(lifecycle.remove),
    stop: supported(lifecycle.stop),
    up: supported(lifecycle.up),
  }
}
