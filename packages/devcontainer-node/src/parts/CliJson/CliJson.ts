export interface ParseFinalJsonResult {
  json: unknown
}

export const parseFinalJson = (stdout: string): ParseFinalJsonResult => {
  const trimmed = stdout.trim()
  if (!trimmed) {
    throw new Error('Expected devcontainer cli output to contain a json result')
  }

  for (let index = trimmed.lastIndexOf('{'); index >= 0; index = trimmed.lastIndexOf('{', index - 1)) {
    const candidate = trimmed.slice(index)
    try {
      return {
        json: JSON.parse(candidate),
      }
    } catch {
      // Continue scanning backwards: devcontainer output may contain log lines
      // before the final JSON object.
    }
  }

  throw new Error('Failed to parse devcontainer cli json result')
}
