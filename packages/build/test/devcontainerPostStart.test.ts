import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { setTimeout as delay } from 'node:timers/promises'

await test(
  'the development server does not block the workspace handoff',
  { skip: process.platform === 'win32' },
  async () => {
    const directory = await mkdtemp(join(tmpdir(), 'devcontainer-start-'))
    const npm = join(directory, 'npm')
    // Simulate a long-running server without installing or starting the editor.
    await writeFile(
      npm,
      '#!/bin/sh\necho $$ > "$SERVER_PID_FILE"\nexec sleep 60\n',
    )
    await chmod(npm, 0o755)
    const configuration = JSON.parse(
      await readFile(
        new URL('../../../.devcontainer/devcontainer.json', import.meta.url),
        'utf8',
      ),
    )
    const child = spawn(
      'sh',
      [
        '-c',
        configuration.postStartCommand.replace(
          '/tmp/lvce-devcontainer-server.log',
          join(directory, 'server.log'),
        ),
      ],
      {
        detached: true,
        env: {
          ...process.env,
          PATH: `${directory}:${process.env.PATH}`,
          SERVER_PID_FILE: join(directory, 'pid'),
        },
        stdio: 'ignore',
      },
    )
    let timer: ReturnType<typeof setTimeout> | undefined
    try {
      const exited = new Promise<number | null>((resolve, reject) => {
        child.once('error', reject)
        child.once('exit', resolve)
      })
      const timeout = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(
          () =>
            reject(
              new Error('postStartCommand is blocking the workspace handoff'),
            ),
          2000,
        )
      })
      assert.equal(await Promise.race([exited, timeout]), 0)
      let serverPid = 0
      for (let attempt = 0; attempt < 100; attempt++) {
        try {
          serverPid = Number(await readFile(join(directory, 'pid'), 'utf8'))
          if (serverPid) break
        } catch {}
        await delay(10)
      }
      assert.ok(serverPid, 'the server must still start')
      process.kill(serverPid, 0)
    } finally {
      clearTimeout(timer)
      if (child.pid) {
        try {
          process.kill(-child.pid, 'SIGKILL')
        } catch {}
      }
      await rm(directory, { recursive: true, force: true })
    }
  },
)
