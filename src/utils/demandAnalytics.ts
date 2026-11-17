import { AppSection, CepInfo, ServiceCategory, ServiceItem } from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabaseClient';

export type DemandTopicKey =
  | 'emergencia'
  | 'psicologico'
  | 'juridico'
  | 'saude'
  | 'cursos'
  | 'ongs_apoio'
  | 'geral';

export type DemandAccessChannel =
  | 'web_cep'
  | 'web_voice'
  | 'triage_agent'
  | 'category_card'
  | 'category_filter'
  | 'ongs_directory'
  | 'pwa_offline'
  | 'widget_ngo';

export interface DemandStatRow {
  id: string | number;
  demand_date: string;
  topic_key: DemandTopicKey;
  topic_label: string;
  state: string;
  state_name?: string;
  macro_region?: string;
  city: string;
  channel_key?: DemandAccessChannel;
  channel_label?: string;
  search_count: number;
}

export interface VoiceSearchStatRow {
  voice_fact_sk: number;
  search_date: string;
  intent_key: string;
  intent_label_normalized: string;
  category_key: string;
  state_code: string;
  city_normalized: string;
  utterance_normalized: string;
  had_cep_spoken: boolean;
  word_count: number;
  search_count: number;
}

const VALID_TOPIC_KEYS = new Set<DemandTopicKey>([
  'emergencia',
  'psicologico',
  'juridico',
  'saude',
  'cursos',
  'ongs_apoio',
  'geral',
]);

let lastRecordedSignature = '';
let lastRecordedAt = 0;
let lastVoiceSignature = '';
let lastVoiceAt = 0;
const syncedDiscoveredNgoKeys = new Set<string>();

