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

// Non-support specialties, access gates, and explicitly commercial/private payers or legal entities (always excluded)
const EXCLUDED_ALWAYS_RE =
  /\b(olhos|oftalmo\w*|otorrino\w*|ortoped\w*|odont\w*|dent\w*|pr[oó]tese|est[eé]tic\w*|pl[aá]stica|veterin[aá]r\w*|pet\b|consult[oó]rio\w*|acesso\s*\||portaria|estacionamento|garagem|audit[oó]rio|heliponto|ambulatório de|laborat[oó]rio|diagn[oó]stico|imagem|radiologia|resson[aâ]ncia|tomografia|ultrassom|hemodi[aá]lise|hospital[- ]dia|day hospital|check[- ]up|medicina diagn[oó]stica|c[aá]rdio pulmonar|cardiolog\w*|oncolog\w*|instituto do c[aâ]ncer|instituto de olh|cl[ií]nica de|cl[ií]nica particular|cl[ií]nica privada|ltda\b|s\/a\b|eireli\b|unimed|hapvida|notredame|interm[eé]dica|amil|bradesco sa[uú]de|sulam[eé]rica|prevent senior|porto seguro sa[uú]de|medsenior|dasa|kora|sabin|fleury|delboni|lavoisier|hermes pardini|particular|privad[oa]|conv[eê]nio|plano de sa[uú]de|pago|mensalidade|autoescola|farm[aá]cia|drogaria|[oó]tica|[oó]ticas|academia|sal[aã]o de beleza|barbearia|restaurante|supermercado|lot[eé]rica|hotel|pousada|motel|cemitério|cemiterio)\b/i;

