import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { CepInfo, ServiceCategory, ServiceItem } from '../types';
import type { NgoHelpArea, NgoItem } from '../data/ngosData';
import { formatCep, normalizeAsciiKey, VALID_BRASIL_UFS } from '../utils/cepSearchService';
import { haversineDistanceKm, MAX_PROXIMITY_KM } from '../utils/cepProximity';

const metaEnv = (import.meta as { env?: Record<string, string | undefined> }).env;
const rawUrl = metaEnv?.VITE_SUPABASE_URL?.trim() ?? '';
const rawAnonKey = metaEnv?.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

function isValidSupabaseUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
  } catch {
    return false;
  }
}

export const isSupabaseConfigured: boolean = isValidSupabaseUrl(rawUrl) && rawAnonKey.length > 0;

// Zero-PII client configuration: no session persistence in localStorage/cookies for women browsing
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(rawUrl, rawAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      realtime: {
        params: {
          eventsPerSecond: 5,
        },
      },
    })
  : null;

export interface SupabaseServiceRow {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  description: string;
  is_national_online: boolean;
  state: string | null;
  city: string | null;
  neighborhood: string | null;
  address: string | null;
  cep?: string | null;
  lat?: number | null;
  lng?: number | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  hours: string;
  access_mode: string;
  requires_registration: boolean;
  free_confirmation: string;
  tags: string[] | null;
  tips_for_woman: string | null;
  is_verified: boolean;
  is_active: boolean;
}

export interface SupabaseRpcServiceRow {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  description: string;
  is_national_online: boolean;
  state: string | null;
  city: string | null;
  neighborhood: string | null;
  address: string | null;
  cep?: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  hours: string;
  access_mode: string;
  free_confirmation: string;
  tags: string[] | null;
  tips_for_woman: string | null;
  distance_km?: number | null;
}

export interface SupabaseNgoRow {
  id: string;
  name: string;
  organization: string;
  area: string;
  area_label: string;
  coverage: string;
  state?: string | null;
  city?: string | null;
  summary: string;
  how_they_help: string[] | null;
  access_channel: string;
  website_url: string;
  privacy_note?: string | null;
  related_categories: string[] | null;
  featured: boolean;
  is_verified: boolean;
  is_active: boolean;
}

const VALID_CATEGORIES = new Set<ServiceCategory>([
  'juridico',
  'psicologico',
  'saude',
  'cursos',
  'emergencia',
  'social',
]);

const VALID_ACCESS_MODES = new Set<ServiceItem['accessMode']>([
  'Livre Demanda (Porta Aberta)',
  'Agendamento Prévio',
  'Online Imediato',
  'Plantão 24h',
]);

const PAID_OR_COMMERCIAL_SERVICE_RE =
  /\b(mensalidade|plano de sa[uú]de|conv[eê]nio|particular|privad[oa]|unimed|hapvida|amil|bradesco sa[uú]de|sulam[eé]rica|taxa de ades[aã]o|consulta paga)\b/i;

function mapAccessMode(raw?: string | null): ServiceItem['accessMode'] {
  if (raw && VALID_ACCESS_MODES.has(raw as ServiceItem['accessMode'])) {
    return raw as ServiceItem['accessMode'];
  }
  const norm = (raw || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  if (norm.includes('24h') || norm.includes('plantao')) return 'Plantão 24h';
  if (norm.includes('online')) return 'Online Imediato';
  if (norm.includes('agendamento')) return 'Agendamento Prévio';
  return 'Livre Demanda (Porta Aberta)';
}

const VALID_NGO_AREAS = new Set<Exclude<NgoHelpArea, 'todas'>>([
  'psicologico_juridico',
  'acolhimento_protecao',
  'saude_parto',
  'cursos_renda',
]);

function sanitizeExternalUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim();
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  return undefined;
}

function formatNullableCep(rawCep?: string | null): string | undefined {
  if (!rawCep) return undefined;
  const digits = rawCep.replace(/\D/g, '');
  if (digits.length === 8) return formatCep(digits);
  return rawCep.trim() || undefined;
}

function isFreeNonCommercialService(item: Pick<ServiceItem, 'name' | 'subcategory' | 'description' | 'freeConfirmation'>): boolean {
  const text = `${item.name} ${item.subcategory} ${item.description} ${item.freeConfirmation}`;
  return !PAID_OR_COMMERCIAL_SERVICE_RE.test(text);
}

