export const parse = (uri: string): { id: string; path: string } => {
  const url = new URL(uri)
  if (url.protocol !== 'devcontainers:' || url.host || url.search || url.hash) {
    throw new Error('Invalid devcontainer URI')
  }
  const [, id, ...segments] = url.pathname.split('/')
  if (!id || !/^[a-zA-Z0-9-]+$/.test(id)) {
    throw new Error('Invalid devcontainer id')
  }
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
  return { id, path: decoded.join('/') }
}
