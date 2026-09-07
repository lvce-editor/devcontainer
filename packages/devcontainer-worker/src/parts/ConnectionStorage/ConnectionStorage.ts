import { createHash, randomUUID } from 'node:crypto'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { isAbsolute, join } from 'node:path'

interface Connection {
  containerCli?: string
  containerId: string
  remoteUser?: string
  remoteWorkspaceFolder: string
  workspaceFolder: string
}

const directory = () =>
  process.env.LVCE_DEVCONTAINER_CONNECTIONS_DIR ||
  join(homedir(), '.lvce', 'devcontainers')
const filePath = (key: string) =>
  join(directory(), `${createHash('sha256').update(key).digest('hex')}.json`)

const write = async (key: string, connection: Connection): Promise<void> => {
  await mkdir(directory(), { mode: 0o700, recursive: true })
  const destination = filePath(key)
  const temporary = `${destination}.${randomUUID()}.tmp`
  try {
    await writeFile(temporary, JSON.stringify(connection), { mode: 0o600 })
    await rename(temporary, destination)
  } finally {
    await rm(temporary, { force: true })
  }
}

export const save = async (connection: Connection): Promise<void> => {
  await write(connection.containerId, connection)
  await write(connection.workspaceFolder, connection)
}

export const read = async (key: string): Promise<Connection | undefined> => {
  let text: string
  try {
    text = await readFile(filePath(key), 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return undefined
    }
    throw error
  }
  const value = JSON.parse(text) as Partial<Connection>
  if (
    !value ||
    typeof value.containerId !== 'string' ||
    (value.containerCli !== undefined &&
      (typeof value.containerCli !== 'string' || !value.containerCli.trim())) ||
    typeof value.workspaceFolder !== 'string' ||
    !isAbsolute(value.workspaceFolder) ||
    typeof value.remoteWorkspaceFolder !== 'string' ||
    !value.remoteWorkspaceFolder.startsWith('/') ||
    (value.remoteUser !== undefined && typeof value.remoteUser !== 'string') ||
    (key !== value.containerId && key !== value.workspaceFolder)
  ) {
    throw new Error('Invalid stored devcontainer connection')
  }
  return value as Connection
}

export const remove = async (connection: Connection): Promise<void> => {
  await rm(filePath(connection.containerId), { force: true })
  const local = await read(connection.workspaceFolder)
  if (local?.containerId === connection.containerId) {
    await rm(filePath(connection.workspaceFolder), { force: true })
  }
}
