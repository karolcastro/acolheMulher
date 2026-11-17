import { CepInfo, ServiceItem } from '../types';
import {
  estimateCoordinatesForCepAndCity,
  haversineDistanceKm,
  MAX_PROXIMITY_KM,
} from './cepProximity';

interface OverpassElement {
  id: number;
  type: 'node' | 'way' | 'relation';
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const nearbyHealthCache = new Map<string, ServiceItem[]>();

function isLikelyPublicHealthUnit(tags: Record<string, string>): {
  matched: boolean;
  kind: 'ubs' | 'hospital' | 'upa';
} {
  const name = (tags.name || '').toLowerCase();
  const amenity = (tags.amenity || '').toLowerCase();
  const healthcare = (tags.healthcare || '').toLowerCase();
  const operatorType = (tags['operator:type'] || tags.operator || '').toLowerCase();

  const isUbsName =
    /\b(ubs|unidade basica|unidade básica|posto de saude|posto de saúde|centro de saude|centro de saúde|psf|esf|ama|clinica da familia|clínica da família|saude da familia|saúde da família|policlinica|policlínica|caps)\b/i.test(
      name
    );
  const isUpaName = /\b(upa|pronto atendimento|pronto socorro|pronto-socorro)\b/i.test(name);
  const isHospitalName = /\b(hospital|maternidade|santa casa|pronto-socorro)\b/i.test(name);

  if (isUbsName) {
    return { matched: true, kind: 'ubs' };
  }
  if (isUpaName) {
    return { matched: true, kind: 'upa' };
  }
  if (amenity === 'hospital' || healthcare === 'hospital' || isHospitalName) {
    return { matched: true, kind: 'hospital' };
  }

  if (
    (amenity === 'clinic' || healthcare === 'centre' || healthcare === 'clinic') &&
    (operatorType.includes('public') ||
      operatorType.includes('municip') ||
      operatorType.includes('estado') ||
      operatorType.includes('sus') ||
      operatorType.includes('prefeitura'))
  ) {
    return { matched: true, kind: 'ubs' };
  }

  return { matched: false, kind: 'ubs' };
}

function buildAddressFromTags(
  tags: Record<string, string>,
  fallbackCity: string,
  fallbackUf: string
): string {
  const street = tags['addr:street'];
  const houseNumber = tags['addr:housenumber'];
  const suburb = tags['addr:suburb'] || tags['addr:neighbourhood'];
  const city = tags['addr:city'] || fallbackCity;

  const streetPart = street
    ? houseNumber
      ? `${street}, ${houseNumber}`
      : street
    : '';

  const parts = [streetPart, suburb, city ? `${city} - ${fallbackUf}` : fallbackUf].filter(Boolean);
  return parts.join(' · ') || `${fallbackCity} - ${fallbackUf}`;
}

function mapOverpassElementToService(
  el: OverpassElement,
  userLat: number,
  userLng: number,
  location: CepInfo
): { item: ServiceItem; distanceKm: number } | null {
  const tags = el.tags || {};
  const rawName = (tags.name || '').trim();
  if (!rawName) return null;

  const lat = el.lat ?? el.center?.lat;
  const lng = el.lon ?? el.center?.lon;
  if (typeof lat !== 'number' || typeof lng !== 'number') return null;

  const distanceKm = haversineDistanceKm(userLat, userLng, lat, lng);
  if (distanceKm > MAX_PROXIMITY_KM) return null;

  const { matched, kind } = isLikelyPublicHealthUnit(tags);
  if (!matched) return null;

  const phone = (tags.phone || tags['contact:phone'] || '').trim() || undefined;
  const website = (tags.website || tags['contact:website'] || '').trim() || undefined;
  const neighborhood = (tags['addr:suburb'] || tags['addr:neighbourhood'] || '').trim() || undefined;
  const city = (tags['addr:city'] || location.localidade || '').trim();
  const address = buildAddressFromTags(tags, location.localidade, location.uf);
  const cep = (tags['addr:postcode'] || '').trim() || undefined;

  const subcategory =
    kind === 'ubs'
      ? 'UBS / Posto de Saúde Próximo (SUS)'
      : kind === 'upa'
      ? 'UPA / Pronto Atendimento 24h (SUS)'
      : 'Hospital / Maternidade Próxima';

  const hours =
    (tags.opening_hours || '').trim() ||
    (kind === 'ubs'
      ? 'Segunda a Sexta, das 07h às 17h (confirmar na unidade)'
      : 'Atendimento de urgência 24 horas');

  const item: ServiceItem = {
    id: `osm-${el.type}-${el.id}`,
    name: rawName,
    category: 'saude',
    subcategory,
    description:
      kind === 'ubs'
        ? 'Unidade Básica de Saúde próxima ao seu CEP. Oferece consultas médicas e ginecológicas, pré-natal, preventivo (Papanicolau), planejamento reprodutivo, testes rápidos, vacinas e acolhimento inicial em saúde mental pelo SUS.'
        : kind === 'upa'
        ? 'Pronto atendimento de urgência gratuito próximo ao seu CEP para acolhimento imediato e encaminhamento na rede pública.'
        : 'Hospital / unidade de saúde próxima ao seu CEP para atendimento médico, urgências, ginecologia e acolhimento feminino.',
    state: location.uf,
    city,
    neighborhood,
    address,
    cep,
    lat,
    lng,
    phone: phone || '136',
    website: website && (website.startsWith('http://') || website.startsWith('https://')) ? website : undefined,
    hours,
    accessMode: kind === 'ubs' ? 'Livre Demanda (Porta Aberta)' : 'Plantão 24h',
    requiresRegistration: false,
    freeConfirmation: 'Atendimento público e gratuito pelo SUS (leve cartão SUS ou CPF se tiver, mas urgências atendem mesmo sem documentos).',
    tags:
      kind === 'ubs'
        ? ['UBS', 'Posto de Saúde', 'SUS Grátis', 'Saúde da Mulher', 'Acolhimento']
        : ['Hospital', 'SUS Grátis', 'Urgência', 'Saúde da Mulher'],
    tipsForVictim:
      'Para emergências ou dúvidas sobre qual UBS atende seu endereço exato, ligue gratuitamente para o Disque Saúde 136.',
  };

  return { item, distanceKm };
}

async function queryOverpass(endpoint: string, query: string): Promise<OverpassElement[]> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 5500);
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
      body: `data=${encodeURIComponent(query)}`,
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { elements?: OverpassElement[] };
    return Array.isArray(data.elements) ? data.elements : [];
  } catch {
    return [];
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function queryNominatimFallback(
  location: CepInfo,
  userLat: number,
  userLng: number
): Promise<ServiceItem[]> {
  const queries = [
    `UBS ${location.localidade} ${location.uf} Brasil`,
    `Hospital ${location.localidade} ${location.uf} Brasil`,
  ];

  const found: { item: ServiceItem; distanceKm: number }[] = [];
  const seen = new Set<string>();

  for (const q of queries) {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 3500);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&countrycodes=br&limit=8&q=${encodeURIComponent(
        q
      )}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) continue;
      const results = (await res.json()) as Array<{
        place_id: number;
        display_name?: string;
        name?: string;
        lat: string;
        lon: string;
        address?: Record<string, string>;
      }>;

      for (const r of results) {
        const lat = Number(r.lat);
        const lng = Number(r.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        const distanceKm = haversineDistanceKm(userLat, userLng, lat, lng);
        if (distanceKm > MAX_PROXIMITY_KM) continue;

        const name = (r.name || r.display_name?.split(',')[0] || '').trim();
        if (!name || seen.has(name.toLowerCase())) continue;
        seen.add(name.toLowerCase());

        const isUbs = /ubs|unidade|posto|centro de saude|centro de saúde|esf|ama|caps/i.test(name);
        const addr = r.address || {};
        const road = addr.road || '';
        const suburb = addr.suburb || addr.neighbourhood || '';
        const city = addr.city || addr.town || addr.municipality || location.localidade;

        found.push({
          distanceKm,
          item: {
            id: `nom-${r.place_id}`,
            name,
            category: 'saude',
            subcategory: isUbs
              ? 'UBS / Posto de Saúde Próximo (SUS)'
              : 'Hospital / Unidade de Saúde Próxima',
            description: isUbs
              ? 'Unidade Básica de Saúde localizada próxima ao seu CEP para pré-natal, preventivo, consultas médicas e acolhimento pelo SUS.'
              : 'Hospital / unidade de saúde próxima ao seu CEP para atendimento médico, urgências e saúde da mulher.',
            state: location.uf,
            city,
            neighborhood: suburb || undefined,
            address: [road, suburb, `${city} - ${location.uf}`].filter(Boolean).join(' · '),
            lat,
            lng,
            phone: '136',
            hours: isUbs ? 'Segunda a Sexta (horário UBS)' : 'Atendimento 24 horas (confirmar urgência)',
            accessMode: isUbs ? 'Livre Demanda (Porta Aberta)' : 'Plantão 24h',
            requiresRegistration: false,
            freeConfirmation: 'Atendimento gratuito pelo SUS.',
            tags: isUbs ? ['UBS', 'Posto de Saúde', 'SUS'] : ['Hospital', 'SUS', 'Saúde'],
          },
        });
      }
    } catch {
      // ignore timeout/offline
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  found.sort((a, b) => a.distanceKm - b.distanceKm);
  return found.slice(0, 12).map((x) => x.item);
}

/**
 * Dynamically fetches real nearby UBS, Health Clinics (Postos de Saúde), UPAs and Hospitals
 * within <= 30 km of the user's CEP/city coordinates using OpenStreetMap public data.
 * Zero-PII: only queries public coordinates in memory, never persists user CEP or location.
 */
export async function fetchNearbySusUnits(location: CepInfo | null): Promise<ServiceItem[]> {
  if (!location || typeof window === 'undefined') return [];

  const coords =
    typeof location.lat === 'number' && typeof location.lng === 'number'
      ? { lat: location.lat, lng: location.lng }
      : estimateCoordinatesForCepAndCity(location.cep, location.localidade, location.uf);

  if (!coords) return [];

  const cacheKey = `${location.uf}|${coords.lat.toFixed(3)}|${coords.lng.toFixed(3)}`;
  const cached = nearbyHealthCache.get(cacheKey);
  if (cached) return cached;

  const radiusMeters = 18000; // 18 km core search around exact CEP (always <= 30 km)
  const overpassQuery = `
[out:json][timeout:6];
(
  node["amenity"~"hospital|clinic"](around:${radiusMeters},${coords.lat},${coords.lng});
  way["amenity"~"hospital|clinic"](around:${radiusMeters},${coords.lat},${coords.lng});
  node["healthcare"~"hospital|centre|clinic"](around:${radiusMeters},${coords.lat},${coords.lng});
  way["healthcare"~"hospital|centre|clinic"](around:${radiusMeters},${coords.lat},${coords.lng});
);
out center tags 40;
`;

  let elements = await queryOverpass('https://overpass-api.de/api/interpreter', overpassQuery);
  if (elements.length === 0) {
    elements = await queryOverpass('https://overpass.kumi.systems/api/interpreter', overpassQuery);
  }

  const mapped: { item: ServiceItem; distanceKm: number }[] = [];
  const seenNames = new Set<string>();

  for (const el of elements) {
    const res = mapOverpassElementToService(el, coords.lat, coords.lng, location);
    if (!res) continue;
    const normName = res.item.name.toLowerCase();
    if (seenNames.has(normName)) continue;
    seenNames.add(normName);
    mapped.push(res);
  }

  mapped.sort((a, b) => a.distanceKm - b.distanceKm);

  let finalItems = mapped.slice(0, 14).map((m) => m.item);

  if (finalItems.length === 0) {
    finalItems = await queryNominatimFallback(location, coords.lat, coords.lng);
  }

  nearbyHealthCache.set(cacheKey, finalItems);
  return finalItems;
}
