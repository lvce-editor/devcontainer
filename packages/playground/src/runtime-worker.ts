import { openpty } from 'xterm-pty'

const scope = globalThis as any
let input: ((data: string) => void) | undefined
const decoder = new TextDecoder()
let output = ''
const send = (value: unknown) => scope.postMessage(value)

const boot = async () => {
  const { master, slave } = openpty()
  // The PTY's terminal facade runs in this worker, with no DOM dependency.
  master.activate({
    onBinary() {
      return { dispose() {} }
    },
    onData(callback: (data: string) => void) {
      input = callback
      return { dispose() {} }
    },
    onResize() {
      return { dispose() {} }
    },
    write(bytes: Uint8Array, done: () => void) {
      output += decoder.decode(bytes, { stream: true })
      if (output.length > 6 * 1024 * 1024)
        throw new Error('Guest output exceeded the limit')
      let newline: number
      while ((newline = output.indexOf('\n')) !== -1) {
        const line = output.slice(0, newline).replaceAll('\r', '')
        output = output.slice(newline + 1)
        if (line === 'LVCE_READY') send({ type: 'ready' })
        else if (line.startsWith('LVCE_RESULT ')) {
          const [, id, code, stdout, stderr] = line.split(' ')
          send({
            exitCode: Number(code),
            id: Number(id),
            stderr,
            stdout,
            type: 'result',
          })
        }
      }
      done()
    },
  } as any)
  const module: any = {
    locateFile: (name: string) =>
      new URL(`./runtime/${name}`, scope.location.href).href,
    mainScriptUrlOrBlob: new URL('runtime/out.js', scope.location.href).href,
    onAbort: (message: string) => send({ message: message, type: 'error' }),
    preRun: [],
    printErr: (message: string) => send({ message, type: 'log' }),
    pty: slave,
    setStatus: (message: string) => send({ message, type: 'progress' }),
  }
  scope.Module = module
  await import(new URL('runtime/load.js', scope.location.href).href)
  await import(new URL('runtime/arg-module.js', scope.location.href).href)
  module.preRun.push((mod: any) => {
    try {
      mod.FS.mkdir('/pack')
    } catch {
      /* Generated loader may create it first. */
    }
    mod.FS.writeFile('/pack/info', `t:${Math.round(Date.now() / 1000)}\n`)
    const callbacks = new Set<any>()
    slave.onReadable(() => {
      for (const callback of callbacks) callback()
      callbacks.clear()
    })
    mod.TTY.stream_ops.poll = (
      _stream: unknown,
      _timeout: unknown,
      callback: any,
    ) => {
      if (slave.readable) return 1
      if (callback) {
        callback.registerCleanupFunc(() => callbacks.delete(callback))
        callbacks.add(callback)
      }
      return 0
    }
  })
  const { default: initialize } = await import(
    new URL('runtime/out.js', scope.location.href).href
  )
  await initialize(module)
}

scope.onmessage = ({ data }: MessageEvent) => {
  if (data.type === 'boot')
    boot().catch((error) => send({ message: String(error), type: 'error' }))
  else if (data.type === 'exec') input?.(`${data.id} ${data.command}\n`)
}
