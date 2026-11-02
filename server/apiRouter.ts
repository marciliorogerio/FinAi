import express from 'express';
import type { Request, Response } from 'express';
import { chatFinancialAdvisor, parseFinancialInput, transcribeAudio } from './gemini.ts';

export const apiRouter = express.Router();

apiRouter.use(express.json({ limit: '25mb' }));
apiRouter.use(express.urlencoded({ extended: true, limit: '25mb' }));

/**
 * Universal JSON response sender that works with both Express Response and raw Node.js ServerResponse
 */
function sendJson(res: any, status: number, data: any) {
  try {
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(status).json(data);
    }
  } catch {
    // fallback to raw ServerResponse methods
  }
  res.statusCode = status;
  if (typeof res.setHeader === 'function') {
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
  }
  res.end(JSON.stringify(data));
}

apiRouter.get('/health', (_req: Request, res: Response) => {
  sendJson(res, 200, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiConfigured: !!process.env.GEMINI_API_KEY,
  });
});

apiRouter.post('/gemini/transcribe', async (req: Request, res: Response) => {
  try {
    const { audioBase64, audioMimeType } = req.body || {};

    if (!audioBase64) {
      return sendJson(res, 400, { error: 'Áudio não fornecido.' });
    }

    const text = await transcribeAudio(audioBase64, audioMimeType);
    sendJson(res, 200, { text });
  } catch (error: any) {
    console.error('Error in /api/gemini/transcribe:', error);
    sendJson(res, 500, {
      error: error.message || 'Erro ao transcrever áudio.',
    });
  }
});

apiRouter.post('/gemini/parse', async (req: Request, res: Response) => {
  try {
    const { text, audioBase64, audioMimeType, imageBase64, imageMimeType, currentDate } = req.body || {};

    if (!text && !audioBase64 && !imageBase64) {
      return sendJson(res, 400, {
        error: 'Envie ao menos um formato: texto, áudio ou imagem de nota fiscal.',
      });
    }

    const result = await parseFinancialInput({
      text,
      audioBase64,
      audioMimeType,
      imageBase64,
      imageMimeType,
      currentDate,
    });

    sendJson(res, 200, result);
  } catch (error: any) {
    console.error('Error in /api/gemini/parse:', error);
    sendJson(res, 500, {
      error: error.message || 'Erro ao processar transação com a IA.',
    });
  }
});

apiRouter.post('/gemini/chat', async (req: Request, res: Response) => {
  try {
    const { message, history, financialContext } = req.body || {};

    if (!message || typeof message !== 'string') {
      return sendJson(res, 400, { error: 'Mensagem obrigatória.' });
    }

    const result = await chatFinancialAdvisor({
      message,
      history,
      financialContext,
    });

    sendJson(res, 200, result);
  } catch (error: any) {
    console.error('Error in /api/gemini/chat:', error);
    sendJson(res, 500, {
      error: error.message || 'Erro ao processar consulta com o assistente.',
    });
  }
});
