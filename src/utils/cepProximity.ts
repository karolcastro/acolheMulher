import { CepInfo, ServiceItem } from '../types';

interface Coord {
  lat: number;
  lng: number;
}

// 3-digit Brazilian CEP prefix centers for intra-city & metro proximity (Works 100% offline)
const CEP_PREFIX3_COORDS: Record<string, Coord> = {
  // São Paulo Capital & Metro
  '010': { lat: -23.5475, lng: -46.6361 }, // Sé / Centro
  '011': { lat: -23.5295, lng: -46.6525 }, // Barra Funda / Bom Retiro
  '012': { lat: -23.5366, lng: -46.6531 }, // Higienópolis / Campos Elíseos
  '013': { lat: -23.5587, lng: -46.6527 }, // Bela Vista / Consolação
  '014': { lat: -23.5685, lng: -46.6685 }, // Jardins / Pinheiros
  '015': { lat: -23.5635, lng: -46.6251 }, // Liberdade / Cambuci
  '020': { lat: -23.5015, lng: -46.6248 }, // Santana / Zona Norte
  '021': { lat: -23.5112, lng: -46.5882 }, // Vila Maria
  '022': { lat: -23.4795, lng: -46.5974 }, // Tucuruvi
  '023': { lat: -23.4585, lng: -46.6205 }, // Tremembé / Horto Florestal
  '024': { lat: -23.4832, lng: -46.6382 }, // Mandaqui / Lauzane Paulista
  '025': { lat: -23.5055, lng: -46.6632 }, // Casa Verde
  '026': { lat: -23.4655, lng: -46.6520 }, // Jardim Peri / Cachoeirinha / Horto
  '027': { lat: -23.4956, lng: -46.6884 }, // Freguesia do Ó / Cachoeirinha
  '028': { lat: -23.4715, lng: -46.6935 }, // Brasilândia
  '029': { lat: -23.4778, lng: -46.7271 }, // Pirituba
  '030': { lat: -23.5385, lng: -46.5985 }, // Brás / Belém
  '031': { lat: -23.5612, lng: -46.5872 }, // Mooca
  '033': { lat: -23.5504, lng: -46.5615 }, // Tatuapé
  '034': { lat: -23.5592, lng: -46.5356 }, // Carrão
  '035': { lat: -23.5396, lng: -46.5061 }, // Vila Matilde / Penha
  '036': { lat: -23.5194, lng: -46.4945 }, // Penha / Cangaíba
  '039': { lat: -23.6033, lng: -46.5162 }, // Sapopemba
  '040': { lat: -23.5912, lng: -46.6395 }, // Vila Mariana
  '041': { lat: -23.6054, lng: -46.6185 }, // Saúde / Ipiranga
  '042': { lat: -23.5998, lng: -46.6001 }, // Ipiranga / Sacomã
  '043': { lat: -23.6425, lng: -46.6438 }, // Jabaquara
  '044': { lat: -23.6791, lng: -46.6782 }, // Cidade Ademar / Pedreira
  '045': { lat: -23.6025, lng: -46.6805 }, // Itaim / Moema / Brooklin
  '046': { lat: -23.6352, lng: -46.6761 }, // Campo Belo / Santo Amaro
  '047': { lat: -23.6582, lng: -46.7061 }, // Santo Amaro / Socorro
  '048': { lat: -23.7321, lng: -46.7012 }, // Grajaú / Capela do Socorro
  '049': { lat: -23.6815, lng: -46.7532 }, // Jardim Ângela / Guarapiranga
  '050': { lat: -23.5268, lng: -46.6902 }, // Perdizes / Lapa
  '051': { lat: -23.4955, lng: -46.7365 }, // Jaraguá / Pirituba
  '053': { lat: -23.5468, lng: -46.7445 }, // Jaguaré / Vila Leopoldina
  '054': { lat: -23.5621, lng: -46.6912 }, // Pinheiros
  '055': { lat: -23.5692, lng: -46.7295 }, // Butantã / USP
  '057': { lat: -23.6312, lng: -46.7425 }, // Campo Limpo / Morumbi
  '058': { lat: -23.6625, lng: -46.7565 }, // Capão Redondo / Jardim São Luiz
  '060': { lat: -23.5325, lng: -46.7917 }, // Osasco
  '064': { lat: -23.5108, lng: -46.8764 }, // Barueri
  '070': { lat: -23.4543, lng: -46.5333 }, // Guarulhos
  '080': { lat: -23.4981, lng: -46.4405 }, // São Miguel Paulista
  '082': { lat: -23.5419, lng: -46.4628 }, // Itaquera
  '084': { lat: -23.5535, lng: -46.4152 }, // Guaianases
  '090': { lat: -23.6639, lng: -46.5383 }, // Santo André
  '097': { lat: -23.6939, lng: -46.565 },  // São Bernardo do Campo
  // Interior / Litoral SP
  '110': { lat: -23.9608, lng: -46.3336 }, // Santos
  '122': { lat: -23.1791, lng: -45.8872 }, // São José dos Campos
  '130': { lat: -22.9056, lng: -47.0608 }, // Campinas
  '140': { lat: -21.1775, lng: -47.8103 }, // Ribeirão Preto
  '180': { lat: -23.5015, lng: -47.4526 }, // Sorocaba
  // Rio de Janeiro
  '200': { lat: -22.9068, lng: -43.1729 }, // Centro RJ
  '202': { lat: -22.9122, lng: -43.2259 }, // Maracanã / Tijuca
  '205': { lat: -22.9278, lng: -43.2371 }, // Tijuca / Vila Isabel
  '210': { lat: -22.8602, lng: -43.2712 }, // Bonsucesso / Zona Norte
  '217': { lat: -22.8781, lng: -43.4316 }, // Realengo / Sulacap
  '220': { lat: -22.9711, lng: -43.1822 }, // Copacabana
  '222': { lat: -22.9403, lng: -43.1731 }, // Flamengo / Botafogo
  '226': { lat: -23.0004, lng: -43.3659 }, // Barra da Tijuca
  '230': { lat: -22.9012, lng: -43.5594 }, // Campo Grande RJ
  '240': { lat: -22.8832, lng: -43.1034 }, // Niterói
  '244': { lat: -22.8268, lng: -43.0539 }, // São Gonçalo
  '250': { lat: -22.7858, lng: -43.3117 }, // Duque de Caxias
  '262': { lat: -22.7556, lng: -43.4603 }, // Nova Iguaçu
  // Minas Gerais
  '301': { lat: -19.9227, lng: -43.9378 }, // BH Centro
  '310': { lat: -19.9154, lng: -43.9203 }, // BH Leste / Santa Tereza
  '311': { lat: -19.9032, lng: -43.9498 }, // BH São Cristóvão
  '318': { lat: -19.8328, lng: -43.9163 }, // BH Norte / Tupi
  '320': { lat: -19.9321, lng: -44.0539 }, // Contagem
  '360': { lat: -21.7642, lng: -43.3503 }, // Juiz de Fora
  '384': { lat: -18.9186, lng: -48.2772 }, // Uberlândia
  // Bahia
  '400': { lat: -12.9777, lng: -38.5016 }, // Salvador Centro
  '402': { lat: -12.9901, lng: -38.5035 }, // Brotas / Barra
  '412': { lat: -12.9197, lng: -38.4384 }, // Pau da Lima
  '440': { lat: -12.2669, lng: -38.9669 }, // Feira de Santana
  // Pernambuco
  '500': { lat: -8.0537, lng: -34.8832 },  // Recife Centro / Boa Vista
  '501': { lat: -8.0467, lng: -34.8781 },  // Santo Amaro
  '530': { lat: -8.0089, lng: -34.8553 },  // Olinda
  '541': { lat: -8.1128, lng: -35.0147 },  // Jaboatão
  // Ceará / Norte / Nordeste
  '570': { lat: -9.6658, lng: -35.7353 },  // Maceió
  '580': { lat: -7.1195, lng: -34.845 },   // João Pessoa
  '590': { lat: -5.7945, lng: -35.211 },   // Natal
  '600': { lat: -3.7319, lng: -38.5267 },  // Fortaleza
  '640': { lat: -5.092, lng: -42.8038 },   // Teresina
  '650': { lat: -2.5307, lng: -44.3068 },  // São Luís
  '660': { lat: -1.4558, lng: -48.5044 },  // Belém
  '689': { lat: 0.0349, lng: -51.0694 },   // Macapá
  '690': { lat: -3.119, lng: -60.0217 },   // Manaus
  '693': { lat: 2.8235, lng: -60.6758 },   // Boa Vista
  '699': { lat: -9.9754, lng: -67.8249 },  // Rio Branco
  // Centro-Oeste
  '700': { lat: -15.7939, lng: -47.8828 }, // Brasília Plano Piloto
  '716': { lat: -15.9016, lng: -47.7726 }, // São Sebastião / Lago Sul DF
  '722': { lat: -15.8189, lng: -48.1066 }, // Ceilândia DF
  '740': { lat: -16.6869, lng: -49.2648 }, // Goiânia
  '768': { lat: -8.7619, lng: -63.9039 },  // Porto Velho
  '770': { lat: -10.184, lng: -48.3336 },  // Palmas
  '780': { lat: -15.6014, lng: -56.0979 }, // Cuiabá
  '790': { lat: -20.4697, lng: -54.6201 }, // Campo Grande
  // Sul
  '800': { lat: -25.4284, lng: -49.2733 }, // Curitiba
  '860': { lat: -23.3045, lng: -51.1696 }, // Londrina
  '870': { lat: -23.4205, lng: -51.9333 }, // Maringá
  '880': { lat: -27.5954, lng: -48.548 },  // Florianópolis
  '892': { lat: -26.3045, lng: -48.8487 }, // Joinville
  '900': { lat: -30.0346, lng: -51.2177 }, // Porto Alegre
  '950': { lat: -29.1678, lng: -51.1794 }, // Caxias do Sul
};

