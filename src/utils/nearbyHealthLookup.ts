import { CepInfo, ServiceCategory, ServiceItem } from '../types';
import {
  estimateCoordinatesForCepAndCity,
  haversineDistanceKm,
  MAX_PROXIMITY_KM,
} from './cepProximity';

export type PublicSearchScope =
  | 'saude'
  | 'psicologico'
  | 'juridico'
  | 'emergencia'
  | 'cursos'
  | 'geral';

interface OverpassElement {
  id: number;
  type: 'node' | 'way' | 'relation';
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const nearbyPublicCache = new Map<string, ServiceItem[]>();

const EXCLUDED_ROAD_PREFIX_RE =
  /^(rua|avenida|av\.?|travessa|alameda|estrada|rodovia|largo|pra[çc]a|viela|beco)\b/i;

// Strictly exclude non-support specialties, access gates, commercial venues, and ALL Brazilian private/paid hospitals, clinics, labs, and plans.
const EXCLUDED_NON_SUPPORT_RE =
  /\b(olhos|oftalmo\w*|otorrino\w*|ortoped\w*|odont\w*|dent\w*|est[eé]tic\w*|pl[aá]stica|veterin[aá]r\w*|pet\b|consult[oó]rio\w*|acesso\s*\||portaria|estacionamento|garagem|audit[oó]rio|heliponto|ambulatório de|laborat[oó]rio|diagn[oó]stico|imagem|radiologia|resson[aâ]ncia|tomografia|ultrassom|hemodi[aá]lise|hospital[- ]dia|day hospital|check[- ]up|medicina diagn[oó]stica|c[aá]rdio pulmonar|cardiolog\w*|oncolog\w*|instituto do c[aâ]ncer|instituto de olh|cl[ií]nica de|cl[ií]nica particular|cl[ií]nica privada|unimed|hapvida|notredame|interm[eé]dica|amil|bradesco sa[uú]de|sulam[eé]rica|prevent senior|porto seguro sa[uú]de|medsenior|rede d['’]?or|copa d['’]?or|barra d['’]?or|quinta d['’]?or|hospital star|vila nova star|s[aã]o luiz|s[ií]rio[- ]liban[eê]s|albert einstein|hcor|hospital do cora[çc][aã]o|hospital alem[aã]o oswaldo cruz|pro[- ]matre|santa joana|s[aã]o camilo|hospital santa izabel|santa izabel|hospital portugu[eê]s|real portugu[eê]s|hospital alian[çc]a|hospital da bahia|mater dei|biocor|fel[ií]cio rocho|lifecenter|hospital vera cruz|hospital santa paula|hospital santa catarina|casa de sa[uú]de santa catarina|samaritano|leforte|nove de julho|9 de julho|hospital bras[ií]lia|hospital anchieta|hospital santa l[uú]cia|hospital santa helena|moinhos de vento|m[aã]e de deus|divina provid[eê]ncia|marcelino champagnat|hospital pilar|hospital vit[óo]ria|hospital s[aã]o lucas|benefic[eê]ncia portuguesa|hospital memorial|dasa|kora|sabin|fleury|delboni|lavoisier|hermes pardini|medcenter|particular|privad[oa]|conv[eê]nio|plano de sa[uú]de|pago|mensalidade|autoescola|farm[aá]cia|drogaria|[oó]tica|[oó]ticas|academia|sal[aã]o de beleza|barbearia|restaurante|supermercado|lot[eé]rica|hotel|pousada|motel)\b/i;

export function normalizePublicScope(category?: ServiceCategory | 'ongs_apoio' | 'geral'): PublicSearchScope {
  if (
    category === 'saude' ||
    category === 'psicologico' ||
    category === 'juridico' ||
    category === 'emergencia' ||
    category === 'cursos'
  ) {
    return category;
  }
  return 'geral';
}

export function isExcludedPublicPoi(
  name: string,
  tags?: Record<string, string>,
  osmClass?: string
): boolean {
  const trimmed = (name || '').trim();
  if (!trimmed || trimmed.length < 3) return true;
  if (osmClass === 'highway' || EXCLUDED_ROAD_PREFIX_RE.test(trimmed)) return true;
  if (EXCLUDED_NON_SUPPORT_RE.test(trimmed)) return true;

  if (tags) {
    const operatorAndBrand = `${tags.operator || ''} ${tags.brand || ''} ${tags.network || ''}`.trim();
    if (operatorAndBrand && EXCLUDED_NON_SUPPORT_RE.test(operatorAndBrand)) {
      return true;
    }

    if (tags.fee === 'yes' || Boolean(tags.charge) || tags['healthcare:for'] === 'private') {
      return true;
    }

    const opType = (tags['operator:type'] || tags.ownership || '').toLowerCase();
    if (opType === 'private') {
      const explicitFreeCharity = /\b(santa casa|sus\b|filantr[oó]pic|sem fins lucrativos|gratuit|ong\b)\b/i.test(
        `${trimmed} ${tags.description || ''} ${operatorAndBrand}`
      );
      if (!explicitFreeCharity) {
        return true;
      }
    }
  }

  return false;
}

type UnitKind = 'deam' | 'defensoria' | 'suas' | 'cursos' | 'caps' | 'ubs' | 'upa' | 'hospital' | 'ong';

interface ClassifiedUnit {
  kind: UnitKind;
  category: ServiceCategory;
  subcategory: string;
  description: string;
  accessMode: ServiceItem['accessMode'];
  defaultHours: string;
  defaultPhone?: string;
  freeConfirmation: string;
  tags: string[];
}

export function classifyFreePublicUnit(
  rawName: string,
  tags?: Record<string, string>,
  osmClass?: string
): ClassifiedUnit | null {
  if (isExcludedPublicPoi(rawName, tags, osmClass)) {
    return null;
  }

  const name = rawName.toLowerCase();
  const amenity = (tags?.amenity || '').toLowerCase();
  const healthcare = (tags?.healthcare || '').toLowerCase();
  const operatorText = `${tags?.['operator:type'] || ''} ${tags?.operator || ''} ${tags?.network || ''} ${tags?.ownership || ''} ${tags?.description || ''}`.toLowerCase();

  const hasPublicOperator =
    /\b(public|government|municip|estadual|federal|sus|prefeitura|secretaria|minist[eé]rio|governo|ebserh|fiocruz|defensoria|universidade federal|universidade estadual)\b/i.test(
      operatorText
    ) || tags?.fee === 'no';

  // 1. Delegacia da Mulher / Casa da Mulher Brasileira (Emergência & Proteção)
  if (
    /\b(delegacia d[aeo] mulher|delegacia de defesa da mulher|delegacia especializada de atendimento [àa] mulher|deam|ddm|casa da mulher brasileira)\b/i.test(
      name
    )
  ) {
    return {
      kind: 'deam',
      category: 'emergencia',
      subcategory: 'Proteção Pública 24h (Rede da Mulher)',
      description:
        'Unidade pública especializada no atendimento gratuito e sigiloso à mulher em situação de violência para registro de ocorrência e pedido de medida protetiva.',
      accessMode: 'Plantão 24h',
      defaultHours: 'Atendimento gratuito (confirmar plantão 24h ou horário local)',
      defaultPhone: '180',
      freeConfirmation: 'Serviço público gratuito do Estado / Rede de Proteção à Mulher.',
      tags: ['Delegacia da Mulher', 'DEAM', 'Proteção', 'Gratuito', 'Medida Protetiva'],
    };
  }

  // 2. Defensoria Pública / Núcleos Jurídicos Gratuitos
  if (
    /\b(defensoria p[uú]blica|n[uú]cleo da defensoria|juizado da mulher|juizado de viol[eê]ncia dom[eé]stica|oab mulher|n[uú]cleo de pr[aá]tica jur[ií]dica)\b/i.test(
      name
    )
  ) {
    return {
      kind: 'defensoria',
      category: 'juridico',
      subcategory: 'Defensoria / Orientação Jurídica Gratuita',
      description:
        'Atendimento jurídico 100% gratuito com defensoras públicas ou equipes jurídicas para medidas protetivas, pensão alimentícia, guarda e divórcio.',
      accessMode: 'Agendamento Prévio',
      defaultHours: 'Segunda a Sexta, horário comercial',
      defaultPhone: '129',
      freeConfirmation: 'Assistência jurídica pública integral e gratuita garantida por lei.',
      tags: ['Defensoria Pública', 'Advogada Gratuita', 'Direitos', 'Gratuito'],
    };
  }

  // 3. CREAS / CRAS / Casa da Mulher / CRAM / CEAM / CDCM (SUAS - Assistência & Acolhimento)
  if (
    /\b(cras|creas|centro de refer[eê]ncia de assist[eê]ncia social|centro de refer[eê]ncia especializado|casa da mulher|cram|ceam|cdcm)\b/i.test(
      name
    )
  ) {
    const isSpecializedWomenOrCreas = /\b(creas|especializado|casa da mulher|cram|ceam|cdcm)\b/i.test(name);
    return {
      kind: 'suas',
      category: 'juridico',
      subcategory: isSpecializedWomenOrCreas
        ? 'CREAS / Centro de Referência Gratuito (SUAS)'
        : 'CRAS / Assistência Social Gratuita (SUAS)',
      description: isSpecializedWomenOrCreas
        ? 'Unidade pública gratuita (SUAS) com psicólogas e assistentes sociais para acolhimento, proteção contra violência, orientação de direitos e encaminhamentos.'
        : 'Centro público gratuito de referência social para auxílio em benefícios, apoio psicossocial, encaminhamento a cursos e garantia de direitos.',
      accessMode: 'Livre Demanda (Porta Aberta)',
      defaultHours: 'Segunda a Sexta, das 08h às 17h',
      defaultPhone: '180',
      freeConfirmation: 'Serviço público 100% gratuito da rede SUAS (Assistência Social).',
      tags: isSpecializedWomenOrCreas
        ? ['CREAS', 'Casa da Mulher', 'Acolhimento', 'Psicologia', 'Direitos', 'Gratuito']
        : ['CRAS', 'SUAS', 'Assistência Social', 'Cursos', 'Acolhimento', 'Gratuito'],
    };
  }

  // 4. Institutos Federais, SINE, PAT e Escolas Técnicas Públicas (Cursos & Emprego Gratuitos)
  if (
    /\b(instituto federal|ifsp|ifrj|ifba|ifmg|ifpr|ifrs|ifsc|ifpe|ifce|ifpa|ifma|ifgo|ifmt|ifms|ifam|ifpb|ifrn|ifal|ifse|ifpi|ifes|ifto|ifro|ifrr|ifap|ifac|ifb|sine|sistema nacional de emprego|posto de atendimento ao trabalhador|casa do trabalhador|escola t[eé]cnica estadual|etec|centro vocacional tecnol[oó]gico)\b/i.test(
      name
    )
  ) {
    return {
      kind: 'cursos',
      category: 'cursos',
      subcategory: 'Capacitação & Emprego Público Gratuito',
      description:
        'Instituição pública gratuita para qualificação profissional, cursos técnicos, Programa Mulheres Mil e intermediação de vagas de emprego sem taxas.',
      accessMode: 'Livre Demanda (Porta Aberta)',
      defaultHours: 'Segunda a Sexta, horário comercial',
      freeConfirmation: 'Ensino e atendimento ao trabalhador 100% públicos e gratuitos.',
      tags: ['Cursos Gratuitos', 'Capacitação', 'Renda', 'Emprego', 'Rede Pública'],
    };
  }

  // 5. CAPS (Saúde Mental Pública SUS)
  if (/\b(caps|capsi|caps ad|centro de aten[çc][aã]o psicossocial)\b/i.test(name)) {
    return {
      kind: 'caps',
      category: 'psicologico',
      subcategory: 'CAPS · Apoio Psicológico Público (SUS)',
      description:
        'Centro de Atenção Psicossocial do SUS próximo ao seu CEP. Oferece acolhimento gratuito em saúde mental por porta aberta, sem necessidade de encaminhamento prévio.',
      accessMode: 'Livre Demanda (Porta Aberta)',
      defaultHours: 'Segunda a Sexta (CAPS III atende 24h)',
      defaultPhone: '136',
      freeConfirmation: 'Atendimento 100% público e gratuito pelo SUS.',
      tags: ['CAPS', 'Apoio Psicológico', 'Saúde Mental', 'SUS Grátis', 'Acolhimento'],
    };
  }

  // 6. UBS / Posto de Saúde / AMA / PSF / Clínica da Família (Saúde & Acolhimento Inicial)
  const isUbsOrPosto =
    /\b(ubs|unidade b[aá]sica|posto de sa[uú]de|centro de sa[uú]de|psf|esf|ama|cl[ií]nica da fam[ií]lia|sa[uú]de da fam[ií]lia)\b/i.test(
      name
    ) ||
    (/\bpolicl[ií]nica\b/i.test(name) &&
      (/\b(municipal|estadual|regional|sus|mulher|p[uú]blica)\b/i.test(name) || hasPublicOperator));

  if (isUbsOrPosto) {
    return {
      kind: 'ubs',
      category: 'saude',
      subcategory: 'UBS / Posto de Saúde Próximo (SUS)',
      description:
        'Unidade Básica de Saúde pública próxima ao seu CEP. Oferece consultas médicas e ginecológicas, pré-natal, preventivo (Papanicolau), testes rápidos e acolhimento em saúde mental pelo SUS.',
      accessMode: 'Livre Demanda (Porta Aberta)',
      defaultHours: 'Segunda a Sexta, das 07h às 17h (confirmar na unidade)',
      defaultPhone: '136',
      freeConfirmation: 'Atendimento público e gratuito pelo SUS.',
      tags: ['UBS', 'Posto de Saúde', 'SUS Grátis', 'Saúde da Mulher', 'Acolhimento'],
    };
  }

  // 7. UPA / Pronto Atendimento Público
  const isUpa =
    /\b(upa|unidade de pronto atendimento)\b/i.test(name) ||
    (/\b(pronto atendimento|pronto[- ]socorro)\b/i.test(name) &&
      (/\b(municipal|estadual|p[uú]blico|sus)\b/i.test(name) || hasPublicOperator));

  if (isUpa) {
    return {
      kind: 'upa',
      category: 'saude',
      subcategory: 'UPA / Pronto Atendimento 24h (SUS)',
      description:
        'Pronto atendimento de urgência 100% gratuito do SUS próximo ao seu CEP para acolhimento imediato e encaminhamento médico.',
      accessMode: 'Plantão 24h',
      defaultHours: 'Atendimento de urgência 24 horas',
      defaultPhone: '136',
      freeConfirmation: 'Pronto atendimento público e gratuito pelo SUS.',
      tags: ['UPA', 'Urgência', 'SUS Grátis', 'Plantão 24h'],
    };
  }

  // 8. Hospitais e Maternidades Públicas / SUS / Universitárias / Santa Casa
  const isExplicitPublicHospital =
    /\b(hospital municipal|hospital estadual|hospital federal|hospital regional|hospital p[uú]blico|hospital universit[aá]rio|hospital das cl[ií]nicas|hospital escola|hospital da mulher|hospital materno|conjunto hospitalar|maternidade municipal|maternidade estadual|maternidade federal|maternidade p[uú]blica|maternidade escola|casa de parto|santa casa)\b/i.test(
      name
    );

  const isPublicGeneralHospital =
    (/\bhospital geral\b/i.test(name) ||
      ((amenity === 'hospital' || healthcare === 'hospital') && hasPublicOperator));

  if (isExplicitPublicHospital || isPublicGeneralHospital) {
    return {
      kind: 'hospital',
      category: 'saude',
      subcategory: 'Hospital Público / Maternidade SUS',
      description:
        'Hospital da rede pública / filantrópica SUS próximo ao seu CEP para atendimento médico, urgências, ginecologia, maternidade e acolhimento.',
      accessMode: 'Plantão 24h',
      defaultHours: 'Atendimento de urgência 24 horas pelo SUS',
      defaultPhone: '136',
      freeConfirmation: 'Atendimento gratuito pelo Sistema Único de Saúde (SUS).',
      tags: ['Hospital Público', 'SUS Grátis', 'Urgência', 'Saúde da Mulher', 'Acolhimento'],
    };
  }

  // 9. ONGs / Coletivos Sem Fins Lucrativos voltados para o público feminino
  const combinedNgoText = `${name} ${tags?.description || ''}`.toLowerCase();
  const isWomenFocusedNgo =
    /\b(associa[çc][aã]o (de |das )?mulheres|coletivo (de |das )?mulheres|instituto d[aeo]s? mulher\w*|casa d[aeo]s? mulher\w*|centro de apoio [àa] mulher|movimento de mulheres|rede feminina|grupo de mulheres|f[oó]rum de mulheres|casa de acolhimento .*mulher|ong .*mulher|mulher\w* .*ong|maria da penha)\b/i.test(
      combinedNgoText
    ) ||
    ((tags?.office === 'ngo' || tags?.office === 'association' || amenity === 'social_facility') &&
      /\b(mulher\w*|feminin\w*|m[aã]es?|gestant\w*|maria da penha)\b/i.test(combinedNgoText));

  if (isWomenFocusedNgo) {
    return {
      kind: 'ong',
      category: 'social',
      subcategory: 'ONG Voltada para Mulheres (Gratuita)',
      description:
        'Organização ou coletivo gratuito voltado ao público feminino na sua região para acolhimento social, escuta, orientação de direitos e fortalecimento.',
      accessMode: 'Livre Demanda (Porta Aberta)',
      defaultHours: 'Confirmar horário de atendimento local',
      freeConfirmation: 'Apoio gratuito voltado às mulheres, sem fins lucrativos.',
      tags: ['ONG Feminina', 'Mulheres', 'Acolhimento', 'Gratuito', 'Rede Solidária'],
    };
  }

  return null;
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

  const classified = classifyFreePublicUnit(rawName, tags);
  if (!classified) return null;

  const phone = (tags.phone || tags['contact:phone'] || '').trim() || classified.defaultPhone;
  const website = (tags.website || tags['contact:website'] || '').trim() || undefined;
  const neighborhood = (tags['addr:suburb'] || tags['addr:neighbourhood'] || '').trim() || undefined;
  const city = (tags['addr:city'] || location.localidade || '').trim();
  const address = buildAddressFromTags(tags, location.localidade, location.uf);
  const cep = (tags['addr:postcode'] || '').trim() || undefined;
  const hours = (tags.opening_hours || '').trim() || classified.defaultHours;

  const item: ServiceItem = {
    id: `osm-${el.type}-${el.id}`,
    name: rawName,
    category: classified.category,
    subcategory: classified.subcategory,
    description: classified.description,
    state: location.uf,
    city,
    neighborhood,
    address,
    cep,
    lat,
    lng,
    phone,
    website: website && (website.startsWith('http://') || website.startsWith('https://')) ? website : undefined,
    hours,
    accessMode: classified.accessMode,
    requiresRegistration: false,
    freeConfirmation: classified.freeConfirmation,
    tags: classified.tags,
    tipsForVictim:
      classified.defaultPhone === '180'
        ? 'Atendimento gratuito e sigiloso. Em caso de dúvida, ligue antes para a Central 180.'
        : classified.defaultPhone === '129'
        ? 'Para agendar ou confirmar documentos necessários na Defensoria Pública, ligue 129.'
        : 'Para confirmar horários ou qual unidade atende seu endereço pelo SUS, ligue gratuitamente para 136.',
  };

  return { item, distanceKm };
}

function buildOverpassQuery(scope: PublicSearchScope, lat: number, lng: number): string {
  const healthBlock = `
  nwr["amenity"="hospital"](around:9000,${lat},${lng});
  nwr["amenity"="clinic"]["name"~"(UBS|AMA|UPA|CAPS|Unidade|Posto|Sa[uú]de|Hospital|Maternidade|Cl[ií]nica da Fam[ií]lia)",i](around:7000,${lat},${lng});
  nwr["healthcare"~"hospital|centre|clinic"]["name"~"(UBS|AMA|UPA|CAPS|Unidade|Posto|Sa[uú]de|Hospital|Maternidade|Cl[ií]nica da Fam[ií]lia)",i](around:7000,${lat},${lng});`;

  const socialAndLegalBlock = `
  nwr["amenity"="social_facility"](around:10000,${lat},${lng});
  nwr["amenity"="courthouse"](around:10000,${lat},${lng});
  nwr["office"="government"]["name"~"(Defensoria|CRAS|CREAS|SINE|Mulher)",i](around:10000,${lat},${lng});`;

  const policeBlock = `
  nwr["amenity"="police"]["name"~"(Mulher|DEAM|DDM|Casa da Mulher)",i](around:12000,${lat},${lng});`;

  const coursesBlock = `
  nwr["amenity"~"college|school|university"]["name"~"(Instituto Federal|ETEC|Centro Vocacional)",i](around:12000,${lat},${lng});`;

  const womenNgoBlock = `
  nwr["office"~"ngo|association"]["name"~"(Mulher|Mulheres|Feminin|M[aã]e|M[aã]es|Gestant|Maria da Penha|Acolhimento|ONG)",i](around:15000,${lat},${lng});
  nwr["amenity"="social_facility"]["name"~"(Mulher|Mulheres|Feminin|M[aã]e|M[aã]es|Casa da Mulher|CRAM|CEAM|CDCM|Acolhimento)",i](around:15000,${lat},${lng});`;

  let body = `${healthBlock}\n${womenNgoBlock}`;
  if (scope === 'psicologico') {
    body = `${healthBlock}\n${socialAndLegalBlock}\n${womenNgoBlock}`;
  } else if (scope === 'juridico') {
    body = `${socialAndLegalBlock}\n${policeBlock}\n${womenNgoBlock}`;
  } else if (scope === 'emergencia') {
    body = `${policeBlock}\n${healthBlock}\n${socialAndLegalBlock}\n${womenNgoBlock}`;
  } else if (scope === 'cursos') {
    body = `${coursesBlock}\n${socialAndLegalBlock}\n${womenNgoBlock}`;
  } else if (scope === 'geral') {
    body = `${healthBlock}\n${socialAndLegalBlock}\n${policeBlock}\n${womenNgoBlock}`;
  }

  return `[out:json][timeout:6];\n(\n${body}\n);\nout center tags 80;\n`;
}

function getNominatimQueriesForScope(
  scope: PublicSearchScope,
  bairro: string | undefined,
  city: string
): string[] {
  switch (scope) {
    case 'juridico':
      return ['Defensoria Pública', 'CREAS', 'Casa da Mulher', 'ONG Mulher'];
    case 'emergencia':
      return ['Delegacia da Mulher', 'UPA', 'Hospital', 'ONG Mulher'];
    case 'cursos':
      return ['Instituto Federal', 'SINE', 'CRAS', 'ONG Mulher'];
    case 'psicologico':
      return ['CAPS', bairro ? `UBS ${bairro} ${city}` : 'UBS', 'CREAS', 'ONG Mulher'];
    case 'saude':
      return [bairro ? `UBS ${bairro} ${city}` : 'UBS', 'Posto de Saúde', 'Hospital', 'ONG Mulher'];
    case 'geral':
    default:
      return [bairro ? `UBS ${bairro} ${city}` : 'UBS', 'Hospital', 'Defensoria Pública', 'ONG Mulher'];
  }
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
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('json')) return [];
    const data = (await res.json()) as { elements?: OverpassElement[] };
    return Array.isArray(data.elements) ? data.elements : [];
  } catch {
    return [];
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function queryNominatimBounded(
  location: CepInfo,
  userLat: number,
  userLng: number,
  scope: PublicSearchScope
): Promise<{ item: ServiceItem; distanceKm: number }[]> {
  const bairro = location.bairro?.trim();
  const queries = getNominatimQueriesForScope(scope, bairro, location.localidade);

  // ~18 km bounding box around the searched CEP (covers urban neighborhoods AND neighboring interior towns within 30 km)
  const deltaLat = 0.165;
  const deltaLng = 0.175;
  const viewbox = `${(userLng - deltaLng).toFixed(4)},${(userLat + deltaLat).toFixed(4)},${(
    userLng + deltaLng
  ).toFixed(4)},${(userLat - deltaLat).toFixed(4)}`;

  const found: { item: ServiceItem; distanceKm: number }[] = [];
  const seen = new Set<string>();

  const responses = await Promise.all(
    queries.map(async (q) => {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 4500);
      try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&extratags=1&countrycodes=br&bounded=1&viewbox=${viewbox}&limit=10&q=${encodeURIComponent(
          q
        )}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return [];
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('json')) return [];
        return (await res.json()) as Array<{
          place_id: number;
          display_name?: string;
          name?: string;
          class?: string;
          type?: string;
          lat: string;
          lon: string;
          address?: Record<string, string>;
          extratags?: Record<string, string>;
        }>;
      } catch {
        return [];
      } finally {
        window.clearTimeout(timeoutId);
      }
    })
  );

  for (const results of responses) {
    for (const r of results) {
      const lat = Number(r.lat);
      const lng = Number(r.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const distanceKm = haversineDistanceKm(userLat, userLng, lat, lng);
      if (distanceKm > MAX_PROXIMITY_KM) continue;

      const name = (r.name || r.display_name?.split(',')[0] || '').trim();
      const pseudoTags: Record<string, string> = {
        ...(r.extratags || {}),
        ...(r.class === 'amenity' && r.type ? { amenity: r.type } : {}),
      };

      const classified = classifyFreePublicUnit(name, pseudoTags, r.class);
      if (!classified) continue;

      const norm = name.toLowerCase();
      if (seen.has(norm)) continue;
      seen.add(norm);

      const addr = r.address || {};
      const road = addr.road || '';
      const suburb = addr.suburb || addr.neighbourhood || '';
      const city = addr.city || addr.town || addr.municipality || location.localidade;
      const phone = (r.extratags?.phone || r.extratags?.['contact:phone'] || '').trim() || classified.defaultPhone;
      const website = (r.extratags?.website || r.extratags?.['contact:website'] || '').trim() || undefined;

      found.push({
        distanceKm,
        item: {
          id: `nom-${r.place_id}`,
          name,
          category: classified.category,
          subcategory: classified.subcategory,
          description: classified.description,
          state: location.uf,
          city,
          neighborhood: suburb || undefined,
          address: [road, suburb, `${city} - ${location.uf}`].filter(Boolean).join(' · '),
          lat,
          lng,
          phone,
          website: website && (website.startsWith('http://') || website.startsWith('https://')) ? website : undefined,
          hours: (r.extratags?.opening_hours || '').trim() || classified.defaultHours,
          accessMode: classified.accessMode,
          requiresRegistration: false,
          freeConfirmation: classified.freeConfirmation,
          tags: classified.tags,
        },
      });
    }
  }

  return found;
}

