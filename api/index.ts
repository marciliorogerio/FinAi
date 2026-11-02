import express from 'express';
import { apiRouter } from '../server/apiRouter.ts';

const app = express();

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Mount the API router
app.use('/api', apiRouter);

// Health check endpoint
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

export default app;
