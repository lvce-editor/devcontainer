import {
  createOutputChannel,
  executeCommand,
  openOutputView,
} from '@lvce-editor/api'
import * as Rpc from '../Rpc/Rpc.ts'

let output: ReturnType<typeof createOutputChannel> | undefined
let busy = false

export const appendLine = async (text: string): Promise<void> => {
  await output?.appendLine(text)
  await executeCommand('Output.refresh').catch(() => {})
}

export const run = async (
  method: string,
  workspaceFolder: string,
): Promise<unknown> => {
  if (busy) {
    await openOutputView({ channel: 'dev-containers' })
    throw new Error('A Dev Containers operation is already in progress')
  }
  busy = true
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
        await executeCommand('Output.refresh').catch(() => {})
      }
    }
    const poll = async (): Promise<void> => {
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
    }
    // Handle polling failures immediately, without leaving a rejected promise
    // unobserved while a long build is still running.
    const polling = poll().catch(async (error: unknown) => {
      await channel.appendLine(
        `Unable to read build progress: ${String(error)}`,
      )
    })
    try {
      return await Rpc.invoke(method, { progressId, workspaceFolder })
    } finally {
      finished = true
      completed.resolve()
      await polling
      await refresh().catch(() => {})
    }
  } finally {
    busy = false
  }
}