export function stripAccentsAscii(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function sanitizeVoiceTranscriptForDb(rawTranscript: string): string {
  const noAccents = stripAccentsAscii(rawTranscript).toLowerCase();
  const withoutNumbers = noAccents
    .replace(/\b\d{2,}\b/g, ' ')
    .replace(/[^a-z ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 140);

  return withoutNumbers || 'busca por voz';
}

export function mapSectionToTopicKey(
  section?: AppSection | ServiceCategory | 'geral' | null
): DemandTopicKey {
  if (!section || section === 'todos') return 'geral';
  if (section === 'social') return 'ongs_apoio';
  if (VALID_TOPIC_KEYS.has(section as DemandTopicKey)) {
    return section as DemandTopicKey;
  }
  return 'geral';
}

export function sanitizeRegionForAnalytics(location?: CepInfo | null): { state: string; city: string } {
  if (!location) {
    return { state: 'BR', city: 'Nacional' };
  }

  const state = (location.uf || '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, 2);

  // Never send CEP digits or street details; strip accents to avoid normalized key mismatches
  const city = stripAccentsAscii(
    (location.localidade || '').replace(/\d+/g, '').trim()
  ).slice(0, 80);

  if (state.length !== 2) {
    return { state: 'BR', city: city || 'Nacional' };
  }

  return {
    state,
    city: city || 'Todo o estado',
  };
}

/**
 * Registers an anonymous daily aggregate increment in the Star Schema (fact_search_demand)
 * via record_star_search_demand RPC (with fallback to record_anonymous_search_demand).
 * Zero-PII: never stores CEP, IP, coordinates, raw typed query, or browser identifiers.
 */
export async function recordAnonymousSearchDemand(
  section?: AppSection | ServiceCategory | 'geral' | null,
  location?: CepInfo | null,
  channel: DemandAccessChannel = 'web_cep'
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    return;
  }

  const topicKey = mapSectionToTopicKey(section);
  const { state, city } = sanitizeRegionForAnalytics(location);
  const signature = `${topicKey}|${state}|${city}|${channel}`;
  const now = Date.now();

  if (signature === lastRecordedSignature && now - lastRecordedAt < 800) {
    return;
  }

  lastRecordedSignature = signature;
  lastRecordedAt = now;

  try {
    const starRes = await supabase.rpc('record_star_search_demand', {
      p_topic_key: topicKey,
      p_state: state,
      p_city: city,
      p_channel_key: channel,
    });

    if (starRes.error) {
      await supabase.rpc('record_anonymous_search_demand', {
        p_topic_key: topicKey,
        p_state: state,
        p_city: city,
      });
    }
  } catch {
    // Non-blocking: analytics never interrupts access to support services
  }
}

/**
 * Converts a sanitized spoken query (Zero-PII, no CEP digits, no accents)
 * into relational Star Schema entities: dim_voice_intents, dim_voice_keywords,
 * fact_voice_searches, fact_voice_search_keywords, and fact_search_demand.
 */
export async function recordVoiceSearchRelational(
  rawTranscript: string,
  section?: AppSection | ServiceCategory | 'geral' | null,
  location?: CepInfo | null
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    return;
  }

  const topicKey = mapSectionToTopicKey(section);
  const { state, city } = sanitizeRegionForAnalytics(location);
  const sanitizedUtterance = sanitizeVoiceTranscriptForDb(rawTranscript);
  const signature = `${sanitizedUtterance}|${topicKey}|${state}|${city}`;
  const now = Date.now();

  if (signature === lastVoiceSignature && now - lastVoiceAt < 800) {
    return;
  }

  lastVoiceSignature = signature;
  lastVoiceAt = now;

  try {
    const res = await supabase.rpc('record_voice_search_relational', {
      p_raw_utterance: sanitizedUtterance,
      p_detected_topic: topicKey,
      p_state: state,
      p_city: city,
    });

    if (res.error) {
      // Fallback gracefully if migration 006 has not been applied yet
      await recordAnonymousSearchDemand(topicKey, location, 'web_voice');
    }
  } catch {
    // Non-blocking
  }
}

/**
 * Registers a newly discovered women-focused NGO into public.ngos without duplicates
 * when Supabase is connected (uses register_ngo_candidate RPC with osm_discovery source).
 */
export async function syncDiscoveredNgoToDatabase(item: ServiceItem): Promise<void> {
  if (!isSupabaseConfigured || !supabase || item.category !== 'social') {
    return;
  }

  const dedupeKey = `${stripAccentsAscii(item.name).toLowerCase()}|${item.state || ''}|${stripAccentsAscii(item.city || '')}`;
  if (syncedDiscoveredNgoKeys.has(dedupeKey)) {
    return;
  }
  syncedDiscoveredNgoKeys.add(dedupeKey);

  try {
    await supabase.rpc('register_ngo_candidate', {
      p_name: item.name,
      p_organization: item.name,
      p_area: 'acolhimento_protecao',
      p_area_label: item.subcategory || 'ONG Voltada para Mulheres',
      p_coverage: [item.city, item.state].filter(Boolean).join(' - ') || 'Brasil',
      p_state: item.state ?? null,
      p_city: item.city ?? null,
      p_summary: item.description || 'Organizacao comunitaria gratuita voltada ao acolhimento de mulheres.',
      p_how_they_help: [item.freeConfirmation || 'Apoio gratuito voltado ao publico feminino.'],
      p_access_channel: item.phone ? `Telefone/Atendimento: ${item.phone}` : 'Atendimento presencial local',
      p_website_url: item.website || '',
      p_privacy_note: item.address || 'Atendimento gratuito local.',
      p_related_categories: ['psicologico', 'juridico', 'emergencia'],
      p_is_free_confirmed: true,
      p_source_type: 'osm_discovery',
    });
  } catch {
    // Non-blocking
  }
}

export async function fetchRecentDemandStats(limit = 24): Promise<{
  rows: DemandStatRow[];
  voiceRows: VoiceSearchStatRow[];
  totalSearches: number;
  isStarSchema: boolean;
  error: string | null;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { rows: [], voiceRows: [], totalSearches: 0, isStarSchema: false, error: null };
  }

  try {
    const [starQuery, totalsQuery, voiceQuery] = await Promise.all([
      supabase
        .from('vw_star_search_demand')
        .select(
          'fact_id, demand_date, topic_key, topic_label, state_code, state_name, macro_region, city_name, channel_key, channel_label, search_count'
        )
        .order('demand_date', { ascending: false })
        .order('search_count', { ascending: false })
        .limit(limit),
      supabase
        .from('vw_star_demand_totals')
        .select('total_searches')
        .maybeSingle(),
      supabase
        .from('vw_star_voice_searches')
        .select(
          'voice_fact_sk, search_date, intent_key, intent_label_normalized, category_key, state_code, city_normalized, utterance_normalized, had_cep_spoken, word_count, search_count'
        )
        .order('search_date', { ascending: false })
        .order('search_count', { ascending: false })
        .limit(12),
    ]);

    if (!starQuery.error && Array.isArray(starQuery.data)) {
      const mapped: DemandStatRow[] = starQuery.data.map((row: Record<string, unknown>) => ({
        id: `star-${String(row.fact_id ?? '')}`,
        demand_date: String(row.demand_date ?? ''),
        topic_key: mapSectionToTopicKey(String(row.topic_key ?? 'geral') as DemandTopicKey),
        topic_label: String(row.topic_label ?? 'Busca Geral'),
        state: String(row.state_code ?? 'BR'),
        state_name: row.state_name ? String(row.state_name) : undefined,
        macro_region: row.macro_region ? String(row.macro_region) : undefined,
        city: String(row.city_name ?? 'Nacional'),
        channel_key: row.channel_key as DemandAccessChannel | undefined,
        channel_label: row.channel_label ? String(row.channel_label) : undefined,
        search_count: Number(row.search_count ?? 1),
      }));

      const voiceRows: VoiceSearchStatRow[] =
        !voiceQuery.error && Array.isArray(voiceQuery.data)
          ? (voiceQuery.data as VoiceSearchStatRow[])
          : [];

      const fallbackSum = mapped.reduce((acc, r) => acc + r.search_count, 0);
      const totalFromView =
        !totalsQuery.error && totalsQuery.data && typeof totalsQuery.data.total_searches === 'number'
          ? Number(totalsQuery.data.total_searches)
          : fallbackSum;

      return {
        rows: mapped,
        voiceRows,
        totalSearches: totalFromView,
        isStarSchema: true,
        error: null,
      };
    }

    const legacyQuery = await supabase
      .from('search_demand_stats')
      .select('id, demand_date, topic_key, topic_label, state, city, search_count')
      .order('demand_date', { ascending: false })
      .order('search_count', { ascending: false })
      .limit(limit);

    if (legacyQuery.error) {
      return {
        rows: [],
        voiceRows: [],
        totalSearches: 0,
        isStarSchema: false,
        error: 'Execute os scripts SQL 004, 005 e 006 no Supabase para habilitar o banco completo e o Star Schema.',
      };
    }

    const legacyRows = Array.isArray(legacyQuery.data) ? (legacyQuery.data as DemandStatRow[]) : [];
    const legacySum = legacyRows.reduce((acc, r) => acc + Number(r.search_count ?? 0), 0);

    return {
      rows: legacyRows,
      voiceRows: [],
      totalSearches: legacySum,
      isStarSchema: false,
      error: null,
    };
  } catch {
    return {
      rows: [],
      voiceRows: [],
      totalSearches: 0,
      isStarSchema: false,
      error: 'Não foi possível consultar as estatísticas agregadas agora.',
    };
  }
}

