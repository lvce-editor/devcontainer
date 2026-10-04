import { execFile } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { promisify } from 'node:util'

interface Session {
  containerCli: string
  containerId: string
  directory: string
  remoteUser?: string
  token: string
}

const execFileAsync = promisify(execFile)

export const run = async (session: Session, script: string) => {
  const user = session.remoteUser ? ['--user', session.remoteUser] : []
  await execFileAsync(
    session.containerCli,
    [
      'exec',
      ...user,
      session.containerId,
      'sh',
      '-c',
      script,
      'lvce-terminal-session',
      session.directory,
      session.token,
    ],
    { timeout: 10_000 },
  )
}

export const createSessionManager = (execute = run) => {
  const sessions = new Map<string, Session>()
  const closing = new Map<string, Promise<void>>()
  const create = async (
    containerId: string,
    containerCli: string,
    remoteUser?: string,
  ) => {
    const token = randomUUID()
    const session: Session = {
      containerCli,
      containerId,
      directory: `/tmp/lvce-terminal-${token}`,
      remoteUser,
      token,
    }
    await execute(session, 'umask 077; mkdir -- "$1"')
    sessions.set(token, session)
    return session
  }

  const finishDispose = async (
    session: Session,
    token: string,
  ): Promise<void> => {
    try {
      await execute(session, cleanupScript)
    } finally {
      closing.delete(token)
    }
  }
  const dispose = (token: string): Promise<void> => {
    const pending = closing.get(token)
    if (pending) return pending
    const session = sessions.get(token)
    if (!session) return Promise.resolve()
    sessions.delete(token)
    const task = finishDispose(session, token)
    closing.set(token, task)
    return task
  }
  return { create, dispose }
}

// Rename closes the startup gate before inspecting the atomically published
// owner. A late CLI launch cannot publish its PID into the removed directory.
// The nonce in the process environment also prevents killing a reused PID.
export const cleanupScript = [
  'set -e',
  'mv -- "$1" "$1.closed" 2>/dev/null || exit 0',
  'pid=',
  'if [ -f "$1.closed/pid" ]; then read -r pid < "$1.closed/pid"; fi',
  'case "$pid" in ""|*[!0-9]*) pid=0;; esac',
  'if [ "$pid" -gt 1 ] && [ -r "/proc/$pid/environ" ] && tr "\\000" "\\n" < "/proc/$pid/environ" | grep -Fxq "LVCE_TERMINAL_SESSION=$2"; then kill -HUP -"$pid" 2>/dev/null || true; fi',
  'rm -r -- "$1.closed"',
].join('; ')

const manager = createSessionManager()
export const { create } = manager
export const { dispose } = manager

export const shellScript = [
  'set -e',
  'cd -- "$1"',
  'printf "%s\\n" "$$" > "$2/pid.tmp"',
  'mv -- "$2/pid.tmp" "$2/pid"',
  'exec "${SHELL:-/bin/sh}" -il',
].join('; ')
