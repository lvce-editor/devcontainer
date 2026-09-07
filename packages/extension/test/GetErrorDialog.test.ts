import assert from 'node:assert/strict'
import { test } from 'node:test'
import * as GetErrorDialog from '../src/parts/GetErrorDialog/GetErrorDialog.ts'

test('missing Docker has a concise heading, separate code, hint and install action', () => {
  assert.partialDeepStrictEqual(
    GetErrorDialog.getErrorDialog({
      errorCode: 'ENOENT',
      errorMessage: 'CLI stack trace',
      missingDocker: true,
    }),
    {
      actionCommand: 'devcontainer.installDocker',
      actionLabel: 'Install Docker',
      errorCode: 'ENOENT',
      title: 'Error: Docker executable not found',
    },
  )
  assert.ok(
    !GetErrorDialog.getErrorDialog({ missingDocker: true }).message.includes(
      'CLI stack trace',
    ),
  )
})

test('ENOENT alone never offers to install Docker', () => {
  const result = GetErrorDialog.getErrorDialog({
    errorCode: 'ENOENT',
    errorMessage: 'Error: Error: Dockerfile not found',
  })
  assert.equal(result.actionCommand, undefined)
  assert.equal(result.message, 'Dockerfile not found')
})

test('unknown errors have a useful fallback', () => {
  assert.equal(
    GetErrorDialog.getErrorDialog({}).message,
    'Could not open the workspace in a container.',
  )
})
