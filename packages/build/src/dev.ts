import { execa } from 'execa'
import { resolveServerPath } from './resolveServerPath.ts'
import { createDevBuild } from './createDevBuild.ts'
import { root } from './root.ts'

const build = await createDevBuild()
try {
  await Promise.all([
    build.watch(),
    execa(
      process.execPath,
      [
        resolveServerPath(),
        '--only-extension=.tmp/dev',
        '--test-path=packages/e2e',
        '--link=node_modules/@lvce-editor/test-worker',
      ],
      {
        cwd: root,
        stdio: 'inherit',
      },
    ),
  ])
} finally {
  await build.dispose()
}