export function isPublicServiceRowActive(row: Partial<SupabaseServiceRow>): row is SupabaseServiceRow {
  return (
    typeof row.id === 'string' &&
    row.id.length > 0 &&
    typeof row.name === 'string' &&
    row.name.length > 0 &&
    row.is_active !== false &&
    row.is_verified !== false &&
    row.requires_registration === false &&
    !PAID_OR_COMMERCIAL_SERVICE_RE.test(`${row.name} ${row.description || ''} ${row.free_confirmation || ''}`)
  );
}

export function mapRowToServiceItem(row: SupabaseServiceRow): ServiceItem {
  const category: ServiceCategory = VALID_CATEGORIES.has(row.category as ServiceCategory)
    ? (row.category as ServiceCategory)
    : 'social';

  const accessMode = mapAccessMode(row.access_mode);

  return {
    id: row.id,
    name: row.name,
    category,
    subcategory: row.subcategory || 'Serviço Gratuito',
    description: row.description || '',
    isNationalOnline: Boolean(row.is_national_online),
    state: row.state ? row.state.trim().toUpperCase() : undefined,
    city: row.city ? row.city.trim() : undefined,
    neighborhood: row.neighborhood ?? undefined,
    address: row.address ?? undefined,
    cep: formatNullableCep(row.cep),
    lat: typeof row.lat === 'number' && Number.isFinite(row.lat) ? row.lat : undefined,
    lng: typeof row.lng === 'number' && Number.isFinite(row.lng) ? row.lng : undefined,
    phone: row.phone ?? undefined,
    whatsapp: row.whatsapp ?? undefined,
    website: sanitizeExternalUrl(row.website),
    hours: row.hours || 'Consultar atendimento',
    accessMode,
    requiresRegistration: false,
    freeConfirmation: row.free_confirmation || 'Atendimento 100% gratuito.',
    tags: Array.isArray(row.tags) ? row.tags : [],
    tipsForVictim: row.tips_for_woman ?? undefined,
  };
}

export function mapRpcRowToServiceItem(row: SupabaseRpcServiceRow): ServiceItem {
  const category: ServiceCategory = VALID_CATEGORIES.has(row.category as ServiceCategory)
    ? (row.category as ServiceCategory)
    : 'social';

  const accessMode = mapAccessMode(row.access_mode);

  return {
    id: row.id,
    name: row.name,
    category,
    subcategory: row.subcategory || 'Serviço Gratuito',
    description: row.description || '',
    isNationalOnline: Boolean(row.is_national_online),
    state: row.state ? row.state.trim().toUpperCase() : undefined,
    city: row.city ? row.city.trim() : undefined,
    neighborhood: row.neighborhood ?? undefined,
    address: row.address ?? undefined,
    cep: formatNullableCep(row.cep),
    phone: row.phone ?? undefined,
    whatsapp: row.whatsapp ?? undefined,
    website: sanitizeExternalUrl(row.website),
    hours: row.hours || 'Consultar atendimento',
    accessMode,
    requiresRegistration: false,
    freeConfirmation: row.free_confirmation || 'Atendimento 100% gratuito.',
    tags: Array.isArray(row.tags) ? row.tags : [],
    tipsForVictim: row.tips_for_woman ?? undefined,
    distanceKmHint:
      typeof row.distance_km === 'number' && Number.isFinite(row.distance_km)
        ? row.distance_km
        : undefined,
  };
}

export function isPublicNgoRowActive(row: Partial<SupabaseNgoRow>): row is SupabaseNgoRow {
  return (
    typeof row.id === 'string' &&
    row.id.length > 0 &&
    typeof row.name === 'string' &&
    row.name.length > 0 &&
    row.is_active !== false &&
    row.is_verified !== false &&
    !PAID_OR_COMMERCIAL_SERVICE_RE.test(`${row.name} ${row.summary || ''} ${row.access_channel || ''}`)
  );
}

export function mapRowToNgoItem(row: SupabaseNgoRow): NgoItem {
  const area: Exclude<NgoHelpArea, 'todas'> = VALID_NGO_AREAS.has(
    row.area as Exclude<NgoHelpArea, 'todas'>
  )
    ? (row.area as Exclude<NgoHelpArea, 'todas'>)
    : 'acolhimento_protecao';

  const validRelated = (Array.isArray(row.related_categories) ? row.related_categories : []).filter(
    (cat): cat is NgoItem['relatedCategories'][number] =>
      cat === 'juridico' ||
      cat === 'psicologico' ||
      cat === 'saude' ||
      cat === 'cursos' ||
      cat === 'emergencia'
  );

  return {
    id: row.id,
    name: row.name,
    organization: row.organization || row.name,
    featured: Boolean(row.featured),
    area,
    areaLabel: row.area_label || 'Apoio Gratuito',
    coverage: row.coverage || 'Brasil',
    state: row.state ? row.state.trim().toUpperCase() : undefined,
    city: row.city ? row.city.trim() : undefined,
    accessChannel: row.access_channel || 'Atendimento online',
    summary: row.summary || '',
    howTheyHelp: Array.isArray(row.how_they_help) ? row.how_they_help : [],
    websiteUrl: sanitizeExternalUrl(row.website_url) || '#',
    privacyNote: row.privacy_note?.trim() || 'Atendimento gratuito sem exposição pública de dados.',
    relatedCategories: validRelated,
  };
}

