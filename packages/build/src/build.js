import { execa } from 'execa'
import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { bundleJs } from './bundleJs.js'
import { root } from './root.js'

const dist = join(root, '.tmp', 'dist')

const readJson = async (path) => {
  const content = await readFile(path, 'utf8')
  return JSON.parse(content)
}

const writeJson = async (path, json) => {
  await writeFile(path, JSON.stringify(json, null, 2) + '\n')
}

const getGitTagFromGit = async () => {
  const { stdout, stderr, exitCode } = await execa(
    'git',
    ['describe', '--exact-match', '--tags'],
    {
      reject: false,
    },
  )
  if (exitCode) {
    if (
      exitCode === 128 &&
      stderr.startsWith('fatal: no tag exactly matches')
    ) {
      return '0.0.0-dev'
    }
    return '0.0.0-dev'
  }
  if (stdout.startsWith('v')) {
    return stdout.slice(1)
  }
  return stdout
}

const getVersion = async () => {
  const { env } = process
  const { RG_VERSION, GIT_TAG } = env
  if (RG_VERSION) {
    if (RG_VERSION.startsWith('v')) {
      return RG_VERSION.slice(1)
    }
    return RG_VERSION
  }
  if (GIT_TAG) {
    if (GIT_TAG.startsWith('v')) {
      return GIT_TAG.slice(1)
    }
    return GIT_TAG
  }
  return getGitTagFromGit()
}

await rm(dist, { recursive: true, force: true })
await mkdir(dist, { recursive: true })

await bundleJs()

const version = await getVersion()

const packageJson = await readJson(
  join(root, 'packages', 'pty-host', 'package.json'),
)

delete packageJson.scripts
delete packageJson.devDependencies
delete packageJson.prettier
delete packageJson.jest
delete packageJson.xo
delete packageJson.directories
delete packageJson.nodemonConfig
delete packageJson.dependencies['@lvce-editor/assert']
delete packageJson.dependencies['@lvce-editor/rpc']
delete packageJson.dependencies['@lvce-editor/verror']
delete packageJson.dependencies['@lvce-editor/ipc']
delete packageJson.dependencies['@lvce-editor/json-rpc']
delete packageJson.dependencies['@lvce-editor/pretty-error']
delete packageJson.dependencies['debug']
packageJson.version = version
packageJson.main = 'dist/ptyHostMain.js'

await writeJson(join(dist, 'package.json'), packageJson)

await cp(join(root, 'README.md'), join(dist, 'README.md'))
await cp(join(root, 'LICENSE'), join(dist, 'LICENSE'))

await cp(join(root, 'bin'), join(root, '.tmp', 'dist', 'bin'), {
  recursive: true,
})

const oldContent = await readFile(join(root, 'bin', 'ptyHost.js'), 'utf8')
const newContent = oldContent.replace(
  'src/ptyHostMain.js',
  'dist/ptyHostMain.js',
)
await writeFile(join(root, '.tmp', 'dist', 'bin', 'ptyHost.js'), newContent)
