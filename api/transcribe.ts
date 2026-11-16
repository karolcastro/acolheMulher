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

  const rawKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? '';
  const apiKey = rawKey.replace(/^["']|["']$/g, '').trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    res.status(503).json({
      error:
        'Transcrição por servidor sem chave GEMINI_API_KEY configurada. Configure a variável de ambiente ou digite seu CEP.',
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
  } catch (err: unknown) {
    const status =
      typeof err === 'object' && err !== null && 'status' in err
        ? Number((err as { status?: unknown }).status)
        : undefined;
    console.error('[api/transcribe] Upstream error status:', status ?? 'unknown');

    if (status === 400 || status === 401 || status === 403) {
      res.status(503).json({
        error:
          'Chave de transcrição inválida ou sem permissão. Verifique GEMINI_API_KEY ou digite seu CEP.',
      });
      return;
    }

    res.status(502).json({
      error: 'Erro temporário ao reconhecer sua voz. Tente novamente ou digite seu CEP.',
    });
  }
}
