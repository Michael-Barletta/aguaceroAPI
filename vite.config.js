// aguaceroAPI/vite.config.js

import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'AguaceroAPI',
      fileName: 'aguacero-api',
      formats: ['es', 'umd'],
    },
    rollupOptions: {
      // --- THIS IS THE FIX ---
      // These packages should not be bundled with your library.
      // The application that uses your library is responsible for providing them.
      external: ['mapbox-gl', 'proj4'],

      output: {
        // Provide global variables to use in the UMD build
        // for your externalized dependencies.
        globals: {
          'mapbox-gl': 'mapboxgl',
          'proj4': 'proj4',
        },
      },
    },
  },
  // Your worker config is fine and does not need to be changed.
  worker: {
    format: 'es',
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
      }
    }
  },
});