export interface WorkspaceOptions {
  containerCli?: string
  onOutput?: (text: string) => void
  workspaceFolder: string
}

export interface ExecOptions extends WorkspaceOptions {
  args?: readonly string[]
  command: string
}

export interface ContainerOptions {
  containerCli?: string
  containerId: string
}

export function cliExec(options: ExecOptions): Promise<unknown>
export function cliReadConfiguration(
  options: WorkspaceOptions,
): Promise<unknown>
export function cliUp(options: WorkspaceOptions): Promise<unknown>
export function dockerRemoveContainer(
  options: ContainerOptions,
): Promise<unknown>
export function dockerStopContainer(options: ContainerOptions): Promise<unknown>

export function setDockerPath(path: string): void
export { run as containerFileSystem } from './parts/ContainerFileSystem/ContainerFileSystem.ts'

export function dockerInspectContainer(
  options: ContainerOptions,
): Promise<boolean>

export function getDevcontainerCliPath(): string
