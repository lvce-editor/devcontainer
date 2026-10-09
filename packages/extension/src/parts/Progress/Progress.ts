import {
  createOutputChannel,
  executeCommand,
  openOutputView,
  showNotification,
} from '@lvce-editor/api'
import * as Rpc from '../Rpc/Rpc.ts'

let output: ReturnType<typeof createOutputChannel> | undefined
let busy = false
let monitorGeneration = 0

const refreshOutput = async (): Promise<void> => {
  try {
    await executeCommand('Output.refresh')
  } catch {
    // The user may have closed the Output view during startup.
  }
}

export const appendLine = async (text: string): Promise<void> => {
  await output?.appendLine(text)
  await refreshOutput()
}

export const run = async (
  method: string,
  workspaceFolder: string,
  containerCli: string,
): Promise<unknown> => {
  if (busy) {
    await openOutputView({ channel: 'dev-containers' })
    throw new Error('A Dev Containers operation is already in progress')
  }
  busy = true
  const generation = ++monitorGeneration
  try {
    output ||= createOutputChannel('dev-containers')
    const channel = output
    const header = `Starting Dev Containers for ${workspaceFolder}…\n`
    await channel.replace(header)
    await openOutputView({ channel: 'dev-containers' })
    const progressId = crypto.randomUUID()
    const completed = Promise.withResolvers<void>()
    let finished = false
    let previous = ''
    const refresh = async (): Promise<void> => {
      const text = await Rpc.invoke('DevContainer.getProgress', progressId)
      if (typeof text === 'string' && text !== previous) {
        previous = text
        await channel.replace(header + text)
        // Extension output storage currently has no change notifications. Refresh
        // the visible channel without reopening the panel or changing selection.
        await refreshOutput()
      }
    }
    const poll = async (): Promise<void> => {
      try {
        while (!finished) {
          let timer: ReturnType<typeof setTimeout> | undefined
          try {
            await Promise.race([
              completed.promise,
              new Promise<void>((resolve) => {
                timer = setTimeout(resolve, 250)
              }),
            ])
          } finally {
            clearTimeout(timer)
          }
          if (!finished) await refresh()
        }
      } catch (error) {
        await appendLine(`Unable to read build progress: ${String(error)}`)
      }
    }
    const polling = poll()
    try {
      const result = await Rpc.invoke(method, {
        containerCli,
        progressId,
        workspaceFolder,
      })
      if (result && typeof result === 'object' && 'ok' in result && result.ok) {
        // Lifecycle commands have their own lifetime; they do not hold the
        // startup guard while the editor is connected to the container.
        setTimeout(() => {
          void monitorLifecycle(workspaceFolder, generation)
        }, 0)
      }
      return result
    } finally {
      finished = true
      completed.resolve()
      await polling
      try {
        await refresh()
      } catch {
        // Preserve the startup result if its RPC connection has closed.
      }
    }
  } finally {
    busy = false
  }
}

const monitorLifecycle = async (
  workspaceFolder: string,
  generation: number,
): Promise<void> => {
  let previous = ''
  try {
    while (generation === monitorGeneration) {
      const state = (await Rpc.invoke(
        'DevContainer.getLifecycleProgress',
        workspaceFolder,
      )) as { errorMessage?: string; output: string; running: boolean }
      if (generation !== monitorGeneration) return
      if (state.output !== previous) {
        const text = state.output.startsWith(previous)
          ? state.output.slice(previous.length)
          : state.output
        previous = state.output
        await appendLine(text)
      }
      if (state.errorMessage)
        await showNotification('error', state.errorMessage)
      if (!state.running) return
      await new Promise<void>((resolve) => setTimeout(resolve, 250))
    }
  } catch (error) {
    if (generation === monitorGeneration) {
      await appendLine(`Unable to read lifecycle progress: ${String(error)}`)
    }
  }
}
