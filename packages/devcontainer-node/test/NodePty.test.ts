import { test, expect } from '@jest/globals'
import waitForExpect from 'wait-for-expect'
import * as Pty from '../src/parts/Pty/Pty.js'

// TODO move this to integration test / e2e test

test('pty', async () => {
  if (process.platform === 'win32') {
    return
  }
  const pty = await Pty.create({
    args: [],
    command: '/bin/bash',
    // @ts-ignore
    cwd: process.cwd(),
  })

  let allData = ''
  pty.addEventListener('data', (event) => {
    // @ts-ignore
    allData += event.data
  })

  pty.write('abc')

  // @ts-ignore
  await waitForExpect(() => {
    expect(allData).toContain('abc')
  })

  pty.dispose()
})

test('print data', async () => {
  if (process.platform === 'win32') {
    return
  }
  const pty = await Pty.create({
    args: ['-e', 'console.log("abc")'],
    command: process.execPath,
    // @ts-ignore
    cwd: process.cwd(),
  })

  let allData = ''
  pty.addEventListener('data', (event) => {
    // @ts-ignore
    allData += event.data
  })
  // @ts-ignore
  await waitForExpect(() => {
    expect(allData).toContain('abc')
  })

  pty.dispose()
})

test('handle exec error', async () => {
  if (process.platform === 'win32') {
    return
  }
  const pty = await Pty.create({
    args: [],
    command: '/test/does-not-exist',
    // @ts-ignore
    cwd: process.cwd(),
  })

  let exited = null
  pty.addEventListener('exit', (event) => {
    // @ts-ignore
    exited = event.data
  })
  // @ts-ignore
  await waitForExpect(() => {
    // @ts-ignore
    expect(exited.exitCode).toBe(1)
  })

  pty.dispose()
})
