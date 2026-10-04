import type { ChildProcessWithoutNullStreams } from 'node:child_process'
import type { Server, Socket } from 'node:net'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import * as RunProcess from '../RunProcess/RunProcess.ts'
import { nodeRelay, probe, pythonRelay } from './Relay.ts'

interface Port {
  host: string
  port: number
}
export interface Options {
  containerCli?: string
  containerId: string
  forwardPorts?: unknown
  remoteUser?: string
  workspaceFolder?: string
}
interface Forwarding {
  children: Set<ChildProcessWithoutNullStreams>
  key: string
  servers: Server[]
  sockets: Set<Socket>
}
interface Host {
  runProcess: typeof RunProcess.runProcess
  spawn: (
    command: string,
    args: readonly string[],
  ) => ChildProcessWithoutNullStreams
}

const parsePorts = (value: unknown): Port[] => {
  if (value === undefined) return []
  if (!Array.isArray(value))
    throw new TypeError('forwardPorts must be an array')
  const ports = new Map<number, Port>()
  for (const entry of value) {
    const match =
      typeof entry === 'string'
        ? /^([a-zA-Z0-9_.-]+):(\d+)$/.exec(entry)
        : undefined
    const host = match ? match[1] : '127.0.0.1'
    const port = match ? Number(match[2]) : entry
    if (
      typeof port !== 'number' ||
      !Number.isSafeInteger(port) ||
      port < 1 ||
      port > 65_535
    ) {
      throw new TypeError(`Invalid forwardPorts entry: ${String(entry)}`)
    }
    const existing = ports.get(port)
    if (existing && existing.host !== host)
      throw new Error(
        `forwardPorts declares multiple destinations for host port ${port}`,
      )
    ports.set(port, { host, port })
  }
  return ports.values().toArray()
}

const close = async (value: Forwarding): Promise<void> => {
  for (const socket of value.sockets) socket.destroy()
  for (const child of value.children) child.kill()
  await Promise.all(
    value.servers.map(
      (server) =>
        new Promise<void>((resolve) => {
          server.close(() => resolve())
        }),
    ),
  )
}

const relayArguments = (
  executable: string,
  host: string,
  port: number,
): string[] => {
  if (executable.endsWith('socat'))
    return [executable, '-', `TCP:${host}:${port}`]
  if (executable.endsWith('python3'))
    return [executable, '-c', pythonRelay, host, String(port)]
  return [executable, '-e', nodeRelay, host, String(port)]
}

const createListener = (
  dependencies: Host,
  value: Forwarding,
  containerCli: string,
  execArgs: string[],
  relayArgs: string[],
  port: number,
): Server => {
  return createServer({ allowHalfOpen: true }, (socket) => {
    value.sockets.add(socket)
    const child = dependencies.spawn(containerCli, [...execArgs, ...relayArgs])
    value.children.add(child)
    const dispose = () => {
      socket.destroy()
      child.kill()
    }
    socket.once('error', dispose)
    child.once('error', dispose)
    child.stdin.on('error', dispose)
    child.stdout.on('error', dispose)
    let errorOutput = ''
    child.stderr.on('data', (data: Buffer) => {
      errorOutput = (errorOutput + data.toString()).slice(-4096)
    })
    child.once('close', (code) => {
      value.children.delete(child)
      if (code) {
        console.error(`Devcontainer port ${port} relay failed: ${errorOutput}`)
        socket.destroy()
      } else socket.end()
    })
    socket.once('close', () => {
      value.sockets.delete(socket)
      child.stdin.end()
      child.kill()
    })
    socket.pipe(child.stdin)
    child.stdout.pipe(socket)
  })
}

export const createForwardPorts = (dependencies: Host) => {
  const forwarding = new Map<string, Forwarding>()
  const workspaces = new Map<string, string>()
  const pending = new Map<string, Promise<void>>()

  const stop = async (containerId: string): Promise<void> => {
    for (const [workspace, id] of workspaces) {
      if (id === containerId) workspaces.delete(workspace)
    }
    const current = forwarding.get(containerId)
    forwarding.delete(containerId)
    if (current) await close(current)
  }

  const start = async ({
    containerCli = 'docker',
    containerId,
    forwardPorts,
    remoteUser,
    workspaceFolder,
  }: Options): Promise<void> => {
    const ports = parsePorts(forwardPorts)
    const key = JSON.stringify({ containerCli, ports, remoteUser })
    if (workspaceFolder) {
      const previous = workspaces.get(workspaceFolder)
      if (previous && previous !== containerId) await stop(previous)
    }
    if (forwarding.get(containerId)?.key === key) return
    await stop(containerId)
    if (ports.length === 0) return
    const execArgs = [
      'exec',
      '-i',
      ...(remoteUser ? ['--user', remoteUser] : []),
      containerId,
    ]
    const result = await dependencies.runProcess({
      args: [...execArgs, 'sh', '-c', probe],
      command: containerCli,
    })
    if ('errorMessage' in result || result.exitCode !== 0) {
      throw new Error(
        'Cannot forward devcontainer ports: install socat, Node.js or Python 3 in the container. ' +
          ('errorMessage' in result ? result.errorMessage : result.stderr),
      )
    }
    const executable = result.stdout.trim().split('\n', 1)[0]
    const value: Forwarding = {
      children: new Set(),
      key,
      servers: [],
      sockets: new Set(),
    }
    try {
      for (const { host, port } of ports) {
        const server = createListener(
          dependencies,
          value,
          containerCli,
          execArgs,
          relayArguments(executable, host, port),
          port,
        )
        value.servers.push(server)
        await new Promise<void>((resolve, reject) => {
          const failed = (error: Error) =>
            reject(
              new Error(
                `Cannot forward devcontainer port ${port} on 127.0.0.1:${port}: ${error.message}. Free this host port and reopen the container.`,
              ),
            )
          server.once('error', failed)
          server.listen(port, '127.0.0.1', () => {
            server.off('error', failed)
            resolve()
          })
        })
        server.on('error', (error) =>
          console.error(`Devcontainer port ${port}: ${error.message}`),
        )
      }
      forwarding.set(containerId, value)
      if (workspaceFolder) workspaces.set(workspaceFolder, containerId)
    } catch (error) {
      await close(value)
      throw error
    }
  }

  // Serialize start/stop for each container, including concurrent restoration.
  const enqueue = (
    containerId: string,
    operation: () => Promise<void>,
  ): Promise<void> => {
    const previous = pending.get(containerId) ?? Promise.resolve()
    const current = (async () => {
      try {
        await previous
      } catch {
        // A failed start must not prevent stop or a repaired start.
      }
      await operation()
    })()
    pending.set(containerId, current)
    void current
      .finally(() => {
        if (pending.get(containerId) === current) pending.delete(containerId)
      })
      .catch(() => {})
    return current
  }

  const ensure = (options: Options): Promise<void> =>
    enqueue(options.containerId, () => start(options))
  const remove = (containerId: string): Promise<void> =>
    enqueue(containerId, () => stop(containerId))

  const dispose = (): void => {
    for (const value of forwarding.values()) {
      for (const socket of value.sockets) socket.destroy()
      for (const child of value.children) child.kill()
      for (const server of value.servers) server.close()
    }
    forwarding.clear()
    workspaces.clear()
  }

  return { dispose, ensure, remove }
}

export const { dispose, ensure, remove } = createForwardPorts({
  runProcess: RunProcess.runProcess,
  spawn: (command, args) => spawn(command, [...args], { stdio: 'pipe' }),
})
