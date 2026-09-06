// Scope registration to this Pages project and allow at most one bootstrap reload.
window.coi = {
  shouldRegister: () =>
    !window.crossOriginIsolated &&
    !sessionStorage.getItem('lvce-isolation-reloaded'),
  doReload: () => {
    if (sessionStorage.getItem('lvce-isolation-reloaded')) return
    sessionStorage.setItem('lvce-isolation-reloaded', '1')
    window.location.reload()
  },
  quiet: true,
}
