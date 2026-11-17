import { CepInfo } from '../types';
import { estimateCoordinatesForCepAndCity } from './cepProximity';

export const VALID_BRASIL_UFS = new Set<string>([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]);

export const UF_TO_MACRO_REGION: Record<string, string> = {
  AC: 'Norte',
  AL: 'Nordeste',
  AP: 'Norte',
  AM: 'Norte',
  BA: 'Nordeste',
  CE: 'Nordeste',
  DF: 'Centro-Oeste',
  ES: 'Sudeste',
  GO: 'Centro-Oeste',
  MA: 'Nordeste',
  MT: 'Centro-Oeste',
  MS: 'Centro-Oeste',
  MG: 'Sudeste',
  PA: 'Norte',
  PB: 'Nordeste',
  PR: 'Sul',
  PE: 'Nordeste',
  PI: 'Nordeste',
  RJ: 'Sudeste',
  RN: 'Nordeste',
  RS: 'Sul',
  RO: 'Norte',
  RR: 'Norte',
  SC: 'Sul',
  SP: 'Sudeste',
  SE: 'Nordeste',
  TO: 'Norte',
};

const UF_TO_STATE_NAME_ASCII: Record<string, string> = {
  AC: 'acre',
  AL: 'alagoas',
  AP: 'amapa',
  AM: 'amazonas',
  BA: 'bahia',
  CE: 'ceara',
  DF: 'distrito federal',
  ES: 'espirito santo',
  GO: 'goias',
  MA: 'maranhao',
  MT: 'mato grosso',
  MS: 'mato grosso do sul',
  MG: 'minas gerais',
  PA: 'para',
  PB: 'paraiba',
  PR: 'parana',
  PE: 'pernambuco',
  PI: 'piaui',
  RJ: 'rio de janeiro',
  RN: 'rio grande do norte',
  RS: 'rio grande do sul',
  RO: 'rondonia',
  RR: 'roraima',
  SC: 'santa catarina',
  SP: 'sao paulo',
  SE: 'sergipe',
  TO: 'tocantins',
};

export interface CepValidationResult {
  isValid: boolean;
  digits: string;
  formatted: string;
  error?: string;
}

export interface NormalizedCepFetchResult {
  cepInfo?: CepInfo;
  formattedInput: string;
  error?: string;
}

// Ephemeral in-memory session cache only (Zero-PII: never written to localStorage/cookies)
const MAX_EPHEMERAL_CACHE = 120;
const cepSessionCache = new Map<string, CepInfo>();

export function clearEphemeralCepCache(): void {
  cepSessionCache.clear();
}

export function normalizeAsciiKey(text: string): string {
  return (text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function formatCep(digits: string): string {
  const clean = (digits || '').replace(/\D/g, '').slice(0, 8);
  if (clean.length > 5) {
    return `${clean.slice(0, 5)}-${clean.slice(5)}`;
  }
  return clean;
}

/**
 * Checks whether an input looks like a numeric CEP attempt (e.g. "00000-000", "1234567", "39990000")
 * rather than a city name or voice phrase.
 */
export function isLikelyNumericCepInput(rawInput: string): boolean {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) return false;
  if (/^\d{5}-?\d{0,3}$/.test(trimmed)) return true;
  if (/^[\d.\-\s]+$/.test(trimmed)) return true;
  return false;
}

/**
 * Strict Brazilian CEP validator:
 * - Strips non-digits and enforces exact 8 digits
 * - Rejects repeated digits (00000-000, 11111-111, ..., 99999-999)
 * - Rejects unassigned Correios prefix 00000-000..00999-999 (< 01000-000)
 */
export function validateBrazilianCep(rawInput: string): CepValidationResult {
  const digits = (rawInput || '').replace(/\D/g, '');
  const formatted = formatCep(digits);

  if (digits.length === 0) {
    return {
      isValid: false,
      digits,
      formatted,
      error: 'Digite os 8 números do seu CEP (ex: 01001-000).',
    };
  }

  if (digits.length < 8) {
    return {
      isValid: false,
      digits,
      formatted,
      error: `CEP incompleto (${digits.length}/8 dígitos). Informe todos os 8 números (ex: 01001-000).`,
    };
  }

  if (digits.length > 8) {
    return {
      isValid: false,
      digits,
      formatted,
      error: 'CEP inválido: informe exatamente 8 números no formato 00000-000.',
    };
  }

  if (/^(\d)\1{7}$/.test(digits)) {
    return {
      isValid: false,
      digits,
      formatted,
      error: `O CEP ${formatted} não é válido. Verifique os números e tente novamente.`,
    };
  }

  const numericValue = Number(digits);
  if (!Number.isFinite(numericValue) || numericValue < 1000000) {
    return {
      isValid: false,
      digits,
      formatted,
      error: `A faixa de CEP ${formatted} não existe nos Correios. Verifique os números informados.`,
    };
  }

  return {
    isValid: true,
    digits,
    formatted,
  };
}

export function parseValidCoord(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === '') return undefined;
  const num = Number(raw);
  if (!Number.isFinite(num) || Math.abs(num) === 0) return undefined;
  return num;
}

