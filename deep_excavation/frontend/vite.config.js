import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), svgr()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path,
        configure: (proxy, _options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error:', err);
            console.log(`Failed request: ${req.method} ${req.url}`);
            
            // Send a fallback response when backend is not available
            if (!res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
              });
              res.end(JSON.stringify({
                status: 'error',
                message: 'Backend server is unavailable. Please ensure the server is running.',
                error: err.message,
                path: req.url,
              }));
            }
          });
          
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log(`Sending Request: ${req.method} ${req.url}`);
            
            // Log request body for debugging if it's a POST request
            if (req.method === 'POST' && req.body) {
              try {
                console.log('Request payload:', JSON.stringify(req.body).substring(0, 200) + '...');
              } catch (e) {
                console.log('Could not stringify request body');
              }
            }
          });
          
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log(`Received Response from: ${req.url}, Status: ${proxyRes.statusCode}`);
            
            // Log detailed information for error responses
            if (proxyRes.statusCode >= 400) {
              console.error(`Error response for ${req.url}: ${proxyRes.statusCode} ${proxyRes.statusMessage}`);
            }
          });
        }
      },
    },
  },
}) 