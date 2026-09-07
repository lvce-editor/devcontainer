import { expect, test } from '@jest/globals'
import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'
import * as GetDockerInstallCommand from '../src/parts/GetDockerInstallCommand/GetDockerInstallCommand.ts'

const run = promisify(execFile)

test.each(['darwin', 'win32'])('selects Docker Desktop on %s', (platform) => {
  const command = GetDockerInstallCommand.getDockerInstallCommand(platform)
  expect(command).toContain(
    platform === 'darwin'
      ? 'brew install --cask docker-desktop'
      : 'winget install --exact --id Docker.DockerDesktop',
  )
  expect(command).not.toContain('rootless')
})

test('unsupported hosts do not receive a guessed install command', () => {
  expect(() =>
    GetDockerInstallCommand.getDockerInstallCommand('freebsd'),
  ).toThrow('not supported')
})

test.each([false, true])(
  'rootless installer download failure=%s never executes partial downloads',
  async (fail) => {
    if (process.platform !== 'linux') return
    const directory = await mkdtemp(join(tmpdir(), 'docker install test '))
    const bin = join(directory, 'bin')
    const temporary = join(directory, 'temporary files')
    const marker = join(directory, 'executed')
    await mkdir(bin)
    await mkdir(temporary)
    await writeFile(
      join(bin, 'curl'),
      `#!/bin/sh
printf 'printf installed > "$MARKER"' > "$4"
exit ${fail ? 22 : 0}
`,
      { mode: 0o755 },
    )
    try {
      const command = GetDockerInstallCommand.getDockerInstallCommand('linux')
      expect(command).not.toContain('sudo')
      const promise = run('sh', ['-c', command], {
        env: {
          ...process.env,
          MARKER: marker,
          PATH: `${bin}:${process.env.PATH}`,
          TMPDIR: temporary,
        },
      })
      if (fail) {
        await expect(promise).rejects.toMatchObject({ code: 22 })
        await expect(readFile(marker)).rejects.toMatchObject({ code: 'ENOENT' })
      } else {
        await promise
        expect(await readFile(marker, 'utf8')).toBe('installed')
      }
      const { readdir } = await import('node:fs/promises')
      expect(await readdir(temporary)).toEqual([])
    } finally {
      await rm(directory, { force: true, recursive: true })
    }
  },
)
