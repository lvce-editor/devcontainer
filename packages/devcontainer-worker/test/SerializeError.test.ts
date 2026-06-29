import { expect, test } from '@jest/globals'
import * as SerializeError from '../src/parts/SerializeError/SerializeError.js'

test('serializeError - error with code', () => {
  const error = new Error('test error') as Error & { code: string }
  error.code = 'ERR_TEST'

  const result = SerializeError.serializeError(error)

  expect(result).toEqual({
    errorCode: 'ERR_TEST',
    errorMessage: 'test error',
    errorStack: error.stack,
  })
})

test('serializeError - object with message', () => {
  const result = SerializeError.serializeError({
    code: 'ERR_TEST',
    message: 'test error',
    stack: 'stack',
  })

  expect(result).toEqual({
    errorCode: 'ERR_TEST',
    errorMessage: 'test error',
    errorStack: 'stack',
  })
})

test('serializeError - string', () => {
  const result = SerializeError.serializeError('test error')

  expect(result).toEqual({
    errorCode: undefined,
    errorMessage: 'test error',
    errorStack: undefined,
  })
})

test('serializeError - unknown value', () => {
  const result = SerializeError.serializeError({})

  expect(result).toEqual({
    errorCode: undefined,
    errorMessage: 'Unknown error',
    errorStack: undefined,
  })
})
