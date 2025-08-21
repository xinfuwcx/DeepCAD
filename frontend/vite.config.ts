import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import devPerfMock from './plugins/devPerfMock'

export default defineConfig(({ mode }) => {
  // Load all env vars (not just VITE_ client ones) for config-time usage
  const env = loadEnv(mode, process.cwd(), '');
  const proxyTarget = env.VITE_PROXY_TARGET;

  return {
  plugins: [react(), devPerfMock()],
    resolve: {
      alias: [
        { find: '@', replacement: path.resolve(__dirname, './src') },
        // Exact-match only 'three' (not 'three/*') so examples subpaths continue to work
        { find: /^three$/, replacement: path.resolve(__dirname, './src/shims/three-compat.ts') },
        // Explicitly map three/src/Three.js back to the real module to avoid recursion
        { find: /^three\/src\/Three\.js$/, replacement: 'three/src/Three.js' },
      ],
    },
    build: {
      rollupOptions: {
        input: {
          main: path.resolve(__dirname, 'index.html'),
          pv3d: path.resolve(__dirname, 'pv3d.html'),
        },
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined;
            // Core frameworks
            if (id.includes('react')) return 'vendor_react';
            if (id.includes('three')) return 'vendor_three';
            if (id.includes('deck.gl') || id.includes('maplibre')) return 'vendor_map';
            // Visualization & charts
            if (id.includes('/d3') || id.match(/recharts/)) return 'vendor_viz';
            // Ant Design & icons
            if (id.includes('antd') || id.includes('@ant-design') ) return 'vendor_ui_antd';
            // State / form libs
            if (id.includes('zustand') || id.includes('immer') || id.includes('react-hook-form') ) return 'vendor_state';
            // Utility heavy modules (lodash (if added later), papaparse, axios, uuid)
            if (id.includes('papaparse') || id.includes('axios') || id.includes('uuid')) return 'vendor_utils';
            // Web workers / parser specific
            if (id.includes('dxf-parser')) return 'vendor_parser';
            return 'vendor_misc';
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
      proxy: proxyTarget ? {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      } : undefined,
    },
  }
})