// Relay programs are passed as arguments, never interpolated into shell source.
// Node/Python are fallbacks for development images that do not include socat.
export const nodeRelay = `
const net = require('node:net');
const socket = net.connect({ host: process.argv[1], port: Number(process.argv[2]), allowHalfOpen: true });
socket.on('error', error => { console.error(error.message); process.exitCode = 1; socket.destroy(); process.stdin.destroy(); });
socket.on('connect', () => { process.stdin.pipe(socket); socket.pipe(process.stdout); });
process.stdin.on('end', () => { socket.end(); socket.setTimeout(5000, () => socket.destroy()); });
socket.on('end', () => process.stdin.destroy());
socket.on('close', () => process.stdin.destroy());
`

export const pythonRelay = `
import os, select, socket, sys, threading, time
s = socket.create_connection((sys.argv[1], int(sys.argv[2])))
s.settimeout(None)
finished = threading.Event()
def send():
    try:
        while True:
            data = os.read(0, 65536)
            if not data:
                s.shutdown(socket.SHUT_WR)
                finished.set()
                return
            s.sendall(data)
    except OSError:
        s.close()
threading.Thread(target=send, daemon=True).start()
drain_until = None
try:
    while True:
        if finished.is_set() and drain_until is None:
            drain_until = time.monotonic() + 5
        if drain_until is not None and time.monotonic() >= drain_until:
            break
        if not select.select([s], [], [], 1)[0]:
            continue
        data = s.recv(65536)
        if not data: break
        sys.stdout.buffer.write(data)
        sys.stdout.buffer.flush()
finally:
    try: s.shutdown(socket.SHUT_RDWR)
    except OSError: pass
    s.close()
`

export const probe = 'command -v socat || command -v node || command -v python3'
