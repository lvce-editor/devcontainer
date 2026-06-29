import pluginTypeScript from '@babel/preset-typescript'
import { babel } from '@rollup/plugin-babel'
import { default as commonjs } from '@rollup/plugin-commonjs'
import { nodeResolve } from '@rollup/plugin-node-resolve'
import { join } from 'path'
import { rollup } from 'rollup'
import { root } from './root.js'

/**
 * @type {import('rollup').RollupOptions}
 */
const options = {
  input: join(
    root,
    'packages/devcontainer-worker/src/devcontainerWorkerMain.ts',
  ),
  preserveEntrySignatures: 'strict',
  treeshake: {
    propertyReadSideEffects: false,
  },
  output: {
    file: join(root, '.tmp/dist/dist/devcontainerWorkerMain.js'),
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
}

export const bundleJs = async () => {
  const input = await rollup(options)
  // @ts-ignore
  await input.write(options.output)
}