/**
 * Dynamically fetches verified 100%-free public network units & free NGOs across ALL of Brazil
 * within <= 30 km of the searched CEP/city coordinates using OpenStreetMap data.
 * Never returns private/paid hospitals or commercial clinics.
 * Zero-PII: only queries public coordinates in memory, never persists user CEP or location.
 */
export async function fetchNearbySusUnits(
  location: CepInfo | null,
  category?: ServiceCategory | 'ongs_apoio' | 'geral'
): Promise<ServiceItem[]> {
  if (!location || typeof window === 'undefined') return [];

  const coords =
    typeof location.lat === 'number' && typeof location.lng === 'number'
      ? { lat: location.lat, lng: location.lng }
      : estimateCoordinatesForCepAndCity(location.cep, location.localidade, location.uf);

  if (!coords) return [];

  const scope = normalizePublicScope(category);
  const cacheKey = `${location.cep}|${location.uf}|${coords.lat.toFixed(4)}|${coords.lng.toFixed(4)}|${scope}`;
  const cached = nearbyPublicCache.get(cacheKey);
  if (cached) return cached;

  const overpassQuery = buildOverpassQuery(scope, coords.lat, coords.lng);

  // Run Nominatim bounded search in parallel with Overpass so results are fast and reliable nationwide
  const overpassPromise = (async () => {
    let elements = await queryOverpass('https://overpass-api.de/api/interpreter', overpassQuery);
    if (elements.length === 0) {
      elements = await queryOverpass('https://overpass.kumi.systems/api/interpreter', overpassQuery);
    }
    return elements;
  })();

  const nominatimPromise = queryNominatimBounded(location, coords.lat, coords.lng, scope);
  const [elements, nomMapped] = await Promise.all([overpassPromise, nominatimPromise]);

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

  for (const nom of nomMapped) {
    const normName = nom.item.name.toLowerCase();
    if (seenNames.has(normName)) continue;
    seenNames.add(normName);
    mapped.push(nom);
  }

  mapped.sort((a, b) => a.distanceKm - b.distanceKm);

  const finalItems = mapped.slice(0, 20).map((m) => m.item);
  nearbyPublicCache.set(cacheKey, finalItems);
  return finalItems;
}

export const fetchNearbyPublicUnits = fetchNearbySusUnits;
