const quoteShell = (value: string): string => {
  return "'" + value.replaceAll("'", "'\\''") + "'"
}

// Download the Linux installer completely before executing it, without sudo.
export const getDockerInstallCommand = (platform: string): string => {
  switch (platform) {
    case 'darwin':
      return (
        'sh -c ' +
        quoteShell(
          'if command -v brew >/dev/null 2>&1; then brew install --cask docker-desktop && open -a Docker; else printf "Install Docker Desktop from https://docs.docker.com/desktop/setup/install/mac-install/\\n"; open https://docs.docker.com/desktop/setup/install/mac-install/; fi',
        )
      )
    case 'linux':
      return (
        'sh -c ' +
        quoteShell(
          [
            'set -e',
            'installer=$(mktemp)',
            `trap 'rm -f "$installer"' EXIT`,
            'curl -fsSL https://get.docker.com/rootless -o "$installer"',
            'sh "$installer"',
            'printf "\\nFollow the PATH and Docker context instructions above, then restart the editor and run Reopen in Container.\\n"',
          ].join('; '),
        )
      )
    case 'win32':
      return 'winget install --exact --id Docker.DockerDesktop'
    default:
      throw new Error(
        'Automatic Docker installation is not supported on this operating system',
      )
  }
}
