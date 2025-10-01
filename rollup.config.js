// rollup.config.js
import { nodeResolve } from '@rollup/plugin-node-resolve';

export default {
  // 1. The entry point of your library
  input: 'src/index.js',

  // 2. The output files to generate
  output: [
    {
      file: 'dist/index.cjs.js',
      format: 'cjs', // CommonJS format (for Node.js)
      sourcemap: true,
    },
    {
      file: 'dist/index.esm.js',
      format: 'esm', // ES Module format (for modern bundlers)
      sourcemap: true,
    }
  ],
  
  // 3. Tells Rollup not to bundle these packages
  //    (because they are peerDependencies)
  external: ['mapbox-gl', 'proj4'],

  // 4. Plugins to help the build process
  plugins: [
    nodeResolve() // Helps find third-party modules in node_modules
  ]
};