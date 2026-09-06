import * as RunProcess from '../RunProcess/RunProcess.ts'

interface Options {
  containerId: string
  content?: string
  newPath?: string
  operation: string
  path: string
  remoteUser?: string
  remoteWorkspaceFolder: string
}

// Paths are positional arguments, never interpolated into shell source. NUL
// separators preserve spaces, newlines, and non-ASCII file names.
const scripts: Record<string, string> = {
  mkdir: 'mkdir -- "$1"',
  readDirWithFileTypes: `test -d "$1" || exit 44
for entry in "$1"/* "$1"/.[!.]* "$1"/..?*; do
  if [ ! -e "$entry" ] && [ ! -L "$entry" ]; then continue; fi
  if [ -d "$entry" ]; then type=3; else type=7; fi
  printf '%s\\0%s\\0' "$type" "\${entry##*/}"
done`,
  readFile: 'test -e "$1" || exit 44; base64 < "$1"',
  remove: 'rm -rf -- "$1"',
  rename: 'if [ -e "$2" ] || [ -L "$2" ]; then exit 45; fi; mv -- "$1" "$2"',
  writeFile: 'cat > "$1"',
}

export const run = async (options: Options): Promise<unknown> => {
  const {
    containerId,
    content,
    newPath,
    operation,
    path,
    remoteUser,
    remoteWorkspaceFolder,
  } = options
  const script = scripts[operation]
  if (!script) {
    throw new Error(`Unsupported container file operation: ${operation}`)
  }
  const result = await RunProcess.runProcess({
    args: [
      'exec',
      '-i',
      ...(remoteUser ? ['--user', remoteUser] : []),
      '--workdir',
      remoteWorkspaceFolder,
      containerId,
      'sh',
      '-c',
      script,
      'devcontainer-files',
      path,
      ...(newPath ? [newPath] : []),
    ],
    command: 'docker',
    input: operation === 'writeFile' ? content : undefined,
  })
  if ('errorMessage' in result) {
    throw new Error(result.errorMessage)
  }
  if (result.exitCode !== 0) {
    const error = new Error(
      result.stderr || `Container file operation failed (${result.exitCode})`,
    )
    const errorCodes: Record<number, string> = { 44: 'ENOENT', 45: 'EEXIST' }
    Object.assign(error, { code: errorCodes[result.exitCode ?? -1] || 'EIO' })
    throw error
  }
  if (operation === 'readDirWithFileTypes') {
    const fields = result.stdout.split('\0')
    const entries: { name: string; type: number }[] = []
    for (let i = 0; i + 1 < fields.length; i += 2) {
      entries.push({ name: fields[i + 1], type: Number(fields[i]) })
    }
    return entries.toSorted((a, b) => a.name.localeCompare(b.name))
  }
  return result.stdout
}
