import { NodeForkedProcessRpcParent } from '@lvce-editor/rpc'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { access, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { createDevContainer } from '../../../devcontainer-worker/src/parts/CreateDevContainer/CreateDevContainer.ts'
import * as DevContainerConfig from '../../../devcontainer-worker/src/parts/DevContainerConfig/DevContainerConfig.ts'

const phase = (message: string) => console.log(`FULL_STACK_PHASE ${message}`)
const report = (result: any) => {
  console.log(`${result.commandName}: exit ${result.exitCode}`)
  if (result.stdout) console.log(`stdout:\n${result.stdout}`)
  if (result.stderr) console.log(`stderr:\n${result.stderr}`)
}
let rpc:
  Awaited<ReturnType<typeof NodeForkedProcessRpcParent.create>> | undefined
let lifecycle: ReturnType<typeof createDevContainer> | undefined
const workspaceFolder = '/workspace'
const docker = (args: string[]) => promisify(execFile)('docker', args)
try {
  await assert.rejects(access('/workspace/test.txt'), { code: 'ENOENT' })
  await assert.rejects(access('/workspace/created.txt'), { code: 'ENOENT' })
  phase(`Forking devcontainer-node with Node ${process.version}`)
  rpc = await NodeForkedProcessRpcParent.create({
    commandMap: {},
    path: fileURLToPath(new URL('devcontainer-node.mjs', import.meta.url)),
  })
  const state = new Map<string, any>()
  const invoke = (method: string) => (options: any) =>
    rpc!.invoke(`DevContainerNode.${method}`, options)
  lifecycle = createDevContainer({
    DevContainerConfig,
    DevContainerNodeClient: {
      cliExec: invoke('cliExec'),
      cliReadConfiguration: invoke('cliReadConfiguration'),
      cliUp: invoke('cliUp'),
      containerFileSystem: async () => {
        throw new Error('Not used by this startup test')
      },
      dockerRemoveContainer: invoke('dockerRemoveContainer'),
      dockerStopContainer: invoke('dockerStopContainer'),
    },
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
  phase('Detecting devcontainer.json on the guest filesystem')
  const detected = await lifecycle.detect({ workspaceFolder })
  assert.equal(detected.found, true)
  phase('Running the real CLI read-configuration command')
  const configuration: any = await lifecycle.readConfiguration({
    workspaceFolder,
  })
  report(configuration)
  assert.equal(configuration.ok, true)
  phase('Running the real CLI up command')
  const started: any = await lifecycle.up({ workspaceFolder })
  report(started)
  assert.equal(started.ok, true)
  assert.match(started.json.containerId, /^[a-f0-9]{64}$/)
  const running = await lifecycle.getState({ workspaceFolder })
  assert.equal(running.status, 'running')
  assert.equal(
    await readFile('/workspace/initialized.txt', 'utf8'),
    'initialized',
  )
  phase('Running shell commands through Node RPC and the real CLI exec command')
  const execute = (command: string) =>
    lifecycle!.exec({
      args: ['-lc', command],
      command: 'sh',
      workspaceFolder,
    }) as Promise<any>
  const output = await execute(
    'pwd; sh hello.sh; cat created.txt; printf " separate stderr" >&2; exit 7',
  )
  report(output)
  assert.equal(output.exitCode, 7)
  assert.equal(
    output.stdout,
    '/workspaces/playground\nHello from a real devcontainer!\ncreated',
  )
  assert.ok(output.stderr.includes('separate stderr'))
  phase('Checking that files persist across separate CLI processes')
  const written = await execute('printf persisted > test.txt')
  assert.equal(written.exitCode, 0)
  const read = await execute('cat test.txt')
  assert.equal(read.stdout, 'persisted')
  phase('Stopping and removing the real Docker container')
  assert.equal(((await lifecycle.stop({ workspaceFolder })) as any).ok, true)
  const inspected = await docker([
    'inspect',
    '--format={{.State.Running}}',
    started.json.containerId,
  ])
  assert.equal(inspected.stdout.trim(), 'false')
  assert.equal(((await lifecycle.remove({ workspaceFolder })) as any).ok, true)
  const stopped = await lifecycle.getState({ workspaceFolder })
  assert.equal(stopped.status, 'stopped')
  const remaining = await docker(['ps', '-aq'])
  assert.equal(remaining.stdout.trim(), '')
  phase('Disposing the Node process')
  await rpc.dispose()
  rpc = undefined
  console.log('FULL_STACK_PASS')
} catch (error) {
  console.error(error)
  console.log(`FULL_STACK_FAIL ${String(error)}`)
  process.exitCode = 1
} finally {
  await rpc?.dispose()
}