const STATE_CAPITALS_COORDS: Record<string, Coord> = {
  SP: { lat: -23.5505, lng: -46.6333 },
  RJ: { lat: -22.9068, lng: -43.1729 },
  MG: { lat: -19.9167, lng: -43.9345 },
  ES: { lat: -20.3155, lng: -40.3128 },
  BA: { lat: -12.9714, lng: -38.5014 },
  SE: { lat: -10.9472, lng: -37.0731 },
  AL: { lat: -9.6658, lng: -35.7353 },
  PE: { lat: -8.0476, lng: -34.877 },
  PB: { lat: -7.1195, lng: -34.845 },
  RN: { lat: -5.7945, lng: -35.211 },
  CE: { lat: -3.7319, lng: -38.5267 },
  PI: { lat: -5.092, lng: -42.8038 },
  MA: { lat: -2.5307, lng: -44.3068 },
  PA: { lat: -1.4558, lng: -48.5044 },
  AP: { lat: 0.0349, lng: -51.0694 },
  AM: { lat: -3.119, lng: -60.0217 },
  RR: { lat: 2.8235, lng: -60.6758 },
  AC: { lat: -9.9754, lng: -67.8249 },
  RO: { lat: -8.7619, lng: -63.9039 },
  TO: { lat: -10.184, lng: -48.3336 },
  DF: { lat: -15.7939, lng: -47.8828 },
  GO: { lat: -16.6869, lng: -49.2648 },
  MT: { lat: -15.6014, lng: -56.0979 },
  MS: { lat: -20.4697, lng: -54.6201 },
  PR: { lat: -25.4284, lng: -49.2733 },
  SC: { lat: -27.5954, lng: -48.548 },
  RS: { lat: -30.0346, lng: -51.2177 },
};

