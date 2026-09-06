import { rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { cleanupContainers } from './cleanup-containers.js'

export default async () => {
  const workspacesPath = fileURLToPath(
    new URL('../.tmp/fixtures', import.meta.url),
  )
  await cleanupContainers(workspacesPath)
  await rm(workspacesPath, { force: true, recursive: true })
}
