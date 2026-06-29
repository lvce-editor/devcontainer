export interface ErrorResult {
  errorCode: string | undefined
  errorMessage: string
  errorStack: string | undefined
}

export const serializeError = (error: unknown): ErrorResult => {
  if (error && typeof error === 'object') {
    return {
      errorCode:
        'code' in error && typeof error.code === 'string'
          ? error.code
          : undefined,
      errorMessage:
        'message' in error && typeof error.message === 'string'
          ? error.message
          : 'Unknown error',
      errorStack:
        'stack' in error && typeof error.stack === 'string'
          ? error.stack
          : undefined,
    }
  }
  if (typeof error === 'string') {
    return {
      errorCode: undefined,
      errorMessage: error,
      errorStack: undefined,
    }
  }
  return {
    errorCode: undefined,
    errorMessage: 'Unknown error',
    errorStack: undefined,
  }
}