// 1-digit CEP macro-region centroids (0-9) as ultimate fallback
const CEP_REGION1_COORDS: Record<string, Coord> = {
  '0': { lat: -23.5505, lng: -46.6333 }, // Grande São Paulo
  '1': { lat: -22.9056, lng: -47.0608 }, // Interior SP
  '2': { lat: -22.9068, lng: -43.1729 }, // RJ / ES
  '3': { lat: -19.9167, lng: -43.9345 }, // MG
  '4': { lat: -12.9714, lng: -38.5014 }, // BA / SE
  '5': { lat: -8.0476, lng: -34.877 },   // PE / AL / PB / RN
  '6': { lat: -3.7319, lng: -38.5267 },  // CE / PI / MA / Norte
  '7': { lat: -15.7939, lng: -47.8828 }, // Centro-Oeste / TO / RO
  '8': { lat: -25.4284, lng: -49.2733 }, // PR / SC
  '9': { lat: -30.0346, lng: -51.2177 }, // RS
};

export function haversineDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function estimateCoordinatesForCepAndCity(
  cep?: string,
  _city?: string,
  state?: string
): Coord | null {
  const digits = (cep || '').replace(/\D/g, '');
  if (digits.length >= 3 && CEP_PREFIX3_COORDS[digits.slice(0, 3)]) {
    return CEP_PREFIX3_COORDS[digits.slice(0, 3)];
  }
  if (digits.length >= 2) {
    // Try nearest 3-digit prefix sharing the same 2-digit sub-sector
    const prefix2 = digits.slice(0, 2);
    const matchingKey = Object.keys(CEP_PREFIX3_COORDS).find((k) => k.startsWith(prefix2));
    if (matchingKey) {
      return CEP_PREFIX3_COORDS[matchingKey];
    }
  }
  if (state && STATE_CAPITALS_COORDS[state.toUpperCase()]) {
    return STATE_CAPITALS_COORDS[state.toUpperCase()];
  }
  if (digits.length >= 1 && CEP_REGION1_COORDS[digits[0]]) {
    return CEP_REGION1_COORDS[digits[0]];
  }
  return null;
}

