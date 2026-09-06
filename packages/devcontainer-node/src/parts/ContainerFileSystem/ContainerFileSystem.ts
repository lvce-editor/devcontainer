import * as RunProcess from '../RunProcess/RunProcess.ts'

export interface Options {
  containerId: string
  remoteUser?: string
  remoteWorkspaceFolder: string
  operation: string
  path: string
  newPath?: string
  content?: string
}

// Paths are positional arguments, never interpolated into shell source. NUL
// separators preserve spaces, newlines, and non-ASCII file names.
const scripts: Record<string, string> = {
  readDirWithFileTypes: `test -d "$1" || exit 44
for entry in "$1"/* "$1"/.[!.]* "$1"/..?*; do
  if [ ! -e "$entry" ] && [ ! -L "$entry" ]; then continue; fi
  if [ -d "$entry" ]; then type=3; else type=7; fi
  printf '%s\\0%s\\0' "$type" "\${entry##*/}"
done`,
  readFile: 'test -e "$1" || exit 44; base64 < "$1"',
  writeFile: 'cat > "$1"',
  mkdir: 'mkdir -- "$1"',
  remove: 'rm -rf -- "$1"',
  rename: 'if [ -e "$2" ] || [ -L "$2" ]; then exit 45; fi; mv -- "$1" "$2"',
}

export const run = async (options: Options): Promise<unknown> => {
  const {
    containerId,
    remoteUser,
    remoteWorkspaceFolder,
    operation,
    path,
    newPath,
    content,
  } = options
  const script = scripts[operation]
  if (!script) {
    throw new Error(`Unsupported container file operation: ${operation}`)
  }
  const result = await RunProcess.runProcess({
    command: 'docker',
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
    input: operation === 'writeFile' ? content : undefined,
  })
  if ('errorMessage' in result) {
    throw new Error(result.errorMessage)
  }
  if (result.exitCode !== 0) {
    const error = new Error(
      result.stderr || `Container file operation failed (${result.exitCode})`,
    )
    Object.assign(error, {
      code:
        result.exitCode === 44
          ? 'ENOENT'
          : result.exitCode === 45
            ? 'EEXIST'
            : 'EIO',
    })
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
