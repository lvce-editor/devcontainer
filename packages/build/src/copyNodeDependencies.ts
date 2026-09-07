import { execa } from 'execa'
import { cp } from 'node:fs/promises'
import { join, relative } from 'node:path'
import { root } from './root.ts'

interface Dependency {
  dependencies?: Record<string, Dependency>
  path?: string
}

const collectPaths = (dependency: Dependency, paths: Set<string>): void => {
  if (dependency.path) {
    paths.add(dependency.path)
  }
  for (const child of Object.values(dependency.dependencies || {})) {
    collectPaths(child, paths)
  }
}

export const copyNodeDependencies = async (dist: string): Promise<void> => {
  const { stdout } = await execa(
    'npm',
    [
      'ls',
      '--workspace=packages/devcontainer-node',
      '--omit=dev',
      '--all',
      '--json',
      '--long',
    ],
    { cwd: root },
  )
  const tree = JSON.parse(stdout)
  const dependencies =
    tree.dependencies['@lvce-editor/devcontainer-node'].dependencies
  const paths = new Set<string>()
  for (const dependency of Object.values(dependencies) as Dependency[]) {
    collectPaths(dependency, paths)
  }
  for (const path of paths) {
    await cp(path, join(dist, relative(root, path)), {
      dereference: true,
      recursive: true,
    })
  }
}
