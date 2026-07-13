import pluginTypeScript from '@babel/preset-typescript'
import { babel } from '@rollup/plugin-babel'
import { default as commonjs } from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { join } from 'path'
import { rollup } from 'rollup'
import { root } from './root.js'

/** @returns {import('rollup').RollupOptions} */
const createOptions = ({ input, output }) => ({
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
  external: ['electron', 'execa', 'ws', 'debug'],
  plugins: [
    babel({
      babelHelpers: 'bundled',
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      presets: [pluginTypeScript],
    }),
    nodeResolve(),
    // @ts-ignore
    commonjs(),
  ],
})

const bundle = async (options) => {
  const input = await rollup(options)
  // @ts-ignore
  await input.write(options.output)
}

export const bundleJs = async () => {
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
      input: join(root, 'packages/extension/src/devcontainerMain.ts'),
      output: join(root, '.tmp/dist/dist/devcontainerMain.js'),
    }),
  )
}
