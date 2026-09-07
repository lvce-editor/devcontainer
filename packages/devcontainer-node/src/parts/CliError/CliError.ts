import { stripVTControlCharacters } from 'node:util'
import * as CliJson from '../CliJson/CliJson.ts'

const getString = (value: unknown, key: string): string => {
  if (!value || typeof value !== 'object') {
    return ''
  }
  const property = (value as Record<string, unknown>)[key]
  return typeof property === 'string' ? property.trim() : ''
}

const parseError = (output: string) => {
  try {
    const { json } = CliJson.parseFinalJson(output)
    if (getString(json, 'outcome') !== 'error') {
      return undefined
    }
    const message = getString(json, 'message')
    const description = getString(json, 'description')
    return {
      errorCode: getString(json, 'errorCode') || getString(json, 'code'),
      errorMessage: [...new Set([description, message].filter(Boolean))].join(
        '\n',
      ),
    }
  } catch {
    return undefined
  }
}

export const getCliError = (
  stdout: string,
  stderr: string,
  dockerPath: string,
) => {
  const cleanStdout = stripVTControlCharacters(stdout).trim()
  const cleanStderr = stripVTControlCharacters(stderr).trim()
  const parsed = parseError(cleanStdout) || parseError(cleanStderr)
  const detail = parsed?.errorMessage || cleanStderr || cleanStdout
  const missingDocker = detail.split('\n').some((line) => {
    return (
      line === `spawn ${dockerPath} ENOENT` ||
      line === `Error: spawn ${dockerPath} ENOENT`
    )
  })
  return {
    errorCode:
      parsed?.errorCode ||
      (missingDocker ? 'ENOENT' : 'DEVCONTAINER_CLI_ERROR'),
    errorMessage: missingDocker
      ? `Docker executable was not found. Install Docker or check its configured path.\n${detail}`
      : detail.slice(-2000),
  }
}
