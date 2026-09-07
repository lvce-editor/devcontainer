import { createDevBuild } from './createDevBuild.ts'

const build = await createDevBuild()
await build.watch()
