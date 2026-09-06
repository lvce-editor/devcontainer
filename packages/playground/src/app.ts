import type { Result } from './runtime.ts'
import {
  createBrowserDevContainer,
  configuration,
  workspaceFolder,
} from './browser.ts'

const element = <T extends HTMLElement>(id: string) =>
  document.querySelector(`#${id}`) as T
const start = element<HTMLButtonElement>('start')
const stop = element<HTMLButtonElement>('stop')
const run = element<HTMLButtonElement>('run')
const command = element<HTMLInputElement>('command')
const status = element('status')
const output = element('output')
let session = 0
let running = false
let busy = false
let starting = false
const showProgress = (message: string) => {
  if (starting) status.textContent = message
}
const lifecycle = createBrowserDevContainer(showProgress)
element('config').textContent = JSON.stringify(configuration, null, 2)
const render = () => {
  start.disabled = starting || running
  stop.disabled = !starting && !running
  command.disabled = !running || busy
  run.disabled = !running || busy
}
const append = (text: string) => {
  // Bound accumulated DOM output across long sessions.
  output.textContent = (output.textContent + text).slice(-100_000)
  output.scrollTop = output.scrollHeight
}
start.onclick = async () => {
  if (running || starting) return
  const current = ++session
  starting = true
  render()
  status.textContent = 'Downloading the environment and booting Linux…'
  const began = performance.now()
  const result = (await lifecycle.up({ workspaceFolder })) as Result
  if (session !== current) return
  starting = false
  running = result.ok
  if (result.ok) {
    const seconds = ((performance.now() - began) / 1000).toFixed(1)
    status.textContent = `Linux is ready · started in ${seconds}s`
    append(`\nLinux is ready (${seconds}s). Try sh hello.sh.\n`)
  } else {
    status.textContent =
      result.errorMessage || 'Linux could not start. Try Start again.'
    append(`\n${status.textContent}\n`)
  }
  render()
  if (running) command.focus()
}
stop.onclick = async () => {
  ++session
  starting = false
  running = false
  busy = false
  await lifecycle.stop({ workspaceFolder })
  status.textContent = 'Stopped · Start creates a fresh environment'
  append('\nEnvironment stopped. Files have been reset.\n')
  render()
}
element('command-form').onsubmit = async (event) => {
  event.preventDefault()
  if (!running || busy || !command.value.trim()) return
  const current = session
  const text = command.value
  command.value = ''
  busy = true
  render()
  append(`\n$ ${text}\n`)
  const result = (await lifecycle.exec({
    args: ['-lc', text],
    command: 'sh',
    workspaceFolder,
  })) as Result
  if (current !== session) return
  const error = result.errorMessage ? result.errorMessage + '\n' : ''
  append(
    `${result.stdout || ''}${result.stderr || ''}${error}[exit ${result.exitCode ?? 'unavailable'}]\n`,
  )
  busy = false
  if (result.exitCode === undefined && !result.ok && !result.errorCode) {
    await lifecycle.stop({ workspaceFolder })
    running = false
    status.textContent = 'The environment stopped. Start again to retry.'
  }
  render()
  if (running) command.focus()
}
element('clear').onclick = () => {
  output.textContent = ''
}
for (const button of document.querySelectorAll<HTMLButtonElement>(
  '[data-command]',
)) {
  button.onclick = () => {
    command.value = button.dataset.command || ''
    command.focus()
  }
}
const supported =
  globalThis.isSecureContext &&
  'serviceWorker' in navigator &&
  typeof WebAssembly === 'object'
if (!supported)
  status.textContent =
    'Use a modern desktop browser over HTTPS to run this playground.'
else if (
  !globalThis.crossOriginIsolated ||
  typeof SharedArrayBuffer === 'undefined'
) {
  status.textContent =
    'Preparing browser isolation. If this message remains, allow service workers and reload in a modern desktop browser.'
} else {
  status.textContent = 'Ready to start · no download until you click Start'
  render()
}
try {
  const response = await fetch('./assets.json')
  if (!response.ok) throw new Error('Asset manifest unavailable')
  const assets: { bytes: number }[] = await response.json()
  const mib =
    assets.reduce((total, asset) => total + asset.bytes, 0) / 1024 / 1024
  element('download').textContent =
    `Environment assets: ${mib.toFixed(1)} MiB · first start may take a moment`
} catch {
  element('download').textContent =
    'Asset information unavailable. Reload to retry.'
}
