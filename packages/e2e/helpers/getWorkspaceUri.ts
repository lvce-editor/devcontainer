export const getWorkspaceUri = (fixture: string): string => {
  const url = new URL(import.meta.resolve(`../.tmp/fixtures/${fixture}`))
  return url.protocol === 'file:'
    ? url.href
    : `file://${url.pathname.slice('/remote'.length)}`
}
