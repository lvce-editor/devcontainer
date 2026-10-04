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

const encodePath = (path: string): string =>
  path
    .split('/')
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment).replaceAll('!', '%21'))
    .join('/')

export const create = (workspaceFolder: string): string => {
  if (!workspaceFolder.startsWith('/')) {
    throw new Error('Invalid devcontainer workspace folder')
  }
  return `devcontainers:///${encodePath(workspaceFolder)}!`
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
    const source = decodeSegments(
      url.pathname.slice(0, separator).split('/').filter(Boolean),
    )
    if (source.length === 0) {
      throw new Error('Invalid devcontainer workspace folder')
    }
    const workspaceFolder = `/${source.join('/')}`
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
