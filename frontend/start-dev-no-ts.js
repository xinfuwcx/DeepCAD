import { createServer } from 'vite'
import react from '@vitejs/plugin-react'

const server = await createServer({
  plugins: [react()],
  esbuild: {
    target: 'es2020',
    format: 'esm'
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      },
    },
  },
  logLevel: 'info'
})

await server.listen()
server.printUrls()
console.log('🚀 Development server started - TypeScript checking disabled')