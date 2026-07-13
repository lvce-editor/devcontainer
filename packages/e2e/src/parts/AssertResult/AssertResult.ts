const getProperty = (value: unknown, property: string): unknown => {
  if (!value || typeof value !== 'object' || !(property in value)) {
    return undefined
  }
  return value[property as keyof typeof value]
}

export const ok = (result: unknown) => {
  if (getProperty(result, 'ok') !== true) {
    throw new Error(
      `Expected a successful result, received ${JSON.stringify(result)}`,
    )
  }
}

export const status = (result: unknown, expectedStatus: string) => {
  const actualStatus = getProperty(result, 'status')
  if (actualStatus !== expectedStatus) {
    throw new Error(
      `Expected devcontainer status ${expectedStatus}, received ${JSON.stringify(result)}`,
    )
  }
}
