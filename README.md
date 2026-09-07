# Devcontainer

Devcontainer lifecycle support for Lvce Editor.

Set the container executable in your editor settings to use Podman:

```json
{
  "devcontainer.containerCli": "podman"
}
```

The default is `docker`. An absolute executable path is also supported. Install
and configure the selected engine on the host before starting a container.
The setting applies to new connections; running and saved connections retain
their original engine for execution, file access, stop, and removal.

Rootless Podman e2e tests run in GitHub Actions on Ubuntu alongside Docker. They
cover image startup, Dockerfile builds, mounted workspace edits, and reopening
and editing a container workspace after the extension runtime restarts.

For local development, use Node from `.nvmrc`, then run `npm ci` and `npm run dev`.
This prepares the local extension in `.tmp/dev` with esbuild and starts the
development server alongside browser bundle watching. The first bundle is ready
before the server accepts requests. The Node process runs TypeScript source
directly and uses the installed workspace dependencies; reload the editor to
restart it after Node source changes. `npm run build:watch` prepares and watches
the same development extension without starting the server.

In this repository’s devcontainer, the server runs in the background and writes
logs to `/tmp/lvce-devcontainer-server.log`, allowing Reopen in Container to finish.

`npm run build` remains the release build: it bundles with Rollup, copies runtime
dependencies into `.tmp/dist`, and compresses `extension.tar.br`. Development
startup does not need this build.

- `packages/devcontainer-worker` owns editor-facing orchestration, config detection, lifecycle state, and typed RPC commands.
- `packages/devcontainer-node` wraps host capabilities: the official `@devcontainers/cli` package and container engine teardown commands.

The first implementation slice supports detecting a devcontainer config, reading configuration, starting a container, executing commands inside it, and stopping/removing the tracked container by id.

The desktop extension contributes these commands for the active workspace:

- `Dev Containers: Reopen in Container`
- `Dev Containers: Start Current Workspace`
- `Dev Containers: Stop Current Workspace`

Docker-backed end-to-end tests run on Ubuntu for every pull request and push to `main`. They cover the official JavaScript/Node 24 and Ubuntu 24.04 images, plus a Dockerfile build with a custom workspace mount.

Each test opens a fresh copy of a workspace fixture, starts the container through Quick Pick, checks its runtime and reads the fixture inside the container. It then writes a file from inside Docker and verifies the file in Explorer and its contents in the editor. A subsequent workspace edit must be readable inside the container. Finally, the test stops the container through Quick Pick and verifies that execution is rejected while stopped.

The tests use the `Devcontainer` page object from `@lvce-editor/test-worker` for start, stop, execution, output assertions, and cleanup. Dependency installation loads the declared test-worker dependency into the development server.

Both startup commands switch to the container URI after setup completes. Tests cover Explorer, file editing, terminals, and lifecycle commands in a workspace created by its Dockerfile outside the bind mount, as well as shared workspace mounts.

To run locally with Node from `.nvmrc` a running Docker daemon, and working rootless Podman:

```sh
npm ci
npm run build
npm run install:chromium --prefix packages/e2e
npm run e2e:devcontainer
```

To run a test by visiting its URL, start the development server after installing dependencies:

```sh
npm run dev
```

Open `http://localhost:3000/tests/devcontainer.javascript-node-24.html`, `http://localhost:3000/tests/devcontainer.ubuntu-24.04.html`, or `http://localhost:3000/tests/devcontainer.dockerfile.html`. Each visit runs the test and shows its result at the bottom of the editor. Reloading runs it again with a new workspace copy. Docker must be running for these tests too.

The runner allows three minutes per test and removes containers belonging to its copied fixtures even after a failed test. Fixture sources remain unchanged, so repeated runs cannot pass on stale generated files. Run one suite at a time per checkout. CI also visits all three URLs and reloads each one using `npm run e2e:local-url --prefix packages/e2e`.

