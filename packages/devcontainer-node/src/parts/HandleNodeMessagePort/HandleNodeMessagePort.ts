import * as IpcChild from '../IpcChild/IpcChild.ts'
import * as IpcChildType from '../IpcChildType/IpcChildType.ts'

export const handleNodeMessagePort = async (messagePort) => {
  await IpcChild.listen({
    messagePort,
    method: IpcChildType.NodeMessagePort,
  })
}
