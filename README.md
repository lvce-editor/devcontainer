# Devcontainer

Devcontainer lifecycle support for Lvce Editor.

- `packages/devcontainer-worker` owns editor-facing orchestration, config detection, lifecycle state, and typed RPC commands.
- `packages/devcontainer-node` wraps host capabilities: the official `@devcontainers/cli` package and Docker teardown commands.

The first implementation slice supports detecting a devcontainer config, reading configuration, starting a container, executing commands inside it, and stopping/removing the tracked container by id.

The desktop extension contributes these commands for the active workspace:

- `Dev Containers: Start Current Workspace`
- `Dev Containers: Stop Current Workspace`

Docker-backed end-to-end tests run on Ubuntu for every pull request and push to `main`. They cover the official JavaScript/Node 24 and Ubuntu 24.04 images, plus a Dockerfile build with a custom workspace mount.

Each test opens a fresh copy of a workspace fixture, starts the container through Quick Pick, checks its runtime and reads the fixture inside the container. It then writes a file from inside Docker and verifies the file in Explorer and its contents in the editor. A subsequent workspace edit must be readable inside the container. Finally, the test stops the container through Quick Pick and verifies that execution is rejected while stopped.

The tests use the `Devcontainer` page object from `@lvce-editor/test-worker` for start, stop, execution, output assertions, and cleanup. Dependency installation loads the declared test-worker dependency into the development server.

These assertions cover the extension's command connection and shared workspace mount. Explorer currently browses the local mounted workspace; the tests do not assert remote filesystem browsing outside that mount.

To run locally with Node from `.nvmrc` and a running Docker daemon:

```sh
npm ci
npm run build
npm run install:chromium --prefix packages/e2e
npm run e2e:devcontainer
```

To run a test by visiting its URL, start the development server after installing dependencies and building:

```sh
npm run dev --prefix packages/server
```

Open `http://localhost:3000/tests/devcontainer.javascript-node-24.html`, `http://localhost:3000/tests/devcontainer.ubuntu-24.04.html`, or `http://localhost:3000/tests/devcontainer.dockerfile.html`. Each visit runs the test and shows its result at the bottom of the editor. Reloading runs it again with a new workspace copy. Docker must be running for these tests too.

The runner allows three minutes per test and removes containers belonging to its copied fixtures even after a failed test. Fixture sources remain unchanged, so repeated runs cannot pass on stale generated files. Run one suite at a time per checkout. CI also visits all three URLs and reloads each one using `npm run e2e:local-url --prefix packages/e2e`.
