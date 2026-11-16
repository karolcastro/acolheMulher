import { GoogleGenAI } from '@google/genai';

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

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
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

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: normalizeAudioMimeType(mimeType),
              data: audioBase64.trim(),
            },
          },
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

    res.status(200).json({ transcript });
  } catch {
    res.status(502).json({
      error: 'Erro temporário ao reconhecer sua voz. Tente novamente ou digite seu CEP.',
    });
  }
}
