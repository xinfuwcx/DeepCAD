import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // 设置开发服务器端口为 3000
    proxy: {
      // Proxying API requests to the backend server
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        // rewrite: (path) => path.replace(/^\/api/, '') // if your backend doesn't have /api prefix
      },
    },
  },
}) 