import { expect, test } from '@jest/globals'
import * as CliJson from '../src/parts/CliJson/CliJson.js'

test('parseFinalJson - logs before json', () => {
  expect(
    CliJson.parseFinalJson('starting\n{"outcome":"success","containerId":"abc"}'),
  ).toEqual({
    json: {
      containerId: 'abc',
      outcome: 'success',
    },
  })
})

test('parseFinalJson - nested object', () => {
  expect(
    CliJson.parseFinalJson('log\n{"outcome":"success","config":{"name":"app"}}'),
  ).toEqual({
    json: {
      config: {
        name: 'app',
      },
      outcome: 'success',
    },
  })
})

test('parseFinalJson - malformed output', () => {
  expect(() => CliJson.parseFinalJson('not json')).toThrow(
    'Failed to parse devcontainer cli json result',
  )
})

test('parseFinalJson - empty output', () => {
  expect(() => CliJson.parseFinalJson('')).toThrow(
    'Expected devcontainer cli output to contain a json result',
  )
})
