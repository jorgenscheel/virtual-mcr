import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import json from '@rollup/plugin-json';
import { builtinModules } from 'node:module';
import path from 'node:path';

const sdPluginDir = 'com.remoteproduction.vmcr.sdPlugin';

export default {
  input: 'src/plugin.ts',
  output: {
    file: path.join(sdPluginDir, 'bin', 'plugin.js'),
    format: 'esm',
    sourcemap: true,
  },
  external: [
    ...builtinModules,
    ...builtinModules.map((m) => `node:${m}`),
  ],
  plugins: [
    resolve({ preferBuiltins: true }),
    commonjs(),
    json(),
    typescript({
      tsconfig: './tsconfig.json',
      outDir: path.join(sdPluginDir, 'bin'),
    }),
  ],
};
