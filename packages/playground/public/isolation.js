// Wait for activation before using the one permitted bootstrap reload.
// coi-serviceworker calls doReload on updatefound, before it controls this page.
const isolationKey = `lvce-isolation-reloaded:${new URL('.', window.location.href).pathname}`
let waitingForIsolation = false
window.coi = {
  shouldRegister: () =>
    !window.crossOriginIsolated && !sessionStorage.getItem(isolationKey),
  doReload: () => {
    if (waitingForIsolation || sessionStorage.getItem(isolationKey)) return
    waitingForIsolation = true
    const reload = () => {
      if (
        !navigator.serviceWorker.controller ||
        sessionStorage.getItem(isolationKey)
      )
        return
      navigator.serviceWorker.removeEventListener('controllerchange', reload)
      sessionStorage.setItem(isolationKey, '1')
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', reload)
    navigator.serviceWorker.ready.then(reload)
  },
  quiet: true,
}
