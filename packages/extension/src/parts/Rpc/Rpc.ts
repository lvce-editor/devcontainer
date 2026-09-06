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
  console.info('[DEBUG-devcontainer-reopen] request', method, JSON.stringify(params))
  try {
    const result = await rpc.invoke(method, ...params)
    console.info('[DEBUG-devcontainer-reopen] response', method, JSON.stringify(result))
    return result
  } catch (error) {
    console.info('[DEBUG-devcontainer-reopen] error', method, String(error))
    throw error
  }
}
