import { nodeResolve } from '@rollup/plugin-node-resolve';
// --- THIS IS THE CHANGE ---
// We now use a "default import" because the plugin is a CommonJS module.
import javascriptObfuscator from 'rollup-plugin-javascript-obfuscator';

export default {
  input: 'src/index.js',

  output: [
    {
      file: 'dist/index.cjs.js',
      format: 'cjs',
      sourcemap: false, 
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm',
      sourcemap: false,
    }
  ],
  
  external: ['mapbox-gl', 'proj4'],

  plugins: [
    nodeResolve(),
    
    // The rest of the code remains exactly the same.
    // The plugin is now correctly imported and can be used directly.
    javascriptObfuscator({
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