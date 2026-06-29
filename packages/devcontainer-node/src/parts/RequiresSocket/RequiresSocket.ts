const METHODS_THAT_REQUIRE_SOCKET = new Set<string>()

export const requiresSocket = (method) => {
  return METHODS_THAT_REQUIRE_SOCKET.has(method)
}
