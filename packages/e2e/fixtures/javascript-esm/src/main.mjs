import { readFileSync } from 'node:fs'
console.log(readFileSync('src/message.txt', 'utf8').trim())