// Private hospital chains/homonyms (only excluded when NOT verified public municipal/state/SUS entity)
const EXCLUDED_PRIVATE_CHAIN_RE =
  /\b(rede d['’]?or|copa d['’]?or|barra d['’]?or|quinta d['’]?or|hospital star|vila nova star|s[aã]o luiz|s[ií]rio[- ]liban[eê]s|albert einstein|hcor|hospital do cora[çc][aã]o|hospital alem[aã]o oswaldo cruz|pro[- ]matre|santa joana|s[aã]o camilo|hospital santa izabel|santa izabel|hospital portugu[eê]s|real portugu[eê]s|hospital alian[çc]a|hospital da bahia|mater dei|biocor|fel[ií]cio rocho|lifecenter|hospital vera cruz|hospital santa paula|hospital santa catarina|casa de sa[uú]de santa catarina|samaritano|leforte|nove de julho|9 de julho|hospital bras[ií]lia|hospital anchieta|hospital santa l[uú]cia|hospital santa helena|moinhos de vento|m[aã]e de deus|divina provid[eê]ncia|marcelino champagnat|hospital pilar|hospital vit[óo]ria|hospital s[aã]o lucas|benefic[eê]ncia portuguesa|hospital memorial|medcenter)\b/i;

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
  osmClass?: string,
  isVerifiedPublicEntity = false
): boolean {
  const trimmed = (name || '').trim();
  if (!trimmed || trimmed.length < 3) return true;
  if (osmClass === 'highway' || EXCLUDED_ROAD_PREFIX_RE.test(trimmed)) return true;
  if (EXCLUDED_ALWAYS_RE.test(trimmed)) return true;

  const hasExplicitPublicName =
    isVerifiedPublicEntity ||
    tags?.['operator:type'] === 'public' ||
    /\b(hospital municipal|hospital estadual|hospital federal|hospital regional|hospital p[uú]blico|hospital universit[aá]rio|maternidade municipal|maternidade p[uú]blica|santa casa|sus\b|prefeitura|secretaria de sa[uú]de)\b/i.test(
      trimmed
    );

  if (!hasExplicitPublicName && EXCLUDED_PRIVATE_CHAIN_RE.test(trimmed)) {
    return true;
  }

  if (tags) {
    const operatorAndBrand = `${tags.operator || ''} ${tags.brand || ''} ${tags.network || ''}`.trim();
    if (operatorAndBrand && EXCLUDED_ALWAYS_RE.test(operatorAndBrand)) {
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

type UnitKind = 'deam' | 'police_local' | 'defensoria' | 'suas' | 'cursos' | 'caps' | 'ubs' | 'upa' | 'hospital' | 'ong';

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
  osmClass?: string,
  isVerifiedPublicEntity = false
): ClassifiedUnit | null {
  if (isExcludedPublicPoi(rawName, tags, osmClass, isVerifiedPublicEntity)) {
    return null;
  }

  const name = rawName.toLowerCase();
  const amenity = (tags?.amenity || '').toLowerCase();
  const healthcare = (tags?.healthcare || '').toLowerCase();
  const operatorText = `${tags?.['operator:type'] || ''} ${tags?.operator || ''} ${tags?.network || ''} ${tags?.ownership || ''} ${tags?.description || ''}`.toLowerCase();

  const hasPublicOperator =
    isVerifiedPublicEntity ||
    /\b(public|government|municip|estadual|federal|sus|prefeitura|secretaria|minist[eé]rio|governo|ebserh|fiocruz|defensoria|universidade federal|universidade estadual)\b/i.test(
      operatorText
    ) ||
    tags?.fee === 'no';

  // 1A. Delegacia da Mulher / Casa da Mulher Brasileira (Emergência & Proteção Especializada)
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

  // 1B. Delegacia de Polícia Civil / Polícia Militar local (atende ocorrências e Medidas Protetivas em municípios sem DEAM exclusiva)
  const isHighwayOrRevenuePolice = /\b(rodovi[aá]ria|prf\b|alf[aâ]ndega|receita|tribut[aá]ria|fazenda)\b/i.test(name);
  const isLocalPoliceUnit =
    !isHighwayOrRevenuePolice &&
    (/\b(delegacia de pol[ií]cia|delegacia pol[ií]cia civil|delegacia civil|delegacia regional|delegacia territorial|delegacia municipal|delegacia|\d+[ªa]?\s*dp\b|companhia da pol[ií]cia militar|pelot[aã]o .*pol[ií]cia|destacamento .*pol[ií]cia|batalh[aã]o .*pol[ií]cia)\b/i.test(
      name
    ) ||
      (amenity === 'police' && !/\b(guarda municipal|tr[aâ]nsito)\b/i.test(name)));

  if (isLocalPoliceUnit) {
    return {
      kind: 'police_local',
      category: 'emergencia',
      subcategory: 'Delegacia / Segurança Pública Local (Rede de Proteção)',
      description:
        'Unidade policial pública mais próxima do seu CEP para registro de boletim de ocorrência, solicitação urgente de Medida Protetiva e socorro. Em cidades sem DEAM exclusiva, a Delegacia de Polícia Civil atende casos da Lei Maria da Penha gratuitamente.',
      accessMode: 'Plantão 24h',
      defaultHours: 'Em emergência imediata ligue 190 ou 180 (24h); confirmar plantão presencial local',
      defaultPhone: '190',
      freeConfirmation: 'Serviço público policial gratuito garantido pela Lei Maria da Penha.',
      tags: ['Delegacia', 'Polícia Civil', 'Proteção', 'Medida Protetiva', '190 / 180'],
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
    !/\bong\b/i.test(name) &&
    /\b(cras|creas|centro de refer[eê]ncia d[ae] assist[eê]ncia social|centro de refer[eê]ncia especializado|casa da mulher|cram|ceam|cdcm)\b/i.test(
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
        : 'Centro público gratuito de referência social para acolhimento imediato, apoio psicossocial, auxílio em benefícios, encaminhamento à rede de proteção e cursos.',
      accessMode: 'Livre Demanda (Porta Aberta)',
      defaultHours: 'Segunda a Sexta, das 08h às 17h',
      defaultPhone: '180',
      freeConfirmation: 'Serviço público 100% gratuito da rede SUAS (Assistência Social).',
      tags: isSpecializedWomenOrCreas
        ? ['CREAS', 'Casa da Mulher', 'Acolhimento', 'Psicologia', 'Direitos', 'Gratuito']
        : ['CRAS', 'SUAS', 'Assistência Social', 'Acolhimento', 'Proteção', 'Gratuito'],
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

  // 5. CAPS / NASF (Saúde Mental & Apoio Psicossocial Público SUS)
  if (
    /\b(caps|capsi|caps ad|centro de aten[çc][aã]o psicossocial|n[uú]cleo de apoio [àa] sa[uú]de da fam[ií]lia|nasf)\b/i.test(
      name
    )
  ) {
    const isCaps24h = /\b(caps\s*iii|caps\s*3)\b/i.test(name);
    return {
      kind: 'caps',
      category: 'psicologico',
      subcategory: isCaps24h
        ? 'CAPS III · Apoio Psicossocial 24h (SUS)'
        : 'CAPS / Apoio Psicossocial Público (SUS)',
      description:
        'Unidade pública do SUS próxima ao seu CEP com acolhimento gratuito em saúde mental e equipe multiprofissional, sem cobrança.',
      accessMode: isCaps24h ? 'Plantão 24h' : 'Livre Demanda (Porta Aberta)',
      defaultHours: isCaps24h
        ? 'Atendimento 24 horas pelo SUS (CAPS III)'
        : 'Segunda a Sexta (confirmar horário na unidade)',
      defaultPhone: '136',
      freeConfirmation: 'Atendimento 100% público e gratuito pelo SUS.',
      tags: ['CAPS', 'Apoio Psicológico', 'Saúde Mental', 'SUS Grátis', 'Acolhimento'],
    };
  }

  // 6. UBS / USF / Posto de Saúde / Centro de Saúde / Unidade de Saúde / Clínica da Família (todo o Brasil)
  const isUbsOrPosto =
    /\b(ubs|usf|unidade b[aá]sica|unidade de sa[uú]de|unidade mista(?: de sa[uú]de)?|posto de sa[uú]de|centro de sa[uú]de|centro municipal de sa[uú]de|cms|psf|esf|ama|cl[ií]nica da fam[ií]lia|sa[uú]de da fam[ií]lia)\b/i.test(
      name
    ) ||
    (/\bpolicl[ií]nica\b/i.test(name) &&
      (/\b(municipal|estadual|regional|sus|mulher|p[uú]blica)\b/i.test(name) || hasPublicOperator));

  if (isUbsOrPosto) {
    return {
      kind: 'ubs',
      category: 'saude',
      subcategory: 'UBS / USF / Posto de Saúde (SUS)',
      description:
        'Unidade Básica / Saúde da Família pública próxima ao seu CEP. Oferece consultas médicas e ginecológicas, pré-natal, preventivo (Papanicolau), testes rápidos e acolhimento em saúde mental pelo SUS.',
      accessMode: 'Livre Demanda (Porta Aberta)',
      defaultHours: 'Segunda a Sexta, das 07h às 17h (confirmar na unidade)',
      defaultPhone: '136',
      freeConfirmation: 'Atendimento público e gratuito pelo SUS.',
      tags: ['UBS', 'USF', 'Posto de Saúde', 'SUS Grátis', 'Saúde da Mulher', 'Acolhimento'],
    };
  }

  // 7. UPA / Pronto Atendimento Público
  const isUpa =
    /\b(upa|unidade de pronto atendimento|servi[çc]o de pronto atendimento)\b/i.test(name) ||
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

  // 8. Hospitais e Maternidades Públicas / SUS / Universitárias / Santa Casa / Parto Humanizado
  if (/\b(casa de parto|centro de parto(?: normal| humanizado)?)\b/i.test(name)) {
    return {
      kind: 'hospital',
      category: 'saude',
      subcategory: 'Casa de Parto Humanizado Gratuito (SUS)',
      description:
        'Centro de parto humanizado público/SUS próximo ao seu CEP com pré-natal, parto normal respeitoso e acolhimento à gestante e ao bebê sem custos.',
      accessMode: 'Plantão 24h',
      defaultHours: 'Atendimento 24 horas pelo SUS',
      defaultPhone: '136',
      freeConfirmation: 'Parto humanizado 100% gratuito pelo SUS.',
      tags: ['Parto Humanizado', 'Casa de Parto', 'SUS Grátis', 'Gestante'],
    };
  }

  const isExplicitPublicHospital =
    /\b(hospital municipal|hospital estadual|hospital federal|hospital regional|hospital p[uú]blico|hospital da cidade|hospital universit[aá]rio|hospital das cl[ií]nicas|hospital escola|hospital da mulher|hospital materno|conjunto hospitalar|maternidade municipal|maternidade estadual|maternidade federal|maternidade p[uú]blica|maternidade escola|santa casa)\b/i.test(
      name
    );

  const isPublicGeneralHospital =
    /\bhospital geral\b/i.test(name) ||
    ((amenity === 'hospital' || healthcare === 'hospital' || isVerifiedPublicEntity) &&
      hasPublicOperator &&
      /\bhospital\b/i.test(name));

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
  nwr["amenity"~"hospital|clinic|doctors"](around:20000,${lat},${lng});`;

  const socialAndLegalBlock = `
  nwr["amenity"~"social_facility|courthouse"](around:20000,${lat},${lng});
  nwr["office"="government"](around:20000,${lat},${lng});`;

  const policeBlock = `
  nwr["amenity"="police"](around:30000,${lat},${lng});`;

  const coursesBlock = `
  nwr["amenity"~"college|school|university"]["name"~"(Instituto Federal|ETEC|Centro Vocacional)",i](around:25000,${lat},${lng});`;

  const womenNgoBlock = `
  nwr["office"~"ngo|association"](around:25000,${lat},${lng});`;

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

  return `[out:json][timeout:5];\n(\n${body}\n);\nout center tags 120;\n`;
}

function getNominatimQueriesForScope(
  scope: PublicSearchScope,
  bairro: string | undefined,
  city: string
): string[] {
  switch (scope) {
    case 'juridico':
      return [`Defensoria Pública ${city}`, `CREAS ${city}`, `CRAS ${city}`];
    case 'emergencia':
      return [`Delegacia ${city}`, `Hospital ${city}`, `CRAS ${city}`];
    case 'cursos':
      return [`Instituto Federal ${city}`, `CRAS ${city}`];
    case 'psicologico':
      return [`CAPS ${city}`, bairro ? `UBS ${bairro} ${city}` : `UBS ${city}`, `CRAS ${city}`];
    case 'saude':
      return [bairro ? `UBS ${bairro} ${city}` : `UBS ${city}`, `Hospital ${city}`];
    case 'geral':
    default:
      return [bairro ? `UBS ${bairro} ${city}` : `UBS ${city}`, `Delegacia ${city}`, `CRAS ${city}`];
  }
}

async function queryOverpass(
  endpoint: string,
  query: string,
  timeoutMs = 3500
): Promise<OverpassElement[]> {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
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

  const responses: Array<
    Array<{
      place_id: number;
      display_name?: string;
      name?: string;
      class?: string;
      type?: string;
      lat: string;
      lon: string;
      address?: Record<string, string>;
      extratags?: Record<string, string>;
    }>
  > = [];

  // Pace Nominatim requests gently to respect its rate limits instead of firing a 4-way simultaneous burst
  for (let i = 0; i < Math.min(queries.length, 3); i++) {
    const q = queries[i];
    if (i > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 260));
    }
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 3500);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&extratags=1&countrycodes=br&bounded=1&viewbox=${viewbox}&limit=10&q=${encodeURIComponent(
        q
      )}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) continue;
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('json')) continue;
      const batch = await res.json();
      if (Array.isArray(batch)) {
        responses.push(batch);
      }
    } catch {
      // keep partial results
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

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

function normalizeUnitDedupeKey(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(
      /\b(unidade basica de saude|unidade de saude da familia|unidade de saude|posto de saude|usf|psf)\b/g,
      'ubs'
    )
    .replace(/\b(de|da|do|das|dos)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getPhotonQueriesForScope(
  scope: PublicSearchScope,
  bairro: string | undefined,
  city: string
): string[] {
  const bairroTerm = bairro?.trim();
  const cityTerm = city?.trim();
  const scopedBairro = bairroTerm && cityTerm ? `${bairroTerm} ${cityTerm}` : bairroTerm;
  switch (scope) {
    case 'juridico':
      return [
        cityTerm ? `Defensoria Publica ${cityTerm}` : 'Defensoria Publica',
        cityTerm ? `CREAS ${cityTerm}` : 'CREAS',
        cityTerm ? `CRAS ${cityTerm}` : 'CRAS',
        cityTerm ? `Casa da Mulher ${cityTerm}` : 'Casa da Mulher',
      ];
    case 'emergencia':
      return [
        cityTerm ? `Delegacia ${cityTerm}` : 'Delegacia da Mulher',
        cityTerm ? `Hospital ${cityTerm}` : 'Hospital Municipal',
        cityTerm ? `CRAS ${cityTerm}` : 'CREAS',
        'Delegacia da Mulher',
      ];
    case 'cursos':
      return [
        cityTerm ? `Instituto Federal ${cityTerm}` : 'Instituto Federal',
        cityTerm ? `CRAS ${cityTerm}` : 'CRAS',
        'SINE',
        'ONG Mulher',
      ];
    case 'psicologico':
      return [
        cityTerm ? `CAPS ${cityTerm}` : 'CAPS',
        scopedBairro ? `UBS ${scopedBairro}` : cityTerm ? `UBS ${cityTerm}` : 'Centro de Saude',
        cityTerm ? `Hospital ${cityTerm}` : 'Hospital Municipal',
        cityTerm ? `CRAS ${cityTerm}` : 'CREAS',
      ];
    case 'saude':
      return [
        scopedBairro ? `UBS ${scopedBairro}` : cityTerm ? `UBS ${cityTerm}` : 'Unidade de Saude',
        scopedBairro ? `AMA ${scopedBairro}` : cityTerm ? `Posto de Saude ${cityTerm}` : 'Posto de Saude',
        cityTerm ? `Hospital ${cityTerm}` : 'Hospital Municipal',
        cityTerm ? `Centro de Saude ${cityTerm}` : 'Clinica da Familia',
      ];
    case 'geral':
    default:
      return [
        scopedBairro ? `UBS ${scopedBairro}` : cityTerm ? `UBS ${cityTerm}` : 'Unidade de Saude',
        cityTerm ? `Hospital ${cityTerm}` : 'Hospital Municipal',
        cityTerm ? `CAPS ${cityTerm}` : 'CAPS',
        cityTerm ? `Delegacia ${cityTerm}` : 'CREAS',
      ];
  }
}

async function queryPhotonProximity(
  location: CepInfo,
  userLat: number,
  userLng: number,
  scope: PublicSearchScope
): Promise<{ item: ServiceItem; distanceKm: number }[]> {
  const queries = getPhotonQueriesForScope(scope, location.bairro, location.localidade);
  const found: { item: ServiceItem; distanceKm: number }[] = [];
  const seen = new Set<string>();

  type PhotonFeature = {
    geometry?: { coordinates?: [number, number] };
    properties?: {
      osm_type?: string;
      osm_id?: number;
      osm_key?: string;
      osm_value?: string;
      name?: string;
      street?: string;
      housenumber?: string;
      district?: string;
      locality?: string;
      city?: string;
      postcode?: string;
      countrycode?: string;
    };
  };

  for (let i = 0; i < Math.min(queries.length, 4); i++) {
    if (found.length >= 10) break;
    if (i > 0) {
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }

    const q = queries[i];
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 3500);
    let features: PhotonFeature[] = [];
    try {
      const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(
        q
      )}&lat=${userLat.toFixed(5)}&lon=${userLng.toFixed(5)}&limit=15`;
      const res = await fetch(url, { signal: controller.signal });
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('json')) {
          const json = (await res.json()) as { features?: PhotonFeature[] };
          features = Array.isArray(json.features) ? json.features : [];
        }
      }
    } catch {
      features = [];
    } finally {
      window.clearTimeout(timeoutId);
    }

    for (const f of features) {
      const coords = f.geometry?.coordinates;
      const props = f.properties;
      if (!coords || !props || !props.name) continue;
      if (props.countrycode && props.countrycode.toUpperCase() !== 'BR') continue;

      const [lng, lat] = coords;
      if (typeof lat !== 'number' || typeof lng !== 'number') continue;

      const distanceKm = haversineDistanceKm(userLat, userLng, lat, lng);
      if (distanceKm > MAX_PROXIMITY_KM) continue;

      const name = props.name.trim();
      const pseudoTags: Record<string, string> = {};
      if (props.osm_key && props.osm_value) {
        pseudoTags[props.osm_key] = props.osm_value;
      }

      const classified = classifyFreePublicUnit(name, pseudoTags, props.osm_key);
      if (!classified) continue;

      const norm = normalizeUnitDedupeKey(name);
      if (seen.has(norm)) continue;
      seen.add(norm);

      const streetPart = props.street
        ? props.housenumber
          ? `${props.street}, ${props.housenumber}`
          : props.street
        : '';
      const suburb = (props.locality || props.district || '').trim();
      const city = (props.city || location.localidade).trim();

      found.push({
        distanceKm,
        item: {
          id: `pho-${props.osm_type || 'N'}-${props.osm_id || norm}`,
          name,
          category: classified.category,
          subcategory: classified.subcategory,
          description: classified.description,
          state: location.uf,
          city,
          neighborhood: suburb || undefined,
          address: [streetPart, suburb, `${city} - ${location.uf}`].filter(Boolean).join(' · '),
          cep: props.postcode || undefined,
          lat,
          lng,
          phone: classified.defaultPhone,
          hours: classified.defaultHours,
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

interface CnesPublicUnitPayload {
  cnes: string;
  name: string;
  tipo: number;
  isPublicEntity?: boolean;
  street?: string;
  bairro?: string;
  cep?: string;
  phone?: string;
  hours?: string;
  lat: number;
  lng: number;
  distanceKm: number;
}

function classifyCnesTipoFallback(tipo: number, name: string): {
  category: ServiceCategory;
  subcategory: string;
  description: string;
  accessMode: ServiceItem['accessMode'];
  defaultHours: string;
  tags: string[];
} {
  if (tipo === 70 || tipo === 71) {
    return {
      category: 'psicologico',
      subcategory: tipo === 70 ? 'CAPS · Apoio Psicológico Público (SUS)' : 'Apoio Psicossocial Público (SUS)',
      description:
        'Unidade pública oficial do SUS (CNES/Ministério da Saúde) próxima ao seu CEP para acolhimento gratuito em saúde mental e suporte multiprofissional.',
      accessMode: 'Livre Demanda (Porta Aberta)',
      defaultHours: 'Segunda a Sexta (confirmar horário na unidade)',
      tags: ['CAPS', 'Apoio Psicológico', 'Saúde Mental', 'SUS Grátis'],
    };
  }
  if (tipo === 5 || tipo === 7 || tipo === 15 || tipo === 20 || tipo === 61 || tipo === 73) {
    const isUrgent = tipo === 5 || tipo === 20 || tipo === 73;
    return {
      category: 'saude',
      subcategory:
        tipo === 73
          ? 'UPA / Pronto Atendimento Público (SUS)'
          : tipo === 61
          ? 'Casa de Parto Normal (SUS)'
          : 'Hospital / Unidade Pública (SUS)',
      description:
        'Unidade pública oficial cadastrada no Ministério da Saúde (SUS) próxima ao seu CEP para atendimento médico, urgências, ginecologia e acolhimento gratuito.',
      accessMode: isUrgent ? 'Plantão 24h' : 'Livre Demanda (Porta Aberta)',
      defaultHours: isUrgent ? 'Atendimento de urgência 24 horas pelo SUS' : 'Segunda a Sexta, horário comercial',
      tags: ['Hospital Público', 'SUS Grátis', 'Saúde da Mulher', 'Acolhimento'],
    };
  }

  return {
    category: 'saude',
    subcategory: /policl/i.test(name) ? 'Policlínica Pública (SUS)' : 'UBS / USF / Posto de Saúde (SUS)',
    description:
      'Unidade Básica / Saúde da Família oficial do SUS (CNES) próxima ao seu CEP com consultas, pré-natal, preventivo (Papanicolau) e encaminhamento em saúde mental gratuitos.',
    accessMode: 'Livre Demanda (Porta Aberta)',
    defaultHours: 'Segunda a Sexta, das 07h às 17h',
    tags: ['UBS', 'USF', 'Posto de Saúde', 'SUS Grátis', 'Saúde da Mulher'],
  };
}

async function queryCnesPublicUnits(
  location: CepInfo,
  userLat: number | null,
  userLng: number | null,
  scope: PublicSearchScope
): Promise<{ item: ServiceItem; distanceKm: number }[]> {
  if (scope === 'juridico' || scope === 'cursos') return [];
  if (!location.ibge && (!location.localidade || !location.uf)) return [];

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 9000);
  try {
    const params = new URLSearchParams();
    if (typeof userLat === 'number' && typeof userLng === 'number') {
      params.set('lat', userLat.toFixed(5));
      params.set('lng', userLng.toFixed(5));
    }
    if (location.ibge) params.set('ibge', location.ibge);
    if (location.localidade) params.set('city', location.localidade);
    if (location.uf) params.set('uf', location.uf);

    const res = await fetch(`/api/cnes-public?${params.toString()}`, {
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('json')) return [];
    const json = (await res.json()) as { units?: CnesPublicUnitPayload[] };
    const rows = Array.isArray(json.units) ? json.units : [];

    const hasUserCoords = typeof userLat === 'number' && typeof userLng === 'number';
    const out: { item: ServiceItem; distanceKm: number }[] = [];
    for (const u of rows) {
      const verifiedPublic = Boolean(u.isPublicEntity);
      if (isExcludedPublicPoi(u.name, undefined, undefined, verifiedPublic)) continue;
      const dist = hasUserCoords ? haversineDistanceKm(userLat, userLng, u.lat, u.lng) : 0;
      if (hasUserCoords && dist > MAX_PROXIMITY_KM) continue;

      const textCls = classifyFreePublicUnit(
        u.name,
        verifiedPublic ? { 'operator:type': 'public' } : undefined,
        undefined,
        verifiedPublic
      );
      const fallback = classifyCnesTipoFallback(u.tipo, u.name);
      const category = textCls ? textCls.category : fallback.category;
      const subcategory = textCls ? textCls.subcategory : fallback.subcategory;
      const description = textCls ? textCls.description : fallback.description;
      const accessMode = textCls ? textCls.accessMode : fallback.accessMode;
      const tags = textCls ? textCls.tags : fallback.tags;

      const address = [u.street, u.bairro, `${location.localidade} - ${location.uf}`]
        .filter(Boolean)
        .join(' · ');

      out.push({
        distanceKm: dist,
        item: {
          id: `cnes-${u.cnes}`,
          name: u.name,
          category,
          subcategory,
          description,
          state: location.uf,
          city: location.localidade,
          neighborhood: u.bairro || undefined,
          address,
          cep: u.cep || undefined,
          lat: u.lat,
          lng: u.lng,
          phone: u.phone || '136',
          hours: u.hours || fallback.defaultHours,
          accessMode,
          requiresRegistration: false,
          freeConfirmation: 'Unidade pública oficial cadastrada no Ministério da Saúde (SUS · 100% gratuito).',
          tags,
          tipsForVictim:
            'Unidade oficial do SUS. Em caso de dúvida sobre horário ou atendimento, ligue na unidade ou gratuitamente para 136.',
        },
      });
    }
    return out;
  } catch {
    return [];
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function getMappedDiversityBucket(item: ServiceItem): string {
  const sub = `${item.subcategory} ${item.name}`.toLowerCase();
  if (item.category === 'emergencia') return 'emergencia';
  if (item.category === 'juridico') return 'juridico';
  if (item.category === 'cursos') return 'cursos';
  if (item.category === 'social') return 'ong';
  if (item.category === 'psicologico' || sub.includes('caps')) return 'psicologico';
  if (sub.includes('upa') || sub.includes('hospital') || sub.includes('maternidade') || sub.includes('parto')) {
    return 'hospital';
  }
  return 'ubs';
}

function selectDiverseNearbyUnits(
  mapped: { item: ServiceItem; distanceKm: number }[],
  limit = 45
): ServiceItem[] {
  if (mapped.length <= limit) {
    return mapped.map((m) => m.item);
  }

  const quotas: Record<string, number> = {
    ubs: 10,
    hospital: 8,
    psicologico: 6,
    emergencia: 6,
    juridico: 5,
    cursos: 4,
    ong: 4,
  };
  const counts: Record<string, number> = {};
  const selected: { item: ServiceItem; distanceKm: number }[] = [];
  const usedIds = new Set<string>();

  for (const entry of mapped) {
    const bucket = getMappedDiversityBucket(entry.item);
    const current = counts[bucket] || 0;
    const cap = quotas[bucket] ?? 4;
    if (current < cap) {
      selected.push(entry);
      usedIds.add(entry.item.id);
      counts[bucket] = current + 1;
    }
  }

  for (const entry of mapped) {
    if (selected.length >= limit) break;
    if (usedIds.has(entry.item.id)) continue;
    selected.push(entry);
    usedIds.add(entry.item.id);
  }

  selected.sort((a, b) => a.distanceKm - b.distanceKm);
  return selected.map((s) => s.item);
}

/**
 * Dynamically fetches verified 100%-free public network units & free NGOs across ALL of Brazil
 * within <= 30 km of the searched CEP/city coordinates using CNES (Ministério da Saúde) + OpenStreetMap.
 * Never returns private/paid hospitals or commercial clinics.
 * Zero-PII: only queries public coordinates / municipality IBGE code in memory, never persists user CEP or location.
 */
export async function fetchNearbySusUnits(
  location: CepInfo | null,
  category?: ServiceCategory | 'ongs_apoio' | 'geral'
): Promise<ServiceItem[]> {
  if (!location || typeof window === 'undefined') return [];

  let coords =
    typeof location.lat === 'number' && typeof location.lng === 'number'
      ? { lat: location.lat, lng: location.lng }
      : estimateCoordinatesForCepAndCity(location.cep, location.localidade, location.uf);

  const scope = normalizePublicScope(category);
  const coordKey = coords ? `${coords.lat.toFixed(4)}|${coords.lng.toFixed(4)}` : 'nocoord';
  const cacheKey = `${location.cep}|${location.ibge || ''}|${location.uf}|${coordKey}|${scope}`;
  const cached = nearbyPublicCache.get(cacheKey);
  if (cached) return cached;

  let cnesMapped: { item: ServiceItem; distanceKm: number }[] = [];

  if (!coords) {
    if (!location.ibge && (!location.localidade || !location.uf)) {
      return [];
    }
    // Derive municipal coordinates from official CNES units if all external geocoders timed out
    cnesMapped = await queryCnesPublicUnits(location, null, null, scope);
    const firstWithCoord = cnesMapped.find(
      (c) => typeof c.item.lat === 'number' && typeof c.item.lng === 'number'
    );
    if (firstWithCoord?.item.lat && firstWithCoord.item.lng) {
      coords = { lat: firstWithCoord.item.lat, lng: firstWithCoord.item.lng };
      for (const entry of cnesMapped) {
        if (typeof entry.item.lat === 'number' && typeof entry.item.lng === 'number') {
          entry.distanceKm = haversineDistanceKm(
            coords.lat,
            coords.lng,
            entry.item.lat,
            entry.item.lng
          );
        }
      }
    } else if (cnesMapped.length === 0) {
      return [];
    }
  }

  let elements: OverpassElement[] = [];
  let nomMapped: { item: ServiceItem; distanceKm: number }[] = [];
  let photonMapped: { item: ServiceItem; distanceKm: number }[] = [];

  if (coords) {
    const overpassQuery = buildOverpassQuery(scope, coords.lat, coords.lng);
    const cnesPromise =
      cnesMapped.length > 0
        ? Promise.resolve(cnesMapped)
        : queryCnesPublicUnits(location, coords.lat, coords.lng, scope);
    const overpassPromise = queryOverpass(
      'https://overpass-api.de/api/interpreter',
      overpassQuery,
      3500
    );
    const nominatimPromise = queryNominatimBounded(location, coords.lat, coords.lng, scope);
    const photonPromise = queryPhotonProximity(location, coords.lat, coords.lng, scope);

    [cnesMapped, elements, nomMapped, photonMapped] = await Promise.all([
      cnesPromise,
      overpassPromise,
      nominatimPromise,
      photonPromise,
    ]);
  }

  const mapped: { item: ServiceItem; distanceKm: number }[] = [];
  const seenNames = new Set<string>();

  for (const cnes of cnesMapped) {
    const normName = normalizeUnitDedupeKey(cnes.item.name);
    if (seenNames.has(normName)) continue;
    seenNames.add(normName);
    mapped.push(cnes);
  }

  if (coords) {
    for (const el of elements) {
      const res = mapOverpassElementToService(el, coords.lat, coords.lng, location);
      if (!res) continue;
      const normName = normalizeUnitDedupeKey(res.item.name);
      if (seenNames.has(normName)) continue;
      seenNames.add(normName);
      mapped.push(res);
    }
  }

  for (const nom of nomMapped) {
    const normName = normalizeUnitDedupeKey(nom.item.name);
    if (seenNames.has(normName)) continue;
    seenNames.add(normName);
    mapped.push(nom);
  }

  for (const pho of photonMapped) {
    const normName = normalizeUnitDedupeKey(pho.item.name);
    if (seenNames.has(normName)) continue;
    seenNames.add(normName);
    mapped.push(pho);
  }

  mapped.sort((a, b) => a.distanceKm - b.distanceKm);

  const finalItems = selectDiverseNearbyUnits(mapped, 45);
  if (finalItems.length > 0) {
    nearbyPublicCache.set(cacheKey, finalItems);
  }
  return finalItems;
}

export const fetchNearbyPublicUnits = fetchNearbySusUnits;
