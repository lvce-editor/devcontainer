import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { extname, resolve } from 'node:path'

const root = fileURLToPath(
  new URL('../../../.tmp/playground/', import.meta.url),
)
const types = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.wasm': 'application/wasm',
}
createServer(async (request, response) => {
  const path = decodeURIComponent(
    new URL(request.url, 'http://localhost').pathname,
  )
  if (!path.startsWith('/devcontainer/')) {
    response.writeHead(404).end()
    return
  }
  const file = resolve(
    root,
    path.slice('/devcontainer/'.length) +
      (path.endsWith('/') ? 'index.html' : ''),
  )
  if (!file.startsWith(root)) {
    response.writeHead(403).end()
    return
  }
  try {
    const content = await readFile(file)
    // Deliberately no isolation headers: exercise the same bootstrap as Pages.
    response
      .writeHead(200, {
        'Content-Type': types[extname(file)] || 'application/octet-stream',
        'Cache-Control': 'no-cache',
      })
      .end(content)
  } catch {
    response.writeHead(404).end('File not found')
  }
}).listen(4173, '127.0.0.1', () =>
  console.log('http://127.0.0.1:4173/devcontainer/'),
)
