import { createRequire } from 'node:module'
import { join } from 'node:path'
import { root } from './root.ts'

const serverRequire = createRequire(join(root, 'packages/server/package.json'))

export const resolveServerPath = (): string => {
  return serverRequire.resolve('@lvce-editor/server/bin/server.js')
}
