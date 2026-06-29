export const exit = (code) => {
  process.exit(code)
}

export const setExitCode = (exitCode) => {
  process.exitCode = exitCode
}

export const isConnected = () => {
  return process.connected
}
