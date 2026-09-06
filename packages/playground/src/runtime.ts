export interface Result {
  errorCode?: string
  errorMessage?: string
  exitCode?: number
  json?: Record<string, unknown>
  ok: boolean
  stderr?: string
  stdout?: string
}
const failure = (errorMessage: string): Result => ({ errorMessage, ok: false })
const encode = (value: string) =>
  btoa(String.fromCharCode(...new TextEncoder().encode(value)))
const decode = (value: string) =>
  new TextDecoder().decode(
    Uint8Array.from(atob(value), (char) => char.charCodeAt(0)),
  )

export class Runtime {
  private worker?: Worker
  private pending = new Map<number, (result: Result) => void>()
  private ready?: (result: Result) => void
  private timer?: ReturnType<typeof setTimeout>
  private commandTimer?: ReturnType<typeof setTimeout>
  private sequence = 0
  private queue: Promise<unknown> = Promise.resolve()
  private progress: (message: string) => void
  private createWorker: () => Worker
  constructor(
    progress: (message: string) => void,
    createWorker = () =>
      new Worker(new URL('runtime-worker.js', import.meta.url), {
        type: 'module',
      }),
  ) {
    this.progress = progress
    this.createWorker = createWorker
  }

  start(): Promise<Result> {
    if (this.worker)
      return Promise.resolve(failure('The environment is already started'))
    return new Promise((resolve) => {
      this.ready = resolve
      try {
        const worker = this.createWorker()
        this.worker = worker
        this.timer = setTimeout(
          () =>
            this.fail(
              'Linux did not start within 120 seconds. Stop and try again.',
            ),
          120_000,
        )
        worker.onerror = (event) => {
          event.preventDefault()
          this.fail(
            'Linux failed to load. Check your connection and try Start again.',
          )
        }
        worker.onmessage = ({ data }) => {
          if (this.worker !== worker) return
          switch (data.type) {
            case 'error': {
              this.fail(`Linux failed: ${String(data.message).slice(0, 500)}`)
              break
            }
            case 'ready': {
              clearTimeout(this.timer)
              this.ready?.({
                json: {
                  containerId: 'browser-alpine',
                  remoteUser: 'root',
                  remoteWorkspaceFolder: '/workspace',
                },
                ok: true,
              })
              this.ready = undefined

              break
            }
            case 'result': {
              clearTimeout(this.commandTimer)
              const finish = this.pending.get(data.id)
              this.pending.delete(data.id)
              try {
                finish?.({
                  exitCode: data.exitCode,
                  ok: data.exitCode === 0,
                  stderr: decode(data.stderr || ''),
                  stdout: decode(data.stdout || ''),
                })
              } catch {
                this.fail(
                  'Linux returned an invalid command response. Start again.',
                )
              }

              break
            }
            default:
              if (data.type === 'progress' && data.message)
                this.progress(data.message)
          }
        }
        worker.postMessage({ type: 'boot' })
      } catch (error) {
        this.fail(`Unable to start Linux: ${String(error)}`)
      }
    })
  }

  exec(command: string): Promise<Result> {
    if (command.length > 8192)
      return Promise.resolve(failure('Commands are limited to 8 KiB'))
    const { worker } = this
    const run = async (): Promise<Result> => {
      if (!worker || this.worker !== worker)
        return failure('The environment was stopped')
      const id = ++this.sequence
      return new Promise((resolve) => {
        this.pending.set(id, resolve)
        this.commandTimer = setTimeout(
          () => this.fail('Command timed out. Start again to reset Linux.'),
          45_000,
        )
        worker.postMessage({ command: encode(command), id, type: 'exec' })
      })
    }
    const result = this.queue.then(run)
    this.queue = result.catch(() => {})
    return result
  }

  private fail(message: string) {
    this.stop(message)
  }

  stop(message = 'The environment was stopped'): Result {
    this.worker?.terminate()
    this.worker = undefined
    clearTimeout(this.timer)
    clearTimeout(this.commandTimer)
    this.ready?.(failure(message))
    this.ready = undefined
    for (const finish of this.pending.values()) finish(failure(message))
    this.pending.clear()
    this.queue = Promise.resolve()
    return { ok: true }
  }
}
