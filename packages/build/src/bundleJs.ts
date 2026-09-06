import pluginTypeScript from '@babel/preset-typescript'
import { babel } from '@rollup/plugin-babel'
import commonjs from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { join } from 'node:path'
import { rollup } from 'rollup'
import type { OutputOptions, RollupOptions } from 'rollup'
import { root } from './root.ts'

interface BundleOptions extends RollupOptions {
  output: OutputOptions
}

interface CreateOptions {
  readonly external?: string[]
  readonly input: string
  readonly output: string
}

const createOptions = ({
  external = ['electron', 'execa', 'ws', 'debug'],
  input,
  output,
}: CreateOptions): BundleOptions => ({
  input,
  preserveEntrySignatures: 'strict',
  treeshake: {
    propertyReadSideEffects: false,
  },
  output: {
    file: output,
    format: 'es',
    freeze: false,
    generatedCode: {
      constBindings: true,
      objectShorthand: true,
    },
    inlineDynamicImports: true,
  },
  external,
  plugins: [
    babel({
      babelHelpers: 'bundled',
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      presets: [pluginTypeScript],
    }),
    nodeResolve(),
    // @ts-expect-error The plugin declares CommonJS types for its ESM default export.
    commonjs(),
  ],
})

const bundle = async (options: BundleOptions): Promise<void> => {
  const input = await rollup(options)
  await input.write(options.output)
}

export const bundleJs = async (): Promise<void> => {
  await bundle(
    createOptions({
      input: join(
        root,
        'packages/devcontainer-worker/src/devcontainerWorkerMain.ts',
      ),
      output: join(root, '.tmp/dist/dist/devcontainerWorkerMain.js'),
    }),
  )
  await bundle(
    createOptions({
      input: join(
        root,
        'packages/devcontainer-worker/src/devcontainerWorkerModule.ts',
      ),
      output: join(root, '.tmp/dist/dist/devcontainerWorkerModule.js'),
    }),
  )
  await bundle(
    createOptions({
      external: ['electron', 'execa', 'debug'],
      input: join(
        root,
        'packages/devcontainer-worker/src/devcontainerProcess.ts',
      ),
      output: join(root, '.tmp/dist/dist/devcontainerProcess.js'),
    }),
  )
  await bundle(
    createOptions({
      input: join(root, 'packages/extension/src/devcontainerMain.ts'),
      output: join(root, '.tmp/dist/dist/devcontainerMain.js'),
    }),
  )
}
