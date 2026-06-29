import * as Assert from '../Assert/Assert.ts'
import * as Pty from '../Pty/Pty.ts'
import * as PtyState from '../PtyState/PtyState.ts'

// TODO maybe merge pty and pty controller
export const create = async (ipc, id, cwd, command, args) => {
  Assert.number(id)
  Assert.string(cwd)
  Assert.string(command)
  Assert.array(args)
  Assert.object(ipc)
  // @ts-ignore
  const pty = await Pty.create({ args, command, cwd })
  const handleData = (event) => {
    ipc.send({
      jsonrpc: '2.0',
      method: 'Viewlet.send',
      params: [id, 'handleData', event.data],
    })
  }

  pty.addEventListener('data', handleData)
  PtyState.set(id, pty)
}

export const write = (id, data) => {
  const pty = PtyState.get(id)
  if (!pty) {
    throw new Error(`pty ${id} not found`)
  }
  pty.write(data)
}

export const resize = (id, columns, rows) => {
  const pty = PtyState.get(id)
  if (!pty) {
    throw new Error(`pty ${id} not found`)
  }
  pty.resize(columns, rows)
}

export const dispose = (id) => {
  const pty = PtyState.get(id)
  if (!pty) {
    throw new Error(`pty ${id} not found`)
  }
  pty.dispose()
  PtyState.remove(id)
}

export const disposeAll = () => {
  for (const id in PtyState.getAll()) {
    dispose(id)
  }
}
