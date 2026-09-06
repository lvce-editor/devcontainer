import type { FileSystemDirent, FileSystemProvider } from '@lvce-editor/api'
import * as Rpc from '../Rpc/Rpc.ts'

const invoke = (
  operation: string,
  uri: string,
  value?: string,
): Promise<unknown> => {
  return Rpc.invoke('DevContainer.fileSystem', operation, uri, value)
}

export const fileSystem: FileSystemProvider = {
  id: 'devcontainers',
  isReadonly: () => false,
  readDirWithFileTypes: async (uri): Promise<readonly FileSystemDirent[]> => {
    return (await invoke(
      'readDirWithFileTypes',
      uri,
    )) as readonly FileSystemDirent[]
  },
  readFile: async (uri): Promise<string> => {
    const result = await invoke('readFile', uri)
    if (typeof result !== 'string') {
      throw new TypeError('Invalid devcontainer file content')
    }
    return new TextDecoder().decode(
      Uint8Array.from(atob(result), (character) => character.charCodeAt(0)),
    )
  },
  writeFile: async (uri, content): Promise<void> => {
    await invoke('writeFile', uri, content)
  },
  mkdir: async (uri): Promise<void> => {
    await invoke('mkdir', uri)
  },
  remove: async (uri): Promise<void> => {
    await invoke('remove', uri)
  },
  rename: async (oldUri, newUri): Promise<void> => {
    await invoke('rename', oldUri, newUri)
  },
}
