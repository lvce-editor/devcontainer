import { execa } from 'execa'
import { createDevBuild } from './createDevBuild.ts'
import { root } from './root.ts'

const build = await createDevBuild()
try {
  await Promise.all([
    build.watch(),
    execa(
      process.execPath,
      [
        'node_modules/@lvce-editor/server/bin/server.js',
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
