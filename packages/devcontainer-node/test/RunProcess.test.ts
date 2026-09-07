import { expect, test } from '@jest/globals'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runProcess } from '../src/parts/RunProcess/RunProcess.ts'

test('streams stdout and stderr before exit and preserves split UTF-8', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'devcontainer-progress-'))
  const release = join(directory, 'release')
  const messages: string[] = []
  let finished = false
  const pending = runProcess({
    command: process.execPath,
    args: [
      '--input-type=module',
      '-e',
      `
      import { existsSync } from 'node:fs'
      process.stdout.write(Buffer.from([0xe2]))
      setTimeout(() => {
        process.stdout.write(Buffer.from([0x9c, 0x93, 0x0a]))
        process.stderr.write('building layer 1\\n')
      }, 20)
      const timer = setInterval(() => { if (existsSync(process.argv[1])) { clearInterval(timer) } }, 10)
    `,
      release,
    ],
    onOutput: (text) => messages.push(text),
  }).then((result) => {
    finished = true
    return result
  })
  try {
    for (
      let attempt = 0;
      attempt < 100 && !messages.join('').includes('building layer 1');
      attempt++
    ) {
      await new Promise((resolve) => setTimeout(resolve, 10))
    }
    expect(finished).toBe(false)
    expect(messages.join('')).toContain('✓\n')
    expect(messages.join('')).toContain('building layer 1\n')
  } finally {
    await writeFile(release, '')
    const result = await pending
    await rm(directory, { recursive: true, force: true })
    expect(result).toEqual({
      exitCode: 0,
      stdout: '✓\n',
      stderr: 'building layer 1\n',
    })
  }
})
