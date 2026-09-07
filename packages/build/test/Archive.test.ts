import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtemp, readFile, realpath, rm, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { test } from 'node:test'
import { brotliDecompressSync } from 'node:zlib'
import { root } from '../src/root.ts'

test('the release archive includes a runnable devcontainer CLI', async () => {
  const directory = await realpath(
    await mkdtemp(join(tmpdir(), 'devcontainer-archive-')),
  )
  try {
    const archive = await readFile(join(root, 'extension.tar.br'))
    const tarPath = join(directory, 'extension.tar')
    await writeFile(tarPath, brotliDecompressSync(archive))
    execFileSync('tar', ['-xf', tarPath, '-C', directory])

    const require = createRequire(
      join(directory, 'dist/devcontainerProcess.js'),
    )
    const nodePackage = JSON.parse(
      await readFile(
        join(root, 'packages/devcontainer-node/package.json'),
        'utf8',
      ),
    )
    const extensionPackage = JSON.parse(
      await readFile(join(directory, 'package.json'), 'utf8'),
    )
    for (const [name, versionRange] of Object.entries(
      nodePackage.dependencies,
    )) {
      assert.equal(extensionPackage.dependencies[name], versionRange)
      const dependency = JSON.parse(
        await readFile(
          join(directory, 'node_modules', name, 'package.json'),
          'utf8',
        ),
      )
      assert.equal(dependency.name, name)
    }
    const cliPath = require.resolve('@devcontainers/cli/devcontainer.js')
    assert.ok(cliPath.startsWith(join(directory, 'node_modules')))
    const cliPackage = require('@devcontainers/cli/package.json')
    const version = execFileSync(process.execPath, [cliPath, '--version'], {
      cwd: directory,
      encoding: 'utf8',
    })
    assert.equal(version.trim(), cliPackage.version)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
