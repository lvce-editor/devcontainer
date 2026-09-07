// Keep only the latest operation and cap retained progress, including after a
// client disconnects. The CLI result still carries its complete diagnostic output.
const limit = 1024 * 1024
let currentId = ''
let output = ''
let running = false

export const getProgress = (id: string): string =>
  id === currentId ? output : ''

export const run = async <T>(
  id: string,
  operation: (onOutput: (text: string) => void) => Promise<T>,
): Promise<T> => {
  if (running)
    throw new Error('A Dev Containers operation is already in progress')
  running = true
  currentId = id
  output = ''
  try {
    return await operation((text) => {
      output = (output + text).slice(-limit)
    })
  } finally {
    running = false
  }
}
