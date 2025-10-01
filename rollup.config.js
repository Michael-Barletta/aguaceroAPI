// rollup.config.js

import { nodeResolve } from '@rollup/plugin-node-resolve';
// 1. Import the obfuscator plugin
import { javascriptObfuscator } from 'rollup-plugin-javascript-obfuscator';

export default {
  input: 'src/index.js',

  output: [
    {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      // 2. IMPORTANT: Turn off sourcemaps for the protected build
      sourcemap: false, 
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      // 2. IMPORTANT: Turn off sourcemaps for the protected build
      sourcemap: false,
    }
  ],
  
  external: ['mapbox-gl', 'proj4'],

  plugins: [
    nodeResolve(),
    
    // 3. Add the obfuscator plugin to the end of your plugins array
    javascriptObfuscator({
      // A simple but effective configuration for strong protection.
      // See the javascript-obfuscator GitHub page for all options.
      options: {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.75,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.4,
        debugProtection: false,
        debugProtectionInterval: 0,
        disableConsoleOutput: false,
        identifierNamesGenerator: 'hexadecimal',
        log: false,
        numbersToExpressions: true,
        renameGlobals: false,
        selfDefending: true,
        simplify: true,
        splitStrings: true,
        splitStringsChunkLength: 10,
        stringArray: true,
        stringArrayCallsTransform: true,
        stringArrayEncoding: ['base64'],
        stringArrayIndexShift: true,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 2,
        stringArrayWrappersType: 'variable',
        stringArrayWrappersParametersMaxCount: 4,
        transformObjectKeys: true,
        unicodeEscapeSequence: false
      }
    })
  ]
};