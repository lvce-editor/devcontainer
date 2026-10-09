import { afterEach, expect, test } from '@jest/globals'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import * as LifecycleCommands from '../src/parts/LifecycleCommands/LifecycleCommands.ts'

const directories: string[] = []
const fixture = async (script: string): Promise<string> => {
  const directory = await mkdtemp(join(tmpdir(), 'lvce-lifecycle-'))
  directories.push(directory)
  const path = join(directory, 'cli.cjs')
  await writeFile(path, script)
  return path
}
const waitFor = async (predicate: () => boolean): Promise<void> => {
  const deadline = Date.now() + 5000
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('Lifecycle state did not settle')
    await new Promise((resolve) => setTimeout(resolve, 10))
  }
}

afterEach(async () => {
  LifecycleCommands.dispose()
  await Promise.all(
    directories
      .splice(0)
      .map((path) => rm(path, { force: true, recursive: true })),
  )
})

test('persistent hooks stream bounded logs without blocking or launching twice', async () => {
  const path = await fixture(`
    process.stdout.write(JSON.stringify(process.argv.slice(2)) + '\\n');
    process.stdout.write('x'.repeat(2 * 1024 * 1024));
    process.stdout.write('ready');
    setInterval(() => {}, 1000);
  `)
  await LifecycleCommands.start(
    '/workspace',
    'container',
    path,
    '/tools/docker',
  )
  await waitFor(() =>
    LifecycleCommands.getProgress('/workspace').output.endsWith('ready'),
  )
  const before = LifecycleCommands.getProgress('/workspace')
  expect(before.running).toBe(true)
  expect(before.output).toHaveLength(1024 * 1024)
  await LifecycleCommands.start(
    '/workspace',
    'container',
    path,
    '/tools/docker',
  )
  expect(LifecycleCommands.getProgress('/workspace')).toEqual(before)
  LifecycleCommands.remove('container')
  expect(LifecycleCommands.getProgress('/workspace')).toEqual({
    output: '',
    running: false,
  })
})

test('deferred failures retain diagnostics and allow another operation', async () => {
  const path = await fixture(`
    console.log(JSON.stringify(process.argv.slice(2)));
    console.error('postStartCommand failed');
    process.exitCode = 7;
  `)
  await LifecycleCommands.start(
    '/workspace',
    'container',
    path,
    '/tools/docker',
  )
  await waitFor(() => !LifecycleCommands.getProgress('/workspace').running)
  const result = LifecycleCommands.getProgress('/workspace')
  expect(result.errorMessage).toContain('exit code 7')
  expect(result.output).toContain('postStartCommand failed')
  expect(result.output).toContain('run-user-commands')
  expect(result.output).toContain('/tools/docker')
  await LifecycleCommands.start(
    '/workspace',
    'container',
    await fixture(`console.log('repaired')`),
    '/tools/docker',
  )
  await waitFor(() => !LifecycleCommands.getProgress('/workspace').running)
  expect(
    LifecycleCommands.getProgress('/workspace').errorMessage,
  ).toBeUndefined()
  expect(LifecycleCommands.getProgress('/workspace').output).toContain(
    'repaired',
  )
})
