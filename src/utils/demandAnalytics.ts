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

export interface DemandStatRow {
  id: number;
  demand_date: string;
  topic_key: DemandTopicKey;
  topic_label: string;
  state: string;
  city: string;
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
 * Registers an anonymous daily aggregate increment (topic + City/UF) in Supabase.
 * Zero-PII: never stores CEP, IP, coordinates, raw typed query, or browser identifiers.
 */
export async function recordAnonymousSearchDemand(
  section?: AppSection | ServiceCategory | 'geral' | null,
  location?: CepInfo | null
): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    return;
  }

  const topicKey = mapSectionToTopicKey(section);
  const { state, city } = sanitizeRegion(location);
  const signature = `${topicKey}|${state}|${city}`;
  const now = Date.now();

  // Deduplicate rapid consecutive clicks for the exact same topic+region within 5 seconds
  if (signature === lastRecordedSignature && now - lastRecordedAt < 5000) {
    return;
  }

  lastRecordedSignature = signature;
  lastRecordedAt = now;

  try {
    await supabase.rpc('record_anonymous_search_demand', {
      p_topic_key: topicKey,
      p_state: state,
      p_city: city,
    });
  } catch {
    // Non-blocking: analytics never interrupts access to support services
  }
}

export async function fetchRecentDemandStats(limit = 24): Promise<{
  rows: DemandStatRow[];
  error: string | null;
}> {
  if (!isSupabaseConfigured || !supabase) {
    return { rows: [], error: null };
  }

  try {
    const { data, error } = await supabase
      .from('search_demand_stats')
      .select('id, demand_date, topic_key, topic_label, state, city, search_count')
      .order('demand_date', { ascending: false })
      .order('search_count', { ascending: false })
      .limit(limit);

    if (error) {
      return {
        rows: [],
        error: 'Tabela search_demand_stats ainda não aplicada no Supabase.',
      };
    }

    return {
      rows: Array.isArray(data) ? (data as DemandStatRow[]) : [],
      error: null,
    };
  } catch {
    return {
      rows: [],
      error: 'Não foi possível consultar as estatísticas agregadas agora.',
    };
  }
}