export function normalizeNgoNameKey(name: string): string {
  return (name || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\b(de|da|do|das|dos|e|para|em|no|na|nos|nas)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function extractNgoDomainKey(url: string | undefined | null): string {
  const raw = (url || '').trim();
  if (!raw || raw === '#') return '';
  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const hostname = new URL(withProto).hostname.toLowerCase().replace(/^www\./, '');
    return hostname.includes('.') ? hostname : '';
  } catch {
    const stripped = raw
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .split(/[/?#:]/)[0]
      .trim();
    return stripped.includes('.') ? stripped : '';
  }
}

export function areNgosDuplicates(
  a: Pick<NgoItem, 'id' | 'name' | 'websiteUrl' | 'state' | 'city'>,
  b: Pick<NgoItem, 'id' | 'name' | 'websiteUrl' | 'state' | 'city'>
): boolean {
  if (a.id && b.id && a.id === b.id) return true;

  const nameA = normalizeNgoNameKey(a.name);
  const nameB = normalizeNgoNameKey(b.name);
  if (nameA && nameB && nameA === nameB) return true;

  const domainA = extractNgoDomainKey(a.websiteUrl);
  const domainB = extractNgoDomainKey(b.websiteUrl);
  if (domainA && domainB && domainA === domainB) {
    const stateA = (a.state || '').trim().toUpperCase();
    const stateB = (b.state || '').trim().toUpperCase();
    if (!stateA || !stateB) return true;

    if (stateA === stateB) {
      const cityA = normalizeNgoNameKey(a.city || '');
      const cityB = normalizeNgoNameKey(b.city || '');
      if (!cityA || !cityB || cityA === cityB) return true;
    }
  }

  return false;
}

export interface LocationCatalogQueryOptions {
  categoryKey?: ServiceCategory | null;
  maxKm?: number;
  client?: SupabaseClient | null;
}

export interface LocationCatalogQueryResult {
  services: ServiceItem[];
  ngos: NgoItem[];
  usedRpc: boolean;
  stateCode: string;
  cityNormalized: string;
}

/**
 * Queries Supabase using canonical normalized location data produced by ViaCEP / BrasilAPI:
 * 1. Primary: `public.search_verified_services` Star Schema RPC (`dim_regions` + Haversine <= 30 km).
 * 2. Co-query / fallback: verified `services` & `ngos` tables filtered by normalized UF + ASCII city key.
 * Strictly enforces verified, active, registration-free, 100% free public/NGO records.
 */
export async function querySupabaseCatalogByLocation(
  location: CepInfo,
  options: LocationCatalogQueryOptions = {}
): Promise<LocationCatalogQueryResult> {
  const stateCode = (location.stateNormalized || location.uf || '').trim().toUpperCase().slice(0, 2);
  const cityNormalized = location.cityNormalized || normalizeAsciiKey(location.localidade || '');
  const maxKm = options.maxKm ?? MAX_PROXIMITY_KM;
  const activeClient = options.client !== undefined ? options.client : supabase;

  if (!activeClient || !VALID_BRASIL_UFS.has(stateCode)) {
    return {
      services: [],
      ngos: [],
      usedRpc: false,
      stateCode,
      cityNormalized,
    };
  }

  const pLat = typeof location.lat === 'number' && Number.isFinite(location.lat) ? location.lat : null;
  const pLng = typeof location.lng === 'number' && Number.isFinite(location.lng) ? location.lng : null;
  const pCategory =
    options.categoryKey && options.categoryKey !== 'todos' ? options.categoryKey : null;

  const [rpcRes, tableRes, ngosRes] = await Promise.all([
    activeClient.rpc('search_verified_services', {
      p_category_key: pCategory,
      p_state: stateCode,
      p_lat: pLat,
      p_lng: pLng,
      p_max_km: maxKm,
    }),
    activeClient
      .from('services')
      .select(
        'id, name, category, subcategory, description, is_national_online, state, city, neighborhood, address, cep, lat, lng, phone, whatsapp, website, hours, access_mode, requires_registration, free_confirmation, tags, tips_for_woman, is_verified, is_active'
      )
      .eq('is_active', true)
      .eq('is_verified', true)
      .eq('requires_registration', false)
      .or(`is_national_online.eq.true,state.eq.${stateCode}`),
    activeClient
      .from('ngos')
      .select(
        'id, name, organization, area, area_label, coverage, state, city, summary, how_they_help, access_channel, website_url, privacy_note, related_categories, featured, is_verified, is_active'
      )
      .eq('is_active', true)
      .eq('is_verified', true)
      .or(`state.is.null,state.eq.${stateCode}`),
  ]);

  const tableServicesById = new Map<string, ServiceItem>();
  if (!tableRes.error && Array.isArray(tableRes.data)) {
    for (const row of tableRes.data as SupabaseServiceRow[]) {
      if (!isPublicServiceRowActive(row)) continue;
      const mapped = mapRowToServiceItem(row);
      if (!isFreeNonCommercialService(mapped)) continue;
      tableServicesById.set(mapped.id, mapped);
    }
  }

  const mergedServicesById = new Map<string, ServiceItem>();
  let usedRpc = false;

  if (!rpcRes.error && Array.isArray(rpcRes.data)) {
    usedRpc = true;
    for (const rpcRow of rpcRes.data as SupabaseRpcServiceRow[]) {
      if (!rpcRow?.id || !rpcRow?.name) continue;
      const mappedRpc = mapRpcRowToServiceItem(rpcRow);
      if (!isFreeNonCommercialService(mappedRpc)) continue;

      const hydratedTable = tableServicesById.get(mappedRpc.id);
      mergedServicesById.set(mappedRpc.id, {
        ...mappedRpc,
        lat: hydratedTable?.lat ?? mappedRpc.lat,
        lng: hydratedTable?.lng ?? mappedRpc.lng,
      });
    }
  }

  // Fallback / enrichment from direct table query filtered strictly by normalized city / radius / statewide remote
  for (const tableItem of tableServicesById.values()) {
    if (mergedServicesById.has(tableItem.id)) continue;

    if (tableItem.isNationalOnline) {
      mergedServicesById.set(tableItem.id, tableItem);
      continue;
    }

    const isStatewideRemote =
      typeof tableItem.lat !== 'number' &&
      typeof tableItem.lng !== 'number' &&
      !tableItem.address &&
      (tableItem.accessMode === 'Online Imediato' || Boolean(tableItem.whatsapp) || Boolean(tableItem.phone));

    if (isStatewideRemote) {
      mergedServicesById.set(tableItem.id, tableItem);
      continue;
    }

    const itemCityNorm = normalizeAsciiKey(tableItem.city || '');
    const sameCity = Boolean(cityNormalized && itemCityNorm && itemCityNorm === cityNormalized);

    if (
      pLat !== null &&
      pLng !== null &&
      typeof tableItem.lat === 'number' &&
      typeof tableItem.lng === 'number'
    ) {
      const dist = haversineDistanceKm(pLat, pLng, tableItem.lat, tableItem.lng);
      if (dist <= maxKm || sameCity) {
        mergedServicesById.set(tableItem.id, {
          ...tableItem,
          distanceKmHint: Math.round(dist * 10) / 10,
        });
      }
      continue;
    }

    if (sameCity || !itemCityNorm) {
      mergedServicesById.set(tableItem.id, tableItem);
    }
  }

  const matchedNgos: NgoItem[] = [];
  if (!ngosRes.error && Array.isArray(ngosRes.data)) {
    for (const row of ngosRes.data as SupabaseNgoRow[]) {
      if (!isPublicNgoRowActive(row)) continue;
      matchedNgos.push(mapRowToNgoItem(row));
    }

    matchedNgos.sort((a, b) => {
      const aCity = normalizeAsciiKey(a.city || '');
      const bCity = normalizeAsciiKey(b.city || '');
      const aRank =
        a.state === stateCode && cityNormalized && aCity === cityNormalized
          ? 0
          : a.state === stateCode
          ? 1
          : 2;
      const bRank =
        b.state === stateCode && cityNormalized && bCity === cityNormalized
          ? 0
          : b.state === stateCode
          ? 1
          : 2;
      if (aRank !== bRank) return aRank - bRank;
      return Number(b.featured) - Number(a.featured);
    });
  }

  return {
    services: Array.from(mergedServicesById.values()),
    ngos: matchedNgos,
    usedRpc,
    stateCode,
    cityNormalized,
  };
}