function isValidBrazilLatLngPair(lat?: number, lng?: number): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) return false;
  return lat <= 6 && lat >= -34.5 && lng <= -34 && lng >= -74.5;
}

export async function geocodeBrazilPlace(
  query: string,
  expectedCity?: string,
  expectedUf?: string
): Promise<{ lat: number; lng: number } | null> {
  // 1. Nominatim (OpenStreetMap)
  {
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), 2400);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&limit=1&q=${encodeURIComponent(
          query
        )}`,
        {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        }
      );
      if (res.ok) {
        const arr = (await res.json()) as Array<{ lat?: string; lon?: string }>;
        const lat = Number(arr[0]?.lat);
        const lng = Number(arr[0]?.lon);
        if (isValidBrazilLatLngPair(lat, lng)) {
          return { lat, lng };
        }
      }
    } catch {
      // fall through to Photon
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
  }

  // 2. Photon (Komoot / OSM)
  {
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), 2400);
    try {
      const res = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=3`,
        { signal: controller.signal }
      );
      if (res.ok) {
        const json = (await res.json()) as {
          features?: Array<{
            geometry?: { coordinates?: [number, number] };
            properties?: { countrycode?: string };
          }>;
        };
        const features = Array.isArray(json.features) ? json.features : [];
        const brFeature =
          features.find((f) => f.properties?.countrycode?.toUpperCase() === 'BR') ||
          features.find((f) => {
            const coords = f.geometry?.coordinates;
            return coords ? isValidBrazilLatLngPair(coords[1], coords[0]) : false;
          });
        const coords = brFeature?.geometry?.coordinates;
        if (coords && isValidBrazilLatLngPair(coords[1], coords[0])) {
          return { lat: coords[1], lng: coords[0] };
        }
      }
    } catch {
      // fall through to Open-Meteo
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
  }

  // 3. Open-Meteo Geocoding API (reliable municipal centroids across Brazil)
  if (expectedCity) {
    const controller = new AbortController();
    const timeoutId = globalThis.setTimeout(() => controller.abort(), 2400);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          expectedCity
        )}&count=10&countryCode=BR&language=pt`,
        { signal: controller.signal }
      );
      if (res.ok) {
        const json = (await res.json()) as {
          results?: Array<{
            name?: string;
            admin1?: string;
            latitude?: number;
            longitude?: number;
          }>;
        };
        const list = Array.isArray(json.results) ? json.results : [];
        const normCity = normalizeAsciiKey(expectedCity);
        const targetState = expectedUf ? UF_TO_STATE_NAME_ASCII[expectedUf.toUpperCase()] : '';
        const match =
          list.find(
            (r) =>
              normalizeAsciiKey(r.name || '') === normCity &&
              (!targetState || normalizeAsciiKey(r.admin1 || '') === targetState)
          ) ||
          list.find((r) => !targetState || normalizeAsciiKey(r.admin1 || '') === targetState) ||
          list[0];
        if (match && isValidBrazilLatLngPair(match.latitude, match.longitude)) {
          return { lat: match.latitude!, lng: match.longitude! };
        }
      }
    } catch {
      return null;
    } finally {
      globalThis.clearTimeout(timeoutId);
    }
  }

  return null;
}

export async function geocodeCepAddress(
  street: string,
  neighborhood: string,
  city: string,
  uf: string
): Promise<{ lat: number; lng: number } | null> {
  if (!city || !uf) return null;

  if (street) {
    const byStreet = await geocodeBrazilPlace(`${street}, ${city}, ${uf}, Brasil`);
    if (byStreet) return byStreet;
  }

  if (neighborhood) {
    const byBairro = await geocodeBrazilPlace(`${neighborhood}, ${city}, ${uf}, Brasil`);
    if (byBairro) return byBairro;
  }

  return null;
}

/**
 * Normalizes raw location fields into canonical CepInfo compatible with Supabase ASCII dimensions.
 */
export function normalizeBrazilianLocation(raw: {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade: string;
  uf: string;
  ddd?: string;
  ibge?: string;
  lat?: number;
  lng?: number;
  locationSource?: CepInfo['locationSource'];
}): CepInfo | null {
  const uf = (raw.uf || '').trim().toUpperCase();
  const cityDisplay = (raw.localidade || '').replace(/\s+/g, ' ').trim();
  if (!VALID_BRASIL_UFS.has(uf) || !cityDisplay) {
    return null;
  }

  const cepDigits = (raw.cep || '').replace(/\D/g, '');
  const formattedCep = cepDigits.length === 8 ? formatCep(cepDigits) : raw.cep?.trim() || '00000-000';
  const cleanIbge = (raw.ibge || '').replace(/\D/g, '');
  const cityNormalized = normalizeAsciiKey(cityDisplay);

  return {
    cep: formattedCep,
    logradouro: (raw.logradouro || '').replace(/\s+/g, ' ').trim(),
    bairro: (raw.bairro || '').replace(/\s+/g, ' ').trim(),
    localidade: cityDisplay,
    uf,
    ddd: raw.ddd ? raw.ddd.replace(/\D/g, '').slice(0, 2) || undefined : undefined,
    ibge: cleanIbge.length >= 6 ? cleanIbge : undefined,
    lat: typeof raw.lat === 'number' && Number.isFinite(raw.lat) ? raw.lat : undefined,
    lng: typeof raw.lng === 'number' && Number.isFinite(raw.lng) ? raw.lng : undefined,
    cityNormalized,
    stateNormalized: uf,
    macroRegion: UF_TO_MACRO_REGION[uf],
    locationSource: raw.locationSource,
  };
}

interface RawViaCepResponse {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  ibge?: string;
  ddd?: string;
  erro?: boolean | string;
}

interface RawBrasilApiResponse {
  cep?: string;
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  ibge?: string;
  location?: {
    coordinates?: {
      latitude?: string | number;
      longitude?: string | number;
    };
  };
}

interface RawOpenCepResponse {
  cep?: string;
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  ibge?: string;
}

async function fetchJsonWithTimeout<T>(url: string, timeoutMs = 3500): Promise<{ ok: boolean; status: number; data?: T }> {
  const controller = new AbortController();
  const timer = globalThis.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) {
      return { ok: false, status: res.status };
    }
    const data = (await res.json()) as T;
    return { ok: true, status: res.status, data };
  } catch {
    return { ok: false, status: 0 };
  } finally {
    globalThis.clearTimeout(timer);
  }
}

/**
 * Validates and normalizes any Brazilian CEP via ViaCEP (primary) + BrasilAPI CEP v2 (coordinates & resilience)
 * + OpenCEP (secondary fallback), hydrating municipal/street coordinates before querying Supabase.
 */
export async function fetchNormalizedCepLocation(rawCep: string): Promise<NormalizedCepFetchResult> {
  const validation = validateBrazilianCep(rawCep);
  if (!validation.isValid) {
    return {
      formattedInput: validation.formatted,
      error: validation.error,
    };
  }

  const { digits, formatted } = validation;

  const cached = cepSessionCache.get(digits);
  if (cached) {
    return {
      cepInfo: cached,
      formattedInput: formatted,
    };
  }

  const [viaCepRes, brasilApiRes] = await Promise.all([
    fetchJsonWithTimeout<RawViaCepResponse>(`https://viacep.com.br/ws/${digits}/json/`, 3500),
    fetchJsonWithTimeout<RawBrasilApiResponse>(`https://brasilapi.com.br/api/cep/v2/${digits}`, 3500),
  ]);

  const viaCepData = viaCepRes.ok ? viaCepRes.data : undefined;
  const viaCepNotFound = Boolean(viaCepData?.erro === true || viaCepData?.erro === 'true');
  const viaCepValid = Boolean(viaCepData && !viaCepNotFound && viaCepData.localidade && viaCepData.uf);

  const brasilApiData = brasilApiRes.ok ? brasilApiRes.data : undefined;
  const brasilApiValid = Boolean(brasilApiData && brasilApiData.city && brasilApiData.state);

  let openCepData: RawOpenCepResponse | undefined;
  if (!viaCepValid && !brasilApiValid && !(viaCepNotFound && brasilApiRes.status === 404)) {
    const openCepRes = await fetchJsonWithTimeout<RawOpenCepResponse>(
      `https://opencep.com/v1/${digits}`,
      3000
    );
    if (openCepRes.ok && openCepRes.data?.localidade && openCepRes.data?.uf) {
      openCepData = openCepRes.data;
    }
  }

  const openCepValid = Boolean(openCepData?.localidade && openCepData?.uf);

  if (!viaCepValid && !brasilApiValid && !openCepValid) {
    const confirmedNotFound = viaCepNotFound || brasilApiRes.status === 404;
    return {
      formattedInput: formatted,
      error: confirmedNotFound
        ? `CEP ${formatted} não encontrado na base dos Correios. Verifique os números ou fale o nome da sua cidade.`
        : 'Não foi possível consultar o CEP agora (serviço indisponível). Tente novamente ou informe o nome da sua cidade.',
    };
  }

  const city = (viaCepData?.localidade || brasilApiData?.city || openCepData?.localidade || '').trim();
  const uf = (viaCepData?.uf || brasilApiData?.state || openCepData?.uf || '').trim().toUpperCase();
  const street = (viaCepData?.logradouro || brasilApiData?.street || openCepData?.logradouro || '').trim();
  const neighborhood = (
    viaCepData?.bairro ||
    brasilApiData?.neighborhood ||
    openCepData?.bairro ||
    ''
  ).trim();
  const ibge = (viaCepData?.ibge || brasilApiData?.ibge || openCepData?.ibge || '').replace(/\D/g, '');
  const ddd = viaCepData?.ddd;
  const locationSource: CepInfo['locationSource'] = viaCepValid
    ? 'viacep'
    : brasilApiValid
    ? 'brasilapi'
    : 'opencep';

  const rawBrLat = parseValidCoord(brasilApiData?.location?.coordinates?.latitude);
  const rawBrLng = parseValidCoord(brasilApiData?.location?.coordinates?.longitude);

  // Ignore BrasilAPI's bogus Praça da Sé coordinate returned for unrelated São Paulo CEPs
  const isBogusPracaDaSeCoord =
    typeof rawBrLat === 'number' &&
    typeof rawBrLng === 'number' &&
    !digits.startsWith('010') &&
    Math.abs(rawBrLat - -23.5475) < 0.005 &&
    Math.abs(rawBrLng - -46.63611) < 0.005;

  const validBrasilApiCoords =
    typeof rawBrLat === 'number' &&
    typeof rawBrLng === 'number' &&
    !isBogusPracaDaSeCoord &&
    isValidBrazilLatLngPair(rawBrLat, rawBrLng)
      ? { lat: rawBrLat, lng: rawBrLng }
      : null;

  const estimated = estimateCoordinatesForCepAndCity(formatted, city, uf);

  const geocodedStreetOrBairro = await geocodeCepAddress(street, neighborhood, city, uf);
  const geocodedCity =
    !geocodedStreetOrBairro && !validBrasilApiCoords && city && uf
      ? await geocodeBrazilPlace(`${city}, ${uf}, Brasil`, city, uf)
      : null;

  const resolvedLat =
    geocodedStreetOrBairro?.lat ??
    (digits.startsWith('0') ? estimated?.lat : undefined) ??
    validBrasilApiCoords?.lat ??
    geocodedCity?.lat ??
    estimated?.lat;

  const resolvedLng =
    geocodedStreetOrBairro?.lng ??
    (digits.startsWith('0') ? estimated?.lng : undefined) ??
    validBrasilApiCoords?.lng ??
    geocodedCity?.lng ??
    estimated?.lng;

  const normalized = normalizeBrazilianLocation({
    cep: viaCepData?.cep || formatted,
    logradouro: street,
    bairro: neighborhood,
    localidade: city,
    uf,
    ddd,
    ibge,
    lat: resolvedLat,
    lng: resolvedLng,
    locationSource,
  });

  if (!normalized) {
    return {
      formattedInput: formatted,
      error: `Não foi possível normalizar a localização do CEP ${formatted}. Tente informar o nome da sua cidade.`,
    };
  }

  if (cepSessionCache.size >= MAX_EPHEMERAL_CACHE) {
    const oldestKey = cepSessionCache.keys().next().value;
    if (oldestKey) cepSessionCache.delete(oldestKey);
  }
  cepSessionCache.set(digits, normalized);

  return {
    cepInfo: normalized,
    formattedInput: formatted,
  };
}
