/**
 * @file vite.config.ts
 * @description Vite 配置文件
 * @author Deep Excavation Team
 * @version 1.0.0
 * @copyright 2025
 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  publicDir: 'public',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@components': path.resolve(__dirname, './components'),
      '@core': path.resolve(__dirname, './core'),
      '@utils': path.resolve(__dirname, './utils'),
      '@models': path.resolve(__dirname, './models'),
      '@styles': path.resolve(__dirname, './styles'),
      '@assets': path.resolve(__dirname, './assets'),
    },
  },
  optimizeDeps: {
    exclude: ['kratos']
  },
  server: {
    port: 1000,
    open: true,
    proxy: {
      // 配置代理
      '/api': {
        target: 'http://localhost:6000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    sourcemap: true,
  },
}); 