# Devcontainer

Devcontainer lifecycle support for Lvce Editor.

- `packages/devcontainer-worker` owns editor-facing orchestration, config detection, lifecycle state, and typed RPC commands.
- `packages/devcontainer-node` wraps host capabilities: the official `@devcontainers/cli` package and Docker teardown commands.

The first implementation slice supports detecting a devcontainer config, reading configuration, starting a container, executing commands inside it, and stopping/removing the tracked container by id.

The desktop extension contributes these commands for the active workspace:

- `Dev Containers: Start Current Workspace`
- `Dev Containers: Stop Current Workspace`

Docker-backed end-to-end tests cover the official JavaScript/Node 24 and Ubuntu 24.04 devcontainer images on the Ubuntu CI runner.
