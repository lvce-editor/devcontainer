const decodeSegments = (segments: string[]): string[] => {
  const decoded = segments.map(decodeURIComponent)
  if (
    decoded.some(
      (segment) =>
        segment === '..' ||
        segment === '.' ||
        segment.includes('/') ||
        segment.includes('\0'),
    )
  ) {
    throw new Error('Invalid devcontainer path')
  }
  return decoded
}

const encodeSegment = (segment: string): string =>
  encodeURIComponent(segment).replaceAll('!', '%21')

export const create = (workspaceFolder: string): string => {
  const windowsPath = /^([a-zA-Z]:)[\\/](.*)$/.exec(workspaceFolder)
  if (!workspaceFolder.startsWith('/') && !windowsPath) {
    throw new Error('Invalid devcontainer workspace folder')
  }
  const sourceSegments = windowsPath
    ? [windowsPath[1], ...windowsPath[2].split(/[\\/]/).filter(Boolean)]
    : workspaceFolder.split('/').filter(Boolean)
  const sourcePath = `/${sourceSegments
    .map((segment, index) =>
      windowsPath && index === 0 ? segment : encodeSegment(segment),
    )
    .join('/')}`
  return `devcontainers://${sourcePath}!`
}

export const parse = (
  uri: string,
): { id: string; path: string; workspaceFolder?: string } => {
  const url = new URL(uri)
  if (url.protocol !== 'devcontainers:' || url.host || url.search || url.hash) {
    throw new Error('Invalid devcontainer URI')
  }
  const separator = url.pathname.indexOf('!')
  if (separator !== -1) {
    const sourcePath = url.pathname.slice(0, separator)
    const source = decodeSegments(sourcePath.split('/').filter(Boolean))
    if (source.length === 0) {
      throw new Error('Invalid devcontainer workspace folder')
    }
    const drive = /^([a-zA-Z]):$/.exec(source[0])
    const workspaceFolder = drive
      ? `${drive[1]}:\\${source.slice(1).join('\\')}`
      : `/${source.join('/')}`
    const rawPath = url.pathname.slice(separator + 1).replace(/^\//, '')
    const path = decodeSegments(rawPath ? rawPath.split('/') : []).join('/')
    return { id: `workspace:${workspaceFolder}`, path, workspaceFolder }
  }
  const [, id, ...segments] = url.pathname.split('/')
  if (!id || !/^[a-zA-Z0-9-]+$/.test(id)) {
    throw new Error('Invalid devcontainer id')
  }
  const decoded = decodeSegments(segments)
  return { id, path: decoded.join('/') }
}
