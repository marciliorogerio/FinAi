import 'dotenv/config';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { apiRouter } from './server/apiRouter.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In AI Studio / Cloud Run, Nginx binds to $NGINX_PORT / $PORT (8080) and proxies traffic to port 3000 ($DEFAULT_APP_PORT).
// The Node application must listen on port 3000 (or $APP_PORT), never on 8080 where Nginx is already bound.
const portArgIndex = process.argv.indexOf('--port');
const cliPort = portArgIndex !== -1 && process.argv[portArgIndex + 1] ? Number(process.argv[portArgIndex + 1]) : null;

const PORT =
  cliPort ||
  Number(process.env.APP_PORT) ||
  (process.env.PORT && process.env.PORT !== '8080' ? Number(process.env.PORT) : 3000);

const isProduction = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();

  // Middleware for parsing JSON and urlencoded data
  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ extended: true, limit: '25mb' }));

  // Health check endpoint for Cloud Run and load balancers
  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).send('OK');
  });

  // Mount API router
  app.use('/api', apiRouter);

  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(distPath) && fs.existsSync(path.resolve(distPath, 'index.html'));

  if (isProduction && hasDist) {
    // In production mode with built dist, serve built static assets from dist
    app.use(express.static(distPath));

    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // In development mode, mount Vite middleware to serve live client SPA
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  // Global Express error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled server error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err?.message || 'Erro interno do servidor.' });
    }
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT} (${isProduction ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
