import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as GetErrorDialog from '../src/parts/GetErrorDialog/GetErrorDialog.ts'

await test('missing Docker has a concise heading, separate code, hint and install action', () => {
  assert.partialDeepStrictEqual(
    GetErrorDialog.getErrorDialog({
      errorCode: 'ENOENT',
      errorMessage: 'CLI stack trace',
      missingExecutable: 'docker',
    }),
    {
      actionCommand: 'devcontainer.installDocker',
      actionLabel: 'Install Docker',
      errorCode: 'ENOENT',
      title: 'Error: Docker executable not found',
    },
  )
  assert.ok(
    !GetErrorDialog.getErrorDialog({
      missingExecutable: 'docker',
    }).message.includes('CLI stack trace'),
  )
})

await test('ENOENT alone never offers to install Docker', () => {
  const result = GetErrorDialog.getErrorDialog({
    errorCode: 'ENOENT',
    errorMessage: 'Error: Error: Dockerfile not found',
  })
  assert.equal(result.actionCommand, undefined)
  assert.equal(result.message, 'Dockerfile not found')
})

await test('unknown errors have a useful fallback', () => {
  assert.equal(
    GetErrorDialog.getErrorDialog({}).message,
    'Could not open the workspace in a container.',
  )
})

await test('missing Podman or custom executables never offer to install Docker', () => {
  for (const executable of [
    'podman',
    '/usr/local/bin/podman',
    '/custom/container-engine',
  ]) {
    const result = GetErrorDialog.getErrorDialog({
      errorCode: 'ENOENT',
      missingExecutable: executable,
    })
    assert.equal(result.actionCommand, undefined)
    assert.equal(result.title, 'Error: Container executable not found')
    assert.ok(result.message.includes(executable))
  }
})
