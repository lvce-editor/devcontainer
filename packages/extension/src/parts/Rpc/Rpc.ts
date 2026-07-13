import * as ExtensionInfo from '../ExtensionInfo/ExtensionInfo.ts'

interface Rpc {
  invoke(method: string, ...params: readonly unknown[]): Promise<unknown>
}

let rpcPromise: Promise<Rpc> | undefined

const createRpc = async (): Promise<Rpc> => {
  const path = `${ExtensionInfo.getPath()}/dist/devcontainerWorkerModule.js`
  // @ts-ignore
  return vscode.createNodeRpc({
    name: 'Dev Containers',
    path,
  })
}

export const invoke = async (method: string, ...params: readonly unknown[]) => {
  rpcPromise ||= createRpc()
  const rpc = await rpcPromise
  return rpc.invoke(method, ...params)
}