export function formatDistanceLabel(distanceKm: number): string {
  if (distanceKm < 1) {
    return 'Menos de 1 km do seu CEP';
  }
  if (distanceKm < 10) {
    return `Aprox. ${distanceKm.toFixed(1).replace('.', ',')} km do seu CEP`;
  }
  return `Aprox. ${Math.round(distanceKm).toLocaleString('pt-BR')} km do seu CEP`;
}

export interface RankedServiceItem {
  service: ServiceItem;
  distanceKm: number | null;
  distanceLabel: string | null;
  isNearbyLocal: boolean;
}

function getNumericCep(cep?: string): number | null {
  const digits = (cep || '').replace(/\D/g, '');
  if (digits.length !== 8) return null;
  const num = Number(digits);
  return Number.isFinite(num) ? num : null;
}

export const MAX_PROXIMITY_KM = 30;

export function formatLocationDisplay(location: CepInfo): string {
  const parts = [
    location.bairro?.trim(),
    `${location.localidade} - ${location.uf}`,
  ].filter(Boolean);
  const cepSuffix =
    location.cep && location.cep !== '00000-000' ? ` (${location.cep})` : '';
  return `${parts.join(', ')}${cepSuffix}`;
}

export function buildMapsSusSearchUrl(
  location: CepInfo,
  topic: 'emergencia' | 'geral' = 'geral'
): string {
  const queryLabel =
    topic === 'emergencia'
      ? 'Hospital UPA Delegacia da Mulher'
      : 'UBS Posto de Saúde Hospital SUS';

  if (typeof location.lat === 'number' && typeof location.lng === 'number') {
    return `https://www.google.com/maps/search/${encodeURIComponent(
      queryLabel
    )}/@${location.lat.toFixed(6)},${location.lng.toFixed(6)},14z`;
  }

  const cepPart = location.cep && location.cep !== '00000-000' ? location.cep : '';
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${queryLabel} ${location.bairro || ''} ${cepPart} ${location.localidade} ${location.uf}`.trim()
  )}`;
}

export function isFreeOnlineOffer(service: ServiceItem): boolean {
  return Boolean(
    service.isNationalOnline &&
      (service.accessMode === 'Online Imediato' || service.website || service.whatsapp)
  );
}

/**
 * Filters and orders services:
 * 1. Free online offers FIRST (`tier: 0`), for immediate access anywhere.
 * 2. National 24h phone services (`tier: 1`), e.g. 190 / 188 / 129.
 * 3. Physical regional services (`tier: 2`): MUST be in the same state (UF) AND <= 30 km
 *    from the CEP, sorted strictly from closest to farthest (0 km -> 30 km).
 */
