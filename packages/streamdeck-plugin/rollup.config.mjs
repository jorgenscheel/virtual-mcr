import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import path from 'node:path';

const sdPluginDir = 'com.remoteproduction.vmcr.sdPlugin';

export default {
  input: 'src/plugin.ts',
  output: {
    file: path.join(sdPluginDir, 'bin', 'plugin.js'),
    format: 'esm',
    sourcemap: true,
  },
  plugins: [
    resolve({ preferBuiltins: false }),
    commonjs(),
    json(),
    typescript({ tsconfig: './tsconfig.json' }),
  ],
};
