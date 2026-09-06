// Wait for activation before using the one permitted bootstrap reload.
// coi-serviceworker calls doReload on updatefound, before it controls this page.
let waitingForIsolation = false
window.coi = {
  shouldRegister: () =>
    !window.crossOriginIsolated &&
    !sessionStorage.getItem('lvce-isolation-reloaded'),
  doReload: () => {
    if (
      waitingForIsolation ||
      sessionStorage.getItem('lvce-isolation-reloaded')
    )
      return
    waitingForIsolation = true
    const reload = () => {
      if (
        !navigator.serviceWorker.controller ||
        sessionStorage.getItem('lvce-isolation-reloaded')
      )
        return
      navigator.serviceWorker.removeEventListener('controllerchange', reload)
      sessionStorage.setItem('lvce-isolation-reloaded', '1')
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', reload)
    navigator.serviceWorker.ready.then(reload)
  },
  quiet: true,
}