export function sortServicesByCepProximity(
  services: ServiceItem[],
  location: CepInfo | null
): RankedServiceItem[] {
  if (!location) {
    const sortedWithoutLoc = [...services].sort((a, b) => {
      const tierA = isFreeOnlineOffer(a) ? 0 : a.isNationalOnline ? 1 : 2;
      const tierB = isFreeOnlineOffer(b) ? 0 : b.isNationalOnline ? 1 : 2;
      if (tierA !== tierB) return tierA - tierB;
      return a.name.localeCompare(b.name, 'pt-BR');
    });

    return sortedWithoutLoc.map((service) => ({
      service,
      distanceKm: null,
      distanceLabel: isFreeOnlineOffer(service)
        ? 'Oferta online gratuita · Acesso imediato'
        : service.isNationalOnline
        ? 'Atendimento nacional gratuito'
        : null,
      isNearbyLocal: false,
    }));
  }

  const userCoords =
    typeof location.lat === 'number' && typeof location.lng === 'number'
      ? { lat: location.lat, lng: location.lng }
      : estimateCoordinatesForCepAndCity(location.cep, location.localidade, location.uf);

  const userCepNum = getNumericCep(location.cep);
  const userUf = location.uf?.trim().toUpperCase();

  type Enriched = {
    service: ServiceItem;
    distanceKm: number | null;
    distanceLabel: string | null;
    isNearbyLocal: boolean;
    tier: number;
    cepDiff: number;
  };

  const enriched: Enriched[] = [];

  for (const service of services) {
    if (service.isNationalOnline) {
      const onlineOffer = isFreeOnlineOffer(service);
      enriched.push({
        service,
        distanceKm: null,
        distanceLabel: onlineOffer
          ? 'Oferta online gratuita · Atendimento imediato'
          : 'Atendimento nacional gratuito 24h',
        isNearbyLocal: false,
        tier: onlineOffer ? 0 : 1,
        cepDiff: 0,
      });
      continue;
    }

    // Never show physical services in another state when a CEP/location is active
    const serviceUf = service.state?.trim().toUpperCase();
    if (!serviceUf || !userUf || serviceUf !== userUf) {
      continue;
    }

    const serviceCoords =
      typeof service.lat === 'number' && typeof service.lng === 'number'
        ? { lat: service.lat, lng: service.lng }
        : estimateCoordinatesForCepAndCity(service.cep, service.city, service.state);

    if (!userCoords || !serviceCoords) {
      continue;
    }

    const distanceKm = haversineDistanceKm(
      userCoords.lat,
      userCoords.lng,
      serviceCoords.lat,
      serviceCoords.lng
    );

    // Never show physical services farther than 30 km from the CEP
    if (distanceKm > MAX_PROXIMITY_KM) {
      continue;
    }

    const serviceCepNum = getNumericCep(service.cep);
    const cepDiff =
      userCepNum !== null && serviceCepNum !== null
        ? Math.abs(userCepNum - serviceCepNum)
        : Number.MAX_SAFE_INTEGER;

    enriched.push({
      service,
      distanceKm,
      distanceLabel: formatDistanceLabel(distanceKm),
      isNearbyLocal: true,
      tier: 2,
      cepDiff,
    });
  }

  enriched.sort((a, b) => {
    if (a.tier !== b.tier) {
      return a.tier - b.tier;
    }

    if (a.distanceKm !== null && b.distanceKm !== null) {
      const diff = a.distanceKm - b.distanceKm;
      if (Math.abs(diff) > 0.05) {
        return diff;
      }
    }

    if (a.cepDiff !== b.cepDiff) {
      return a.cepDiff - b.cepDiff;
    }

    return a.service.name.localeCompare(b.service.name, 'pt-BR');
  });

  return enriched.map(({ service, distanceKm, distanceLabel, isNearbyLocal }) => ({
    service,
    distanceKm,
    distanceLabel,
    isNearbyLocal,
  }));
}
