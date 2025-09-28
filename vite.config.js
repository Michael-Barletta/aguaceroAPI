// aguaceroAPI/vite.config.js
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    // Tell Vite we are building a library
    lib: {
      entry: resolve(__dirname, 'src/fillLayerManager.js'),
      name: 'AguaceroAPI',
      // We are only building an ES Module
      formats: ['es'],
    },
    rollupOptions: {
      output: {
        // Preserve the folder structure
        preserveModules: true,
        // Define the root of that structure
        preserveModulesRoot: 'src',
        // Define the output directory
        dir: 'dist',
        // Define the naming pattern for entry files
        entryFileNames: '[name].js',
      },
    },
  },
  // Add worker configuration
  worker: {
    format: 'es',
    rollupOptions: {
      output: {
        entryFileNames: '[name].js',
      }
    }
  },
});