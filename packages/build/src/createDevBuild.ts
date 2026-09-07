import { context } from 'esbuild'
import type { BuildContext } from 'esbuild'
import { cp, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { root } from './root.ts'

export const createDevBuild = async (
  directory = join(root, '.tmp', 'dev'),
  entry = join(root, 'packages/extension/src/devcontainerMain.ts'),
): Promise<BuildContext> => {
  const dist = join(directory, 'dist')
  await mkdir(dist, { recursive: true })
  const nodeEntry = pathToFileURL(
    join(root, 'packages/devcontainer-worker/src/devcontainerProcess.ts'),
  ).href
  await Promise.all([
    cp(
      join(root, 'packages/extension/extension.json'),
      join(directory, 'extension.json'),
    ),
    writeFile(join(directory, 'package.json'), '{"type":"module"}\n'),
    writeFile(
      join(dist, 'devcontainerProcess.js'),
      `import ${JSON.stringify(nodeEntry)}\n`,
    ),
  ])
  const build = await context({
    bundle: true,
    entryPoints: [entry],
    external: ['electron', 'execa', 'ws', 'debug'],
    format: 'esm',
    outfile: join(dist, 'devcontainerMain.js'),
    platform: 'node',
  })
  try {
    // The extension must be loadable as soon as the server accepts requests.
    await build.rebuild()
    return build
  } catch (error) {
    await build.dispose()
    throw error
  }
}
