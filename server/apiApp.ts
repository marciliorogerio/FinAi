import express from 'express';
import { apiRouter } from './apiRouter.ts';

export const expressApp = express();

expressApp.use(express.json({ limit: '25mb' }));
expressApp.use(express.urlencoded({ extended: true, limit: '25mb' }));
expressApp.use('/api', apiRouter);

// Global error handler
expressApp.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Express App Error:', err);
  if (!res.headersSent) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: err.message || 'Erro interno do servidor.' }));
  }
});
