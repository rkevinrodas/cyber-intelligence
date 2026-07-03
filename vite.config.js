import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root:    __dirname,
  plugins: [react()],
  resolve: {
    extensions: ['.jsx', '.js', '.tsx', '.ts', '.json'],
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  base: './',          // Required for Electron file:// protocol
  server: {
    port: 3000,
    open: false,       // Electron opens its own window
    fs:   { strict: false },
  },
  build: {
    outDir:      path.resolve(__dirname, 'dist'),
    sourcemap:   false,  // disable for production build
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Chunk splitting for faster loads
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
});