Use **Dev Containers: Reopen in Container** or **Dev Containers: Start Current
Workspace** to build/start the current workspace's
configuration and open its configured `workspaceFolder` at
`devcontainers:///<containerId>`. Explorer and file editing use Docker inside the
container as `remoteUser`; the local bind mount is not used as a substitute for
the container filesystem. A failed build or connection leaves the local workspace
open. The existing execution, stop, and remove commands also work from the
container workspace.

New terminals run an interactive shell through `devcontainer exec`, using the
configured remote user and environment. Opening a terminal from an Explorer
subfolder starts it in that container directory.

Connection metadata survives the extension runtime restart during workspace changes. Restoring a connection checks whether its container is still running.

## Browser playground

[Try the Linux playground](https://lvce-editor.github.io/devcontainer/): boot a prepared Alpine environment and execute real shell commands entirely in your browser. Files are temporary and reset when you stop the environment. Guest networking, custom images, and interactive terminal programs are outside this demo's scope.

The playground uses the same lifecycle module as the desktop extension, with injected browser host capabilities. The desktop backend continues to use Docker and the official devcontainers CLI. GitHub Actions builds the pinned image with container2wasm and tests it in Chromium and Firefox before publishing to Pages.

To build locally (Linux amd64, Docker with Buildx, Node from `.nvmrc`):

```sh
npm ci
npm run build:image --workspace=packages/playground
npm run build --workspace=packages/playground
npm run serve --workspace=packages/playground
```

Open `http://127.0.0.1:4173/devcontainer/`. The server deliberately omits isolation headers to exercise the Pages service-worker bootstrap. `npm run test:browser --workspace=packages/playground` runs real VM acceptance tests after installing Playwright's Chromium and Firefox browsers. CI records runtime asset size and measured cold-start times in its job summary. Generated runtime assets stay in `.tmp`, outside Git.

### Full startup experiment

[Run the full startup test](https://lvce-editor.github.io/devcontainer/full-stack/)
to exercise the real backend: shared lifecycle orchestration forks the actual
`devcontainer-node` service over Node IPC, which launches the locked
`@devcontainers/cli` package against Docker inside browser Linux.

The automatic test detects the bundled configuration, runs `read-configuration`
and `up`, verifies `initializeCommand` and `postCreateCommand`, checks real stdout,
stderr, exit status and file persistence through separate CLI `exec` processes,
then stops and removes the container. Each run asserts a fresh workspace. Stop
terminates the whole VM; running again starts from the original image.

This larger, experimental environment uses 1 GiB of guest RAM and may take
up to 45 minutes. Browser memory usage also includes the emulator and filesystem.
Node’s compile cache is session-only; the fixed shell environment disables
interactive environment probing. Docker uses VFS storage and a preloaded Alpine image with guest networking
disabled. No host Docker socket, registry, arbitrary Dockerfile, Compose, or editor
UI is involved. The lightweight shell playground remains available separately.

CI first runs the same image natively with Docker-in-Docker, then converts it with
container2wasm’s QEMU/Emscripten backend and tests Chromium and Firefox on the
project subpath without isolation headers. Both demos must pass before deployment;
the combined static site is capped at 900 MiB. Runtime assets are cached using the
backend source, guest fixture, build scripts, and dependency lockfile.

To build this experiment locally with the same prerequisites:

```sh
bash packages/playground/full-stack/build-image.sh
node packages/playground/full-stack/build-site.js
mkdir -p .tmp/playground/full-stack
cp -r .tmp/full-stack/site/. .tmp/playground/full-stack/
npm run serve --workspace=packages/playground
```

Visit `http://127.0.0.1:4173/devcontainer/full-stack/`. Run browser acceptance with
`npx playwright test --config full-stack/playwright.config.ts` from
`packages/playground`. To verify an already hosted copy, set
`PLAYGROUND_BASE_URL` to its URL including the trailing slash.
