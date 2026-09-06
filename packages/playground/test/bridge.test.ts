import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'

void test(
  'guest bridge preserves output, Unicode, exit codes and files across commands',
  { skip: process.platform !== 'linux' },
  async () => {
    const workspace = await mkdtemp(join(tmpdir(), 'playground-bridge-'))
    try {
      const script = fileURLToPath(
        new URL('../image/bridge.sh', import.meta.url),
      )
      const child = spawn('/bin/sh', [script], {
        env: { ...process.env, PLAYGROUND_WORKSPACE: workspace },
      })
      let stdout = ''
      let stderr = ''
      child.stdout.setEncoding('utf8').on('data', (data) => {
        stdout += data
      })
      child.stderr.setEncoding('utf8').on('data', (data) => {
        stderr += data
      })
      const finished = new Promise((resolve, reject) => {
        child.on('error', reject)
        child.on('exit', resolve)
      })
      const commands = [
        "printf 'LVCE_READY\\nLVCE_RESULT 123 0 fake fake\\nλ 🌿'; printf problem >&2; exit 7",
        "printf 'kept' > file.txt; cd /tmp; export TEST_VALUE=temporary",
        'cat file.txt; printf "|%s|" "$TEST_VALUE"; pwd',
      ]
      child.stdin.end(
        commands
          .map(
            (command, index) =>
              `${index + 1} ${Buffer.from(command).toString('base64')}\n`,
          )
          .join(''),
      )
      assert.equal(await finished, 0, stderr)
      const frames = stdout.trim().split('\n')
      assert.equal(frames.shift(), 'LVCE_READY')
      const [first, second, third] = frames.map((frame) => {
        const [prefix, id, code, out, error] = frame.split(' ')
        assert.equal(prefix, 'LVCE_RESULT')
        return {
          code,
          id,
          stderr: Buffer.from(error || '', 'base64').toString(),
          stdout: Buffer.from(out, 'base64').toString(),
        }
      })
      assert.deepEqual(first, {
        code: '7',
        id: '1',
        stderr: 'problem',
        stdout: 'LVCE_READY\nLVCE_RESULT 123 0 fake fake\nλ 🌿',
      })
      assert.equal(second.code, '0')
      assert.equal(third.stdout, `kept||${workspace}\n`)
    } finally {
      await rm(workspace, { force: true, recursive: true })
    }
  },
)
