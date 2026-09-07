import assert from 'node:assert/strict'
import { fork } from 'node:child_process'
import { once } from 'node:events'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { setTimeout } from 'node:timers/promises'
import { createDevBuild } from '../src/createDevBuild.ts'

test('development builds only browser code and runs the Node source directly', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'devcontainer-dev-'))
  try {
    const context = await createDevBuild(directory)
    try {
      const manifest = JSON.parse(
        await readFile(join(directory, 'extension.json'), 'utf8'),
      )
      const bundle = await readFile(join(directory, manifest.browser), 'utf8')
      assert.ok(bundle.includes('devcontainer.start'))
      assert.deepEqual((await readdir(directory)).sort(), [
        'dist',
        'extension.json',
        'package.json',
      ])
      assert.deepEqual((await readdir(join(directory, 'dist'))).sort(), [
        'devcontainerMain.js',
        'devcontainerProcess.js',
      ])
      const launcher = join(directory, manifest.rpc[0].url)
      assert.match(await readFile(launcher, 'utf8'), /devcontainerProcess\.ts/)
      const child = fork(launcher, ['--ipc-type=node-forked-process'], {
        execArgv: [],
        silent: true,
      })
      let stderr = ''
      child.stderr?.on('data', (data) => {
        stderr += data
      })
      const exited = once(child, 'exit')
      try {
        const [message] = await Promise.race([
          once(child, 'message', { signal: AbortSignal.timeout(10_000) }),
          exited.then(() => {
            throw new Error(
              `The Node process exited before connecting: ${stderr}`,
            )
          }),
        ])
        assert.equal(message, 'ready', stderr)
      } finally {
        child.kill()
        await exited
      }
    } finally {
      await context.dispose()
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('development watch rebuilds browser edits', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'devcontainer-watch-'))
  const entry = join(directory, 'entry.ts')
  const output = join(directory, 'dist/devcontainerMain.js')
  await writeFile(entry, 'console.log("before-edit")\n')
  try {
    const context = await createDevBuild(directory, entry)
    try {
      assert.match(await readFile(output, 'utf8'), /before-edit/)
      await context.watch()
      await writeFile(entry, 'console.log("after-edit")\n')
      for (let attempt = 0; attempt < 100; attempt++) {
        if ((await readFile(output, 'utf8')).includes('after-edit')) {
          return
        }
        await setTimeout(50)
      }
      assert.fail('The browser bundle did not rebuild after an edit')
    } finally {
      await context.dispose()
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
