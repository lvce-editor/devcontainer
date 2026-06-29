# Devcontainer

Devcontainer lifecycle support for Lvce Editor.

- `packages/devcontainer-worker` owns editor-facing orchestration, config detection, lifecycle state, and typed RPC commands.
- `packages/devcontainer-node` wraps host capabilities: the official `@devcontainers/cli` package and Docker teardown commands.

The first implementation slice supports detecting a devcontainer config, reading configuration, starting a container, executing commands inside it, and stopping/removing the tracked container by id.
