import { execa } from 'execa'
import { root } from './root.ts'

await execa('npm', ['run', 'build'], {
  cwd: root,
  stdio: 'inherit',
})

await Promise.all([
  execa('npm', ['run', 'build:watch'], {
    cwd: root,
    stdio: 'inherit',
  }),
  execa(
    'node',
    [
      'node_modules/@lvce-editor/server/bin/server.js',
      '--only-extension=.tmp/dist',
      '--test-path=packages/e2e',
    ],
    {
      cwd: root,
      stdio: 'inherit',
    },
  ),
])
