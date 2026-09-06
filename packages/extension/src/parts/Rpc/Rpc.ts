import { createNodeRpc } from '@lvce-editor/api'

interface Rpc {
  invoke(method: string, ...params: readonly unknown[]): Promise<unknown>
}

let rpcPromise: Promise<Rpc> | undefined

const createRpc = async (): Promise<Rpc> => {
  return createNodeRpc({
    id: 'builtin.devcontainer.node',
  })
}

export const invoke = async (method: string, ...params: readonly unknown[]) => {
  rpcPromise ||= createRpc()
  const rpc = await rpcPromise
  return rpc.invoke(method, ...params)
}
