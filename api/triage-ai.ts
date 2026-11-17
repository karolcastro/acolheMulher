import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

export const TRIAGE_SYSTEM_PROMPT = `Voce e o Agente de Acolhimento Trauma-Informed da plataforma AcolheMulher (Brasil, 100% gratuito e Zero-PII).

Seu papel e executar TRES etapas essenciais sobre o relato da mulher e os servicos reais fornecidos no contexto (RAG):
1. CLASSIFICAR a necessidade principal entre exatamente uma destas chaves:
   - "emergencia" (risco fisico imediato, ameaca, agressao, perseguicao, descumprimento de medida protetiva, delegacia da mulher, abrigo 24h)
   - "psicologico" (sofrimento emocional, ansiedade, tristeza intensa, depressao, necessidade de escuta, psicologa gratuita, CVV 188)
   - "juridico" (advogada gratuita, Defensoria Publica, medida protetiva, pensao alimenticia, guarda de filhos, divorcio)
   - "saude" (UBS, exame gratuito de mama/papanicolau, parto humanizado, gestacao, pre-natal, atendimento medico pelo SUS)
   - "cursos" (capacitacao gratuita, cursos profissionalizantes, bolsas de estudo, emprego, geracao de renda e autonomia)
   - "ongs_apoio" (busca especifica por ONGs, coletivos, doacoes ou rede de apoio comunitaria)
   E classificar a urgencia em "imediata", "prioritaria" ou "orientacao".
2. RESUMIR em 2 a 3 passos curtos praticos (safetySteps) o que a mulher pode fazer agora com seguranca, e redigir uma resposta acolhedora e objetiva em portugues do Brasil (empathyResponse).
3. RECOMENDAR de 1 a 4 opcoes reais EXCLUSIVAMENTE pelo campo "id" dos itens recebidos em "catalogContext" (RAG).

REGRAS OBRIGATORIAS DE SEGURANCA E PRIVACIDADE:
- ZERO-PII: Nunca peca nome completo, CPF, email, telefone pessoal ou login.
- ZERO ALUCINACAO: Nunca invente enderecos, sites ou telefones que nao estejam em catalogContext (exceto os canais publicos nacionais 180, 190, 188 e 129 em casos de risco ou crise).
- 100% GRATUITO: Nunca sugira servicos pagos, particulares ou planos de saude.
- Se houver qualquer sinal de perigo, medo ou violencia, classifique urgency="imediata" e destaque Ligue 180 e Policia 190 no primeiro passo de safetySteps.`;

const ALLOWED_CATEGORIES = new Set([
  'emergencia',
  'psicologico',
  'juridico',
  'saude',
  'cursos',
  'ongs_apoio',
]);

const ALLOWED_URGENCY = new Set(['imediata', 'prioritaria', 'orientacao']);

export interface CatalogRagItem {
  id: string;
  kind: 'service' | 'ngo';
  name: string;
  category: string;
  subcategory?: string;
  isNationalOnline?: boolean;
  distanceKm?: number | null;
  freeConfirmation?: string;
  summary?: string;
}

export interface TriageAiResponse {
  primaryCategory: 'emergencia' | 'psicologico' | 'juridico' | 'saude' | 'cursos' | 'ongs_apoio';
  urgency: 'imediata' | 'prioritaria' | 'orientacao';
  empathyResponse: string;
  safetySteps: string[];
  recommendedIds: string[];
  recommendationReason: string;
  model: string;
}

