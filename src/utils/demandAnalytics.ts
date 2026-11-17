import { AppSection, CepInfo, ServiceCategory } from '../types';
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

function sanitizeRegion(location?: CepInfo | null): { state: string; city: string } {
  if (!location) {
    return { state: 'BR', city: 'Nacional' };
  }

  const state = (location.uf || '')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, 2);

  // Never send CEP digits or street details
  const city = (location.localidade || '')
    .replace(/\d+/g, '')
    .trim()
    .slice(0, 80);

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
  const { state, city } = sanitizeRegion(location);
  const signature = `${topicKey}|${state}|${city}|${channel}`;
  const now = Date.now();

  // Deduplicate rapid consecutive clicks for the exact same grain within 5 seconds
  if (signature === lastRecordedSignature && now - lastRecordedAt < 5000) {
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

export async function fetchRecentDemandStats(limit = 24): Promise<{
  rows: DemandStatRow[];
  isStarSchema: boolean;
  error: string | null;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { rows: [], isStarSchema: false, error: null };
  }

  try {
    const starQuery = await supabase
      .from('vw_star_search_demand')
      .select(
        'fact_id, demand_date, topic_key, topic_label, state_code, state_name, macro_region, city_name, channel_key, channel_label, search_count'
      )
      .order('demand_date', { ascending: false })
      .order('search_count', { ascending: false })
      .limit(limit);

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
      return { rows: mapped, isStarSchema: true, error: null };
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
        isStarSchema: false,
        error: 'Execute os scripts SQL 003 e 004 no Supabase para habilitar o Star Schema.',
      };
    }

    return {
      rows: Array.isArray(legacyQuery.data) ? (legacyQuery.data as DemandStatRow[]) : [],
      isStarSchema: false,
      error: null,
    };
  } catch {
    return {
      rows: [],
      isStarSchema: false,
      error: 'Não foi possível consultar as estatísticas agregadas agora.',
    };
  }
}
