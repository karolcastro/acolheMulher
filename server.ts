import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_AUDIO_MIME_TYPES = new Set([
  'audio/webm',
  'audio/mp4',
  'audio/ogg',
  'audio/wav',
  'audio/mpeg',
  'audio/mp3',
  'audio/aac',
  'audio/x-m4a',
]);

function normalizeAudioMimeType(raw?: unknown): string {
  if (typeof raw !== 'string') return 'audio/webm';
  const base = raw.split(';')[0]?.trim().toLowerCase() || 'audio/webm';
  return ALLOWED_AUDIO_MIME_TYPES.has(base) ? base : 'audio/webm';
}

function createGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '6mb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  app.post('/api/transcribe', async (req: Request, res: Response) => {
    const ai = createGeminiClient();
    if (!ai) {
      res.status(503).json({
        error: 'Transcrição de áudio indisponível no momento. Digite seu CEP ou cidade.',
      });
      return;
    }

    const { audioBase64, mimeType } = (req.body ?? {}) as {
      audioBase64?: unknown;
      mimeType?: unknown;
    };

    if (typeof audioBase64 !== 'string' || audioBase64.trim().length === 0) {
      res.status(400).json({ error: 'Áudio vazio. Tente falar novamente ou digite seu CEP.' });
      return;
    }

    if (audioBase64.length > 7_000_000) {
      res.status(413).json({ error: 'Áudio muito longo. Fale apenas o CEP, cidade ou o que procura.' });
      return;
    }

    const cleanMime = normalizeAudioMimeType(mimeType);

    try {
      const audioPart = {
        inlineData: {
          mimeType: cleanMime,
          data: audioBase64.trim(),
        },
      };

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-transcribe',
        contents: {
          parts: [
            audioPart,
            {
              text: 'Transcreva exatamente o que foi falado neste áudio em português do Brasil (pt-BR), sem explicações nem aspas. Se a pessoa ditou um CEP, cidade ou tipo de apoio (psicóloga, advogada, delegacia, exame, curso), retorne apenas a transcrição limpa.',
            },
          ],
        },
      });

      const transcript = (response.text ?? '').trim();
      if (!transcript) {
        res.status(422).json({
          error: 'Não foi possível entender o áudio. Fale perto do microfone ou digite seu CEP.',
        });
        return;
      }

      res.json({ transcript });
    } catch {
      res.status(502).json({
        error: 'Erro temporário ao reconhecer sua voz. Tente novamente ou digite seu CEP.',
      });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AcolheMulher server running on http://0.0.0.0:${PORT}`);
  });
}

void startServer();
