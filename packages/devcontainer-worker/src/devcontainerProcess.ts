import { NodeRpcProcess } from '@lvce-editor/rpc'
import { commandMap } from './devcontainerWorkerModule.ts'

await NodeRpcProcess.create({ commandMap })
