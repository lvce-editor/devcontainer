import configuration from '../workspace/.devcontainer/devcontainer.json' with { type: 'json' }

const start = document.querySelector<HTMLButtonElement>('#start')!
const stop = document.querySelector<HTMLButtonElement>('#stop')!
const status = document.querySelector<HTMLParagraphElement>('#status')!
const output = document.querySelector<HTMLPreElement>('#output')!
document.querySelector('#config')!.textContent = JSON.stringify(
  configuration,
  null,
  2,
)
let worker: Worker | undefined
let timer: ReturnType<typeof setTimeout> | undefined
const finish = (message: string) => {
  worker?.terminate()
  worker = undefined
  clearTimeout(timer)
  status.textContent = message
  start.disabled = false
  stop.disabled = true
}
start.onclick = () => {
  if (worker) return
  output.textContent = ''
  start.disabled = true
  stop.disabled = false
  const began = performance.now()
  status.textContent = 'Downloading the environment and booting Linux…'
  let current: Worker
  try {
    current = new Worker(new URL('runtime-worker.js', import.meta.url), {
      type: 'module',
    })
  } catch {
    finish('Linux could not start. Use a modern desktop browser and try again.')
    return
  }
  worker = current
  timer = setTimeout(() => {
    if (worker === current)
      finish(
        'Startup test timed out after 15 minutes. Try again in a desktop browser.',
      )
  }, 900_000)
  current.onmessage = ({ data }) => {
    if (worker !== current) return
    if (data.type === 'progress' && data.message) {
      const download = /Downloading data\.\.\. \((\d+)\/(\d+)\)/.exec(
        data.message,
      )
      if (download) {
        status.textContent = `Downloading Linux: ${(Number(download[1]) / 1024 / 1024).toFixed(1)} / ${(Number(download[2]) / 1024 / 1024).toFixed(1)} MiB`
      } else {
        status.textContent =
          data.message === 'Running...' ? 'Booting Linux…' : data.message
      }
    }
    if (data.type === 'log') {
      output.textContent = (output.textContent + data.message + '\n').slice(
        -100_000,
      )
      output.scrollTop = output.scrollHeight
      if (data.message.startsWith('FULL_STACK_PHASE '))
        status.textContent = data.message.slice(17)
      if (data.message === 'FULL_STACK_PASS')
        finish(
          `Passed: real up → exec → remove (${((performance.now() - began) / 1000).toFixed(1)}s)`,
        )
      else if (data.message.startsWith('FULL_STACK_FAIL '))
        finish(`Test failed: ${data.message.slice(16)}. Run again to retry.`)
    } else if (data.type === 'error')
      finish(`Linux failed: ${data.message}. Try again.`)
  }
  current.onerror = (event) => {
    event.preventDefault()
    if (worker === current)
      finish('Linux failed to load. Check your connection and try again.')
  }
  try {
    current.postMessage({ type: 'boot' })
  } catch {
    finish('Linux could not start. Reload the page and try again.')
  }
}
stop.onclick = () => finish('Stopped. Run again to start a fresh environment.')
if (
  !globalThis.isSecureContext ||
  !('serviceWorker' in navigator) ||
  typeof WebAssembly !== 'object'
) {
  status.textContent =
    'Use a modern desktop browser over HTTPS to run this test.'
} else if (
  !globalThis.crossOriginIsolated ||
  typeof SharedArrayBuffer === 'undefined'
) {
  status.textContent =
    'Preparing browser isolation. If this message remains, allow service workers and reload in a modern desktop browser.'
} else {
  start.disabled = false
  status.textContent =
    'Ready. The environment downloads only when you run the test.'
}
try {
  const response = await fetch('./assets.json')
  if (!response.ok) throw new Error('Asset manifest unavailable')
  const assets = await response.json()
  document.querySelector('#size')!.textContent =
    `${(assets.reduce((bytes: number, asset: { bytes: number }) => bytes + asset.bytes, 0) / 1024 / 1024).toFixed(1)} MiB of runtime assets`
} catch {
  document.querySelector('#size')!.textContent =
    'Asset information unavailable. Reload to retry.'
}
