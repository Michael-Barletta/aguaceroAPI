// aguaceroAPI/vite.config.js
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // This part tells Vite we are building a library
    lib: {
      // CHANGE #1: The entry point is now our new `index.js` file,
      // which exports everything we want to make public.
      entry: resolve(__dirname, 'src/index.js'),
      
      // The name for the global variable in UMD builds (good for CDN usage)
      name: 'AguaceroAPI',

      // The base name for the output files. Vite will add extensions.
      // e.g., aguacero-api.js and aguacero-api.umd.cjs
      fileName: 'aguacero-api',
      
      // We will build both an ES module and a UMD module for max compatibility.
      formats: ['es', 'umd'],
    },
    // CHANGE #2: We remove the old `rollupOptions`.
    // The `preserveModules: true` option was preventing bundling.
    // By removing it, Vite will now correctly bundle everything into single files.
    rollupOptions: {
      // We can optionally make peer dependencies external so they aren't
      // bundled into our library. This is good practice.
      // external: ['mapbox-gl'],
    },
  },
  // Your worker configuration can remain the same. It is not related to the
  // library build and should continue to work as expected.
  worker: {
    format: 'es',
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
      }
    }
  },
});