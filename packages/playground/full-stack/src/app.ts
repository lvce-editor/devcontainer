const start = document.querySelector<HTMLButtonElement>('#start')!
const stop = document.querySelector<HTMLButtonElement>('#stop')!
const status = document.querySelector<HTMLParagraphElement>('#status')!
const output = document.querySelector<HTMLPreElement>('#output')!
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
  const current = new Worker(new URL('runtime-worker.js', import.meta.url), {
    type: 'module',
  })
  worker = current
  timer = setTimeout(finish, 900_000, 'Startup test timed out. Try again.')
  current.onmessage = ({ data }) => {
    if (worker !== current) return
    if (data.type === 'progress' && data.message)
      status.textContent = data.message
    if (data.type === 'log') {
      output.textContent = (output.textContent + data.message + '\n').slice(
        -100_000,
      )
      if (data.message.startsWith('FULL_STACK_PHASE '))
        status.textContent = data.message.slice(17)
      if (data.message === 'FULL_STACK_PASS')
        finish(
          `Passed: real up → exec → remove (${((performance.now() - began) / 1000).toFixed(1)}s)`,
        )
      else if (data.message.startsWith('FULL_STACK_FAIL ')) finish(data.message)
    }
    else if (data.type === 'error')
      finish(`Linux failed: ${data.message}. Try again.`)
  }
  current.onerror = (event) => {
    event.preventDefault()
    if (worker === current)
      finish('Linux failed to load. Check your connection and try again.')
  }
  current.postMessage({ type: 'boot' })
}
stop.onclick = () => finish('Stopped. Run again to start a fresh environment.')
if (crossOriginIsolated && typeof SharedArrayBuffer !== 'undefined') {
  start.disabled = false
  status.textContent =
    'Ready. The environment downloads only when you run the test.'
}
try {
  const response = await fetch('./assets.json')
  const assets = await response.json()
  document.querySelector('#size')!.textContent =
    `${(assets.reduce((bytes: number, asset: { bytes: number }) => bytes + asset.bytes, 0) / 1024 / 1024).toFixed(1)} MiB of runtime assets`
} catch {
  document.querySelector('#size')!.textContent =
    'Asset information unavailable. Reload to retry.'
}
