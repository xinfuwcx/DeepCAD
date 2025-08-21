import type { Plugin } from 'vite';

// Dev-only mock endpoints to avoid 500s when backend isn't running
export default function devPerfMock(): Plugin {
  return {
    name: 'deepcad-dev-perf-mock',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url || '';
        const method = req.method || 'GET';

        // Mock performance report endpoint
        if (url.startsWith('/api/perf/report')) {
          let body = '';
          req.on('data', (chunk) => { body += chunk; });
          req.on('end', () => {
            try {
              const parsed = body ? JSON.parse(body) : {};
              const accepted = Array.isArray(parsed.batch) ? parsed.batch.length : 0;
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true, accepted }));
            } catch {
              res.statusCode = 200;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ ok: true, accepted: 0 }));
            }
          });
          return;
        }

        // Basic health/status checks
        if (url === '/api/health' || url === '/api/status' || url === '/api/ping') {
          if (method === 'HEAD') {
            res.statusCode = 200;
            res.end();
            return;
          }
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, service: 'deepcad-dev', ts: Date.now() }));
          return;
        }

        next();
      });
    },
  };
}
