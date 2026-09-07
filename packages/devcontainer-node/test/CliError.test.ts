import { expect, test } from '@jest/globals'
import * as CliError from '../src/parts/CliError/CliError.ts'

test('extracts missing Docker from the real CLI output format', () => {
  const stdout = JSON.stringify({
    description: 'An error occurred setting up the container.',
    message: 'spawn /missing docker ENOENT',
    outcome: 'error',
  })
  expect(
    CliError.getCliError(stdout, 'log and stack trace', '/missing docker'),
  ).toEqual({
    errorCode: 'ENOENT',
    errorMessage:
      'Container executable /missing docker was not found. Install it or check devcontainer.containerCli.\nAn error occurred setting up the container.\nspawn /missing docker ENOENT',
    missingExecutable: '/missing docker',
  })
})

test('prefers structured errors over progress logs and preserves their code', () => {
  const stdout =
    'Starting container\n' +
    JSON.stringify({
      code: 'EACCES',
      description: 'Cannot connect to Docker.',
      message: 'Permission denied',
      outcome: 'error',
    })
  expect(CliError.getCliError(stdout, 'progress log', 'docker')).toEqual({
    errorCode: 'EACCES',
    errorMessage: 'Cannot connect to Docker.\nPermission denied',
  })
})

test('accepts a structured error on stderr and avoids duplicate messages', () => {
  const stderr = JSON.stringify({
    description: 'Build failed',
    errorCode: 'BUILD_FAILED',
    message: 'Build failed',
    outcome: 'error',
  })
  expect(CliError.getCliError('', stderr, 'docker')).toEqual({
    errorCode: 'BUILD_FAILED',
    errorMessage: 'Build failed',
  })
})

test.each([
  ['{invalid json', 'Build failed', 'Build failed'],
  [
    'malformed {json',
    'Cannot connect to the Docker daemon',
    'Cannot connect to the Docker daemon',
  ],
  ['Command failed', '', 'Command failed'],
  ['', '', ''],
  [
    '{"outcome":"error","message":42,"description":null}',
    'Build failed',
    'Build failed',
  ],
  ['', '\u{001B}[31mPermission denied\u{001B}[0m', 'Permission denied'],
])('falls back to text output (%s, %s)', (stdout, stderr, errorMessage) => {
  expect(CliError.getCliError(stdout, stderr, 'docker')).toEqual({
    errorCode: 'DEVCONTAINER_CLI_ERROR',
    errorMessage,
  })
})

test('does not diagnose missing Docker for a missing container file', () => {
  const stdout = JSON.stringify({
    message: 'ENOENT: no such file or directory, open /workspace/Dockerfile',
    outcome: 'error',
  })
  expect(CliError.getCliError(stdout, '', 'docker')).toEqual({
    errorCode: 'DEVCONTAINER_CLI_ERROR',
    errorMessage:
      'ENOENT: no such file or directory, open /workspace/Dockerfile',
  })
})

test('keeps the end of long fallback logs for the dialog', () => {
  const stderr = 'progress\n'.repeat(1000) + 'Build failed'
  const result = CliError.getCliError('', stderr, 'docker')
  expect(result.errorMessage).toHaveLength(2000)
  expect(result.errorMessage.endsWith('Build failed')).toBe(true)
})
