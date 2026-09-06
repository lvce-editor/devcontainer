import type { Test } from '@lvce-editor/test-worker'

const toFileUri = (url: URL): string => {
  return url.protocol === 'file:'
    ? url.href
    : `file://${url.pathname.slice('/remote'.length)}`
}

export const getWorkspaceUri = async (
  { Command }: Pick<Parameters<Test>[0], 'Command'>,
  fixture: string,
): Promise<string> => {
  const source = toFileUri(
    new URL(import.meta.resolve(`../fixtures/${fixture}`)),
  )
  const id = crypto.randomUUID()
  const workspace = toFileUri(
    new URL(
      import.meta.resolve(`../.tmp/fixtures/${fixture}-${id}`),
    ),
  )
  await Command.execute('FileSystem.copy', source, workspace)
  return workspace
}