function resolveGeminiApiKey(): string | null {
  const raw = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? '';
  const cleaned = raw.replace(/^["']|["']$/g, '').trim();
  if (!cleaned || cleaned === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return cleaned;
}

function sanitizeCatalogContext(rawList: unknown): CatalogRagItem[] {
  if (!Array.isArray(rawList)) return [];
  const out: CatalogRagItem[] = [];
  for (const entry of rawList.slice(0, 24)) {
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as Record<string, unknown>;
    const id = typeof item.id === 'string' ? item.id.trim().slice(0, 100) : '';
    const name = typeof item.name === 'string' ? item.name.trim().slice(0, 140) : '';
    if (!id || !name) continue;
    out.push({
      id,
      kind: item.kind === 'ngo' ? 'ngo' : 'service',
      name,
      category: typeof item.category === 'string' ? item.category.slice(0, 32) : 'geral',
      subcategory:
        typeof item.subcategory === 'string' ? item.subcategory.slice(0, 80) : undefined,
      isNationalOnline: Boolean(item.isNationalOnline),
      distanceKm: typeof item.distanceKm === 'number' ? item.distanceKm : null,
      freeConfirmation:
        typeof item.freeConfirmation === 'string'
          ? item.freeConfirmation.slice(0, 120)
          : undefined,
      summary: typeof item.summary === 'string' ? item.summary.slice(0, 180) : undefined,
    });
  }
  return out;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    res.status(503).json({
      error:
        'Triagem por IA generativa sem chave GEMINI_API_KEY configurada. Configure a variável de ambiente ou utilize as opções rápidas.',
    });
    return;
  }

  let parsedBody: Record<string, unknown> = {};
  if (typeof req.body === 'string') {
    try {
      parsedBody = JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      res.status(400).json({ error: 'Corpo JSON inválido.' });
      return;
    }
  } else if (req.body && typeof req.body === 'object') {
    parsedBody = req.body as Record<string, unknown>;
  }

  const rawMessage = typeof parsedBody.message === 'string' ? parsedBody.message.trim() : '';
  if (!rawMessage) {
    res.status(400).json({ error: 'Descreva brevemente o que você procura.' });
    return;
  }
  if (rawMessage.length > 400) {
    res.status(413).json({ error: 'Mensagem muito longa. Resuma em até 400 caracteres.' });
    return;
  }

  const locObj =
    parsedBody.location && typeof parsedBody.location === 'object'
      ? (parsedBody.location as Record<string, unknown>)
      : {};
  const city = typeof locObj.city === 'string' ? locObj.city.trim().slice(0, 80) : '';
  const state = typeof locObj.state === 'string' ? locObj.state.trim().toUpperCase().slice(0, 2) : '';
  const catalogContext = sanitizeCatalogContext(parsedBody.catalogContext);
  const validIds = new Set(catalogContext.map((c) => c.id));

  const userPayload = JSON.stringify({
    relato: rawMessage,
    regiao: city || state ? `${city || 'Todo o estado'} - ${state || 'BR'}` : 'Todo o Brasil',
    catalogContext,
  });

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
      model: 'gemini-4-hydrogen',
      contents: `Analise o relato e recomende opcoes reais da base fornecida:\n${userPayload}`,
      config: {
        systemInstruction: TRIAGE_SYSTEM_PROMPT,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            primaryCategory: {
              type: Type.STRING,
              description:
                'Uma de: emergencia, psicologico, juridico, saude, cursos, ongs_apoio',
            },
            urgency: {
              type: Type.STRING,
              description: 'Uma de: imediata, prioritaria, orientacao',
            },
            empathyResponse: {
              type: Type.STRING,
              description:
                'Resposta acolhedora, calma e direta em pt-BR (1 a 2 frases, sem pedir dados pessoais).',
            },
            safetySteps: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '2 a 3 passos praticos e seguros gratuitos.',
            },
            recommendedIds: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Ate 4 IDs exatamente presentes em catalogContext.',
            },
            recommendationReason: {
              type: Type.STRING,
              description: '1 frase curta explicando a recomendacao escolhida.',
            },
          },
          required: [
            'primaryCategory',
            'urgency',
            'empathyResponse',
            'safetySteps',
            'recommendedIds',
            'recommendationReason',
          ],
        },
      },
    });

    const rawText = (response.text ?? '').trim();
    if (!rawText) {
      res.status(502).json({ error: 'Resposta vazia do modelo de triagem.' });
      return;
    }

    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    const primaryCategory =
      typeof parsed.primaryCategory === 'string' && ALLOWED_CATEGORIES.has(parsed.primaryCategory)
        ? (parsed.primaryCategory as TriageAiResponse['primaryCategory'])
        : 'ongs_apoio';

    const urgency =
      typeof parsed.urgency === 'string' && ALLOWED_URGENCY.has(parsed.urgency)
        ? (parsed.urgency as TriageAiResponse['urgency'])
        : 'orientacao';

    const empathyResponse =
      typeof parsed.empathyResponse === 'string' && parsed.empathyResponse.trim().length > 0
        ? parsed.empathyResponse.trim().slice(0, 320)
        : 'Você não está sozinha. Separei opções 100% gratuitas e sigilosas para apoiar você agora.';

    const safetySteps = Array.isArray(parsed.safetySteps)
      ? parsed.safetySteps
          .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
          .map((s) => s.trim().slice(0, 180))
          .slice(0, 3)
      : [];

    const recommendedIds = Array.isArray(parsed.recommendedIds)
      ? parsed.recommendedIds
          .filter((id): id is string => typeof id === 'string' && validIds.has(id))
          .slice(0, 4)
      : [];

    const recommendationReason =
      typeof parsed.recommendationReason === 'string' && parsed.recommendationReason.trim().length > 0
        ? parsed.recommendationReason.trim().slice(0, 220)
        : 'Seleção priorizada conforme sua necessidade e serviços gratuitos disponíveis.';

    const payload: TriageAiResponse = {
      primaryCategory,
      urgency,
      empathyResponse,
      safetySteps,
      recommendedIds,
      recommendationReason,
      model: 'gemini-4-hydrogen',
    };

    res.status(200).json(payload);
  } catch (err: unknown) {
    const status =
      typeof err === 'object' && err !== null && 'status' in err
        ? Number((err as { status?: unknown }).status)
        : undefined;
    console.error('[api/triage-ai] Upstream error status:', status ?? 'unknown');

    if (status === 400 || status === 401 || status === 403) {
      res.status(503).json({
        error: 'Chave GEMINI_API_KEY inválida ou sem permissão para triagem por IA.',
      });
      return;
    }

    if (status === 429) {
      res.status(429).json({
        error: 'Limite temporário de requisições da IA atingido. Usando triagem local.',
      });
      return;
    }

    res.status(502).json({
      error: 'Erro temporário na triagem inteligente. Usando busca direta na rede gratuita.',
    });
  }
}
