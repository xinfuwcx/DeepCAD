import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        pv3d: path.resolve(__dirname, 'pv3d.html'),
      },
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('three')) return 'vendor_three';
            if (id.includes('react')) return 'vendor_react';
            if (id.includes('deck.gl') || id.includes('maplibre')) return 'vendor_map';
            return 'vendor_misc';
          }
        }
      }
    },
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
  // Updated dev server port to 5310 (was 5202) to avoid prior conflict
  port: 5310,
    host: true,
  strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8087',
        changeOrigin: true,
      },
    },
  },
})