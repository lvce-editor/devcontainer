import { join } from 'node:path'
import { root } from './root.ts'

export const instantiations = 2000

export const instantiationsPath = join(root, 'packages', 'pty-host')
