// rollup.config.js

import { nodeResolve } from '@rollup/plugin-node-resolve';
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
    
    // --- NEW: More Aggressive Obfuscation Settings ---
    javascriptObfuscator({
      options: {
        // This is the most powerful option. It restructures your code with a while/switch statement.
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 1, // Apply to 100% of applicable nodes

        // Adds random "dead" code blocks to further confuse analysis.
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 1, // Apply to 100% of applicable nodes

        // Prevents easy debugging with developer tools.
        debugProtection: true,
        debugProtectionInterval: 4000, // Runs the debugger check every 4 seconds

        // Removes console.log, console.info, etc., from the output.
        disableConsoleOutput: true,

        // Makes the code self-defending against beautifiers/formatters.
        selfDefending: true,

        // Encodes all strings into a central array and retrieves them by an index.
        stringArray: true,
        stringArrayEncoding: ['rc4'], // Use a stronger encoding
        stringArrayThreshold: 1,
        rotateStringArray: true,
        
        // Renames properties, but use with caution. Let's keep it off for now to ensure API compatibility.
        transformObjectKeys: false, 

        // Standard minification options
        compact: true,
        simplify: true,
        unicodeEscapeSequence: false
      }
    })
  ]
};