import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createBrowserDevContainer, workspaceFolder } from '../src/browser.ts'
import { Runtime } from '../src/runtime.ts'

class FakeWorker {
  onmessage: (event: { data: any }) => void = () => {}
  onerror: (event: any) => void = () => {}
  sent: any[] = []
  terminated = false
  postMessage(message: any) {
    this.sent.push(message)
  }
  terminate() {
    this.terminated = true
  }
  emit(data: any) {
    this.onmessage({ data })
  }
}
const tick = () => new Promise((resolve) => setImmediate(resolve))
const setup = () => {
  const workers: FakeWorker[] = []
  const runtime = new Runtime(
    () => {},
    () => {
      const worker = new FakeWorker()
      workers.push(worker)
      return worker as unknown as Worker
    },
  )
  return {
    lifecycle: createBrowserDevContainer(() => {}, runtime),
    runtime,
    workers,
  }
}

void test('stop during boot settles startup and ignores stale readiness; retry boots a new worker', async () => {
  const { lifecycle, workers } = setup()
  const pending = lifecycle.up({ workspaceFolder })
  await tick()
  const starting = await lifecycle.getState({ workspaceFolder })
  assert.equal(starting.status, 'starting')
  assert.deepEqual(await lifecycle.up({ workspaceFolder }), {
    errorCode: 'DEVCONTAINER_ALREADY_STARTED',
    ok: false,
  })
  await lifecycle.stop({ workspaceFolder })
  workers[0].emit({ type: 'ready' })
  assert.equal(((await pending) as any).ok, false)
  assert.equal(workers[0].terminated, true)
  const stopped = await lifecycle.getState({ workspaceFolder })
  assert.equal(stopped.status, 'stopped')
  const retry = lifecycle.up({ workspaceFolder })
  await tick()
  workers[1].emit({ type: 'ready' })
  assert.equal(((await retry) as any).ok, true)
  await lifecycle.stop({ workspaceFolder })
})

void test('queued commands are sequential; Stop settles active and queued commands', async () => {
  const { runtime, workers } = setup()
  const boot = runtime.start()
  workers[0].emit({ type: 'ready' })
  await boot
  const first = runtime.exec('printf one')
  const second = runtime.exec('printf two')
  await tick()
  assert.equal(
    workers[0].sent.filter((message) => message.type === 'exec').length,
    1,
  )
  workers[0].emit({
    exitCode: 7,
    id: 1,
    stderr: btoa('error'),
    stdout: btoa('one'),
    type: 'result',
  })
  assert.deepEqual(await first, {
    exitCode: 7,
    ok: false,
    stderr: 'error',
    stdout: 'one',
  })
  await tick()
  assert.equal(
    workers[0].sent.filter((message) => message.type === 'exec').length,
    2,
  )
  const third = runtime.exec('printf three')
  runtime.stop()
  const secondResult = await second
  const thirdResult = await third
  assert.equal(secondResult.ok, false)
  assert.equal(thirdResult.ok, false)
})

void test('failed boot returns an error and permits retry', async () => {
  const { runtime, workers } = setup()
  const boot = runtime.start()
  workers[0].emit({ message: 'missing image', type: 'error' })
  const bootResult = await boot
  assert.match(bootResult.errorMessage!, /Linux failed/)
  const retry = runtime.start()
  workers[1].emit({ type: 'ready' })
  const retryResult = await retry
  assert.equal(retryResult.ok, true)
  runtime.stop()
})

void test('only the prepared workspace is supported; commands require a running environment', async () => {
  const { lifecycle } = setup()
  assert.equal(
    ((await lifecycle.up({ workspaceFolder: '/other' })) as any).errorCode,
    'DEVCONTAINER_BROWSER_UNSUPPORTED',
  )
  assert.equal(
    (
      (await lifecycle.exec({
        args: ['-lc', 'true'],
        command: 'sh',
        workspaceFolder,
      })) as any
    ).errorCode,
    'DEVCONTAINER_NOT_RUNNING',
  )
})

void test('boot timeout settles startup and destroys the worker', async (context) => {
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const { runtime, workers } = setup()
  const boot = runtime.start()
  context.mock.timers.tick(120_000)
  const result = await boot
  assert.match(result.errorMessage!, /120 seconds/)
  assert.equal(workers[0].terminated, true)
})

void test('malformed command responses settle the command and terminate the environment', async () => {
  const { runtime, workers } = setup()
  const boot = runtime.start()
  workers[0].emit({ type: 'ready' })
  await boot
  const command = runtime.exec('true')
  await tick()
  workers[0].emit({
    exitCode: 0,
    id: 1,
    stderr: '',
    stdout: '%invalid',
    type: 'result',
  })
  const result = await command
  assert.equal(result.ok, false)
  assert.equal(workers[0].terminated, true)
})

void test('a worker transport failure settles the command and allows a fresh start', async () => {
  const { runtime, workers } = setup()
  const boot = runtime.start()
  workers[0].emit({ type: 'ready' })
  await boot
  workers[0].postMessage = () => {
    throw new Error('Worker transport closed')
  }
  const result = await runtime.exec('true')
  assert.equal(result.ok, false)
  assert.equal(workers[0].terminated, true)
  const retry = runtime.start()
  workers[1].emit({ type: 'ready' })
  const retried = await retry
  assert.equal(retried.ok, true)
  runtime.stop()
})
