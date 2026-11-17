import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { ServiceCategory, ServiceItem } from '../types';
import type { NgoHelpArea, NgoItem } from '../data/ngosData';

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

export function isPublicServiceRowActive(row: Partial<SupabaseServiceRow>): row is SupabaseServiceRow {
  return (
    typeof row.id === 'string' &&
    row.id.length > 0 &&
    typeof row.name === 'string' &&
    row.name.length > 0 &&
    row.is_active !== false &&
    row.is_verified !== false &&
    row.requires_registration === false
  );
}

export function mapRowToServiceItem(row: SupabaseServiceRow): ServiceItem {
  const category: ServiceCategory = VALID_CATEGORIES.has(row.category as ServiceCategory)
    ? (row.category as ServiceCategory)
    : 'social';

  const accessMode: ServiceItem['accessMode'] = VALID_ACCESS_MODES.has(
    row.access_mode as ServiceItem['accessMode']
  )
    ? (row.access_mode as ServiceItem['accessMode'])
    : 'Livre Demanda (Porta Aberta)';

  return {
    id: row.id,
    name: row.name,
    category,
    subcategory: row.subcategory || 'Serviço Gratuito',
    description: row.description || '',
    isNationalOnline: Boolean(row.is_national_online),
    state: row.state ?? undefined,
    city: row.city ?? undefined,
    neighborhood: row.neighborhood ?? undefined,
    address: row.address ?? undefined,
    cep: row.cep ?? undefined,
    lat: typeof row.lat === 'number' ? row.lat : undefined,
    lng: typeof row.lng === 'number' ? row.lng : undefined,
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

export function isPublicNgoRowActive(row: Partial<SupabaseNgoRow>): row is SupabaseNgoRow {
  return (
    typeof row.id === 'string' &&
    row.id.length > 0 &&
    typeof row.name === 'string' &&
    row.name.length > 0 &&
    row.is_active !== false &&
    row.is_verified !== false
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

