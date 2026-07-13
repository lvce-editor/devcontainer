export interface WorkspaceOptions {
  workspaceFolder: string
}

export interface ExecOptions extends WorkspaceOptions {
  args?: readonly string[]
  command: string
}

export interface ContainerOptions {
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
