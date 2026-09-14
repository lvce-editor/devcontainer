import { stripVTControlCharacters } from 'node:util'
import * as CliJson from '../CliJson/CliJson.ts'

const getString = (value: unknown, key: string): string => {
  if (!value || typeof value !== 'object') {
    return ''
  }
  const property = (value as Record<string, unknown>)[key]
  return typeof property === 'string' ? property.trim() : ''
}

const getOutputDetails = (stdout: string, stderr: string): string => {
  const cleanStdout = stripVTControlCharacters(stdout).trim()
  const cleanStderr = stripVTControlCharacters(stderr).trim()
  return [
    cleanStderr ? `Standard error:\n${cleanStderr}` : '',
    cleanStdout ? `Standard output:\n${cleanStdout}` : '',
  ]
    .filter(Boolean)
    .join('\n')
    .slice(-2000)
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
    ...(missingDocker && { missingExecutable: dockerPath }),
    errorCode:
      parsed?.errorCode ||
      (missingDocker ? 'ENOENT' : 'DEVCONTAINER_CLI_ERROR'),
    errorMessage: missingDocker
      ? `Container executable ${dockerPath} was not found. Install it or check devcontainer.containerCli.\n${detail}`
      : detail.slice(-2000),
  }
}

export const getCliJsonError = (
  commandName: string,
  parseError: string,
  exitCode: number | null,
  stdout: string,
  stderr: string,
) => {
  const outputDetails = getOutputDetails(stdout, stderr)
  const status =
    exitCode === null
      ? 'was terminated before it completed'
      : `exited with code ${exitCode}`
  const cause = outputDetails
    ? `The CLI output did not contain a usable JSON result.\n${outputDetails}`
    : 'The CLI returned no output. Check that the configured container runtime is installed and running, then try again.'
  return {
    errorCode: 'DEVCONTAINER_JSON_PARSE_ERROR',
    errorMessage: [
      `${commandName} ${status} without a usable JSON result (${parseError}).`,
      cause,
    ].join('\n'),
  }
}
