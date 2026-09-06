import { readFileSync } from 'node:fs'
console.log(readFileSync('/etc/devcontainer-e2e-message', 'utf8').trim())
