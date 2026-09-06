import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'
assert.equal(process.cwd(), '/language-workspace')
console.log(readFileSync('src/message.txt', 'utf8').trim())
