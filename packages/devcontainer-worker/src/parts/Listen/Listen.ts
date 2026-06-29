import * as IpcChild from '../IpcChild/IpcChild.ts'
import * as IpcChildType from '../IpcChildType/IpcChildType.ts'

export const listen = async () => {
  await IpcChild.listen({ method: IpcChildType.Auto() })
}
