const ALLOWED_CNES_TYPES = new Set([1, 2, 4, 5, 7, 15, 20, 61, 70, 71, 73]);

const EXCLUDED_CNES_NAME_RE =
  /\b(ltda|s\/a|eireli|me\b|epp\b|unimed|hapvida|notredame|interm[eé]dica|amil|bradesco|sulam[eé]rica|prevent senior|rede d['’]?or|mater dei|einstein|s[ií]rio[- ]liban[eê]s|santa izabel|portugu[eê]s|alian[çc]a|oftalmo\w*|olhos|otorrino\w*|ortoped\w*|odont\w*|dent\w*|laborat[oó]rio|diagn[oó]stico|imagem|radiologia|hemodi[aá]lise|est[eé]tica|oncolog\w*|c[aâ]ncer|particular|privad[oa])\b/i;

const PORTUGUESE_LOWER_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'na', 'no', 'nas', 'nos', 'para', 'a', 'o']);

const PORTUGUESE_ACCENT_FIXES: Array<[RegExp, string]> = [
  [/\bsaude\b/gi, 'Saúde'],
  [/\bfamilia\b/gi, 'Família'],
  [/\bbasica\b/gi, 'Básica'],
  [/\bclinica\b/gi, 'Clínica'],
  [/\bclinicas\b/gi, 'Clínicas'],
  [/\bpublica\b/gi, 'Pública'],
  [/\bpublico\b/gi, 'Público'],
  [/\bemergencia\b/gi, 'Emergência'],
  [/\burgencia\b/gi, 'Urgência'],
  [/\bpsicossocial\b/gi, 'Psicossocial'],
  [/\batencao\b/gi, 'Atenção'],
  [/\bregulacao\b/gi, 'Regulação'],
  [/\bpoliclinica\b/gi, 'Policlínica'],
  [/\bsao\b/gi, 'São'],
  [/\bluis\b/gi, 'Luís'],
  [/\bmaranhao\b/gi, 'Maranhão'],
  [/\bbequimao\b/gi, 'Bequimão'],
  [/\bsocorra[oõ]\b/gi, 'Socorrão'],
  [/\balcool\b/gi, 'Álcool'],
  [/\bparaiso\b/gi, 'Paraíso'],
  [/\bjose\b/gi, 'José'],
  [/\bjoao\b/gi, 'João'],
  [/\bantonio\b/gi, 'Antônio'],
  [/\bmaria\b/gi, 'Maria'],
  [/\blucia\b/gi, 'Lúcia'],
  [/\baguas\b/gi, 'Águas'],
  [/\bcatoles\b/gi, 'Catolés'],
  [/\babaira\b/gi, 'Abaíra'],
  [/\bpiata\b/gi, 'Piatã'],
  [/\bmucuge\b/gi, 'Mucugê'],
  [/\bi\b/gi, 'I'],
  [/\bii\b/gi, 'II'],
  [/\biii\b/gi, 'III'],
  [/\biv\b/gi, 'IV'],
  [/\bubs\b/gi, 'UBS'],
  [/\busf\b/gi, 'USF'],
  [/\bpsf\b/gi, 'PSF'],
  [/\bupa\b/gi, 'UPA'],
  [/\bcaps\b/gi, 'CAPS'],
  [/\bnasf\b/gi, 'NASF'],
  [/\bama\b/gi, 'AMA'],
  [/\bsus\b/gi, 'SUS'],
];

function formatPtTitleCase(raw: string): string {
  const words = raw.trim().toLowerCase().split(/\s+/).filter(Boolean);
  let text = words
    .map((word, idx) => {
      if (idx > 0 && PORTUGUESE_LOWER_WORDS.has(word)) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');

  for (const [pattern, replacement] of PORTUGUESE_ACCENT_FIXES) {
    text = text.replace(pattern, (match) => {
      if (replacement === replacement.toUpperCase()) return replacement;
      return match.charAt(0) === match.charAt(0).toLowerCase()
        ? replacement.toLowerCase()
        : replacement;
    });
  }
  return text;
}

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function normalizeCitySlug(city: string): string {
  return city
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

async function resolveIbge6FromCityUf(city?: string, uf?: string): Promise<string | null> {
  if (!city || !uf) return null;
  const slug = normalizeCitySlug(city);
  if (slug.length < 2) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 3000);
  try {
    const res = await fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${encodeURIComponent(slug)}`,
      { signal: ctrl.signal }
    );
    if (!res.ok) return null;
    const payload = await res.json();
    const list = Array.isArray(payload) ? payload : [payload];
    const targetUf = uf.trim().toUpperCase();
    const matched = list.find((item: any) => {
      const itemUf =
        item?.microrregiao?.mesorregiao?.UF?.sigla ||
        item?.['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla;
      return String(itemUf || '').toUpperCase() === targetUf;
    });
    const id = matched?.id ? String(matched.id).replace(/\D/g, '') : '';
    return id.length >= 6 ? id.slice(0, 6) : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

interface CnesRawEstabelecimento {
  codigo_cnes?: number;
  nome_fantasia?: string;
  nome_razao_social?: string;
  codigo_tipo_unidade?: number;
  descricao_esfera_administrativa?: string;
  descricao_natureza_juridica_estabelecimento?: string;
  estabelecimento_faz_atendimento_ambulatorial_sus?: string;
  estabelecimento_possui_atendimento_hospitalar?: number | null;
  codigo_motivo_desabilitacao_estabelecimento?: string | null;
  endereco_estabelecimento?: string;
  numero_estabelecimento?: string;
  bairro_estabelecimento?: string;
  codigo_cep_estabelecimento?: string;
  numero_telefone_estabelecimento?: string;
  descricao_turno_atendimento?: string;
  latitude_estabelecimento_decimo_grau?: number | null;
  longitude_estabelecimento_decimo_grau?: number | null;
}

async function fetchCnesBatch(
  ibge6: string,
  tipoUnidade?: number,
  offset = 0
): Promise<CnesRawEstabelecimento[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const tipoParam = typeof tipoUnidade === 'number' ? `&codigo_tipo_unidade=${tipoUnidade}` : '';
    const url = `https://apidadosabertos.saude.gov.br/cnes/estabelecimentos?codigo_municipio=${ibge6}&status=1${tipoParam}&limit=20&offset=${offset}`;
    const res = await fetch(url, { signal: ctrl.signal });
    if (!res.ok) return [];
    const data = (await res.json()) as { estabelecimentos?: CnesRawEstabelecimento[] };
    return Array.isArray(data.estabelecimentos) ? data.estabelecimentos : [];
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

const EXCLUDED_NAT3_PRIVATE_CHAIN_RE =
  /\b(cassems|einstein|s[ií]rio[- ]liban[eê]s|oswaldo cruz|moinhos de vento|divina provid[eê]ncia|s[aã]o lucas|ordem terceira|benefic[eê]ncia portuguesa|m[aã]e de deus|evang[eé]lico|adventista|israelita|samaritano|portugu[eê]s|real portugu[eê]s|banco de olhos|marcelino champagnat|s[aã]o camilo)\b/i;

const ALLOWED_NAT3_PUBLIC_NAME_RE =
  /\b(santa casa|maternidade|sus\b|hospital municipal|hospital estadual|hospital federal|hospital distrital|hospital regional|hospital p[uú]blico|hospital universit[aá]rio|filantr[oó]pic|ubs\b|usf\b|ama\b|upa\b|caps\b|cl[ií]nica da fam[ií]lia|centro de sa[uú]de|posto de sa[uú]de|unidade b[aá]sica|unidade de sa[uú]de|pronto atendimento)\b/i;

function isStrictFreePublicCnes(e: CnesRawEstabelecimento): boolean {
  if (e.codigo_motivo_desabilitacao_estabelecimento) return false;
  const tipo = Number(e.codigo_tipo_unidade);
  if (!ALLOWED_CNES_TYPES.has(tipo)) return false;

  const lat = Number(e.latitude_estabelecimento_decimo_grau);
  const lng = Number(e.longitude_estabelecimento_decimo_grau);
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    (Math.abs(lat) < 0.0001 && Math.abs(lng) < 0.0001) ||
    lat < -35 ||
    lat > 7 ||
    lng < -75 ||
    lng > -30
  ) {
    return false;
  }

  const nome = `${e.nome_fantasia || ''} ${e.nome_razao_social || ''}`.trim();
  if (!nome || EXCLUDED_CNES_NAME_RE.test(nome)) return false;

  const natJur = String(e.descricao_natureza_juridica_estabelecimento || '').trim();
  const susAmb = String(e.estabelecimento_faz_atendimento_ambulatorial_sus || '').toUpperCase() === 'SIM';
  const hosp = Number(e.estabelecimento_possui_atendimento_hospitalar) === 1;

  if (natJur.startsWith('1')) {
    if ((tipo === 4 || tipo === 7) && !susAmb && !hosp) {
      return /\b(maternidade|mulher|policl[ií]nica|pronto|sa[uú]de)\b/i.test(nome);
    }
    return true;
  }

  // Federal university/public SUS hospitals organized as Empresa Pública (2011 - EBSERH / GHC)
  if (natJur.startsWith('2011') && (susAmb || hosp)) {
    return /\b(universit[aá]ri[oa]|ebserh|hospital escola|maternidade escola|cl[ií]nicas|f[eê]mina|conceic[aã]o|cristo redentor)\b/i.test(
      nome
    );
  }

  if (natJur.startsWith('3')) {
    if (EXCLUDED_NAT3_PRIVATE_CHAIN_RE.test(nome)) return false;
    return (susAmb || hosp) && ALLOWED_NAT3_PUBLIC_NAME_RE.test(nome);
  }

  return false;
}

export interface NormalizedCnesUnit {
  cnes: string;
  name: string;
  tipo: number;
  isPublicEntity: boolean;
  street: string;
  bairro: string;
  cep?: string;
  phone?: string;
  hours?: string;
  lat: number;
  lng: number;
}

const CNES_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const cnesMunicipalityCache = new Map<string, { ts: number; units: NormalizedCnesUnit[] }>();
const inFlightCnesByIbge = new Map<string, Promise<NormalizedCnesUnit[]>>();

async function loadMunicipalityFreePublicUnits(ibge6: string): Promise<NormalizedCnesUnit[]> {
  const cached = cnesMunicipalityCache.get(ibge6);
  if (cached && Date.now() - cached.ts < CNES_CACHE_TTL_MS) {
    return cached.units;
  }

  const existingPromise = inFlightCnesByIbge.get(ibge6);
  if (existingPromise) {
    return existingPromise;
  }

  const task = (async (): Promise<NormalizedCnesUnit[]> => {
    const startMs = Date.now();
    // Wave 1: Query all primary free public establishment types + general catch-all in parallel.
    // Note: In DATASUS CNES Open Data API, `offset` is a 0-indexed PAGE NUMBER (20 rows/page).
    const [all0, t1_0, t2_0, t4_0, t5_0, t7_0, t15_0, t61_0, t70_0, t73_0] = await Promise.all([
      fetchCnesBatch(ibge6, undefined, 0),
      fetchCnesBatch(ibge6, 1, 0),
      fetchCnesBatch(ibge6, 2, 0),
      fetchCnesBatch(ibge6, 4, 0),
      fetchCnesBatch(ibge6, 5, 0),
      fetchCnesBatch(ibge6, 7, 0),
      fetchCnesBatch(ibge6, 15, 0),
      fetchCnesBatch(ibge6, 61, 0),
      fetchCnesBatch(ibge6, 70, 0),
      fetchCnesBatch(ibge6, 73, 0),
    ]);

    const allRows: CnesRawEstabelecimento[] = [
      ...all0,
      ...t1_0,
      ...t2_0,
      ...t4_0,
      ...t5_0,
      ...t7_0,
      ...t15_0,
      ...t61_0,
      ...t70_0,
      ...t73_0,
    ];

    // Wave 2: Only paginate types whose page 0 was full (20 items), respecting a 5.8s soft deadline.
    const extraTasks: Array<{ tipo: number; page: number }> = [];
    if (t5_0.length >= 20) extraTasks.push({ tipo: 5, page: 1 }, { tipo: 5, page: 2 });
    if (t7_0.length >= 20) extraTasks.push({ tipo: 7, page: 1 });
    if (t70_0.length >= 20) extraTasks.push({ tipo: 70, page: 1 }, { tipo: 70, page: 2 });
    if (t73_0.length >= 20) extraTasks.push({ tipo: 73, page: 1 }, { tipo: 73, page: 2 });
    if (t1_0.length >= 20) extraTasks.push({ tipo: 1, page: 1 });

    if (extraTasks.length > 0 && Date.now() - startMs < 5500) {
      const extraRes = await Promise.all(
        extraTasks.map((t) => fetchCnesBatch(ibge6, t.tipo, t.page))
      );
      allRows.push(...extraRes.flat());
    }

    // For large cities with > 20 UBS/USF/AMA units, fetch pages 1..28 in chunks of 10 until a short page is reached.
    if (t2_0.length >= 20) {
      for (let start = 1; start <= 28; start += 10) {
        if (Date.now() - startMs > 5800) break;
        const pages = Array.from(
          { length: Math.min(10, 29 - start) },
          (_, idx) => start + idx
        );
        const batchRes = await Promise.all(pages.map((p) => fetchCnesBatch(ibge6, 2, p)));
        allRows.push(...batchRes.flat());
        if (batchRes.some((arr) => arr.length < 20)) break;
      }
    }

    const deduped = new Map<number, CnesRawEstabelecimento>();
    for (const row of allRows) {
      const code = Number(row.codigo_cnes);
      if (!Number.isFinite(code) || deduped.has(code)) continue;
      if (!isStrictFreePublicCnes(row)) continue;
      deduped.set(code, row);
    }

    const units: NormalizedCnesUnit[] = Array.from(deduped.values()).map((e) => {
      const lat = Number(e.latitude_estabelecimento_decimo_grau);
      const lng = Number(e.longitude_estabelecimento_decimo_grau);
      const tipo = Number(e.codigo_tipo_unidade);
      const rawName = (e.nome_fantasia || e.nome_razao_social || '').trim();
      const street = e.endereco_estabelecimento ? formatPtTitleCase(e.endereco_estabelecimento) : '';
      const num =
        e.numero_estabelecimento && e.numero_estabelecimento !== 'S/N'
          ? `, ${e.numero_estabelecimento}`
          : '';
      const bairro = e.bairro_estabelecimento ? formatPtTitleCase(e.bairro_estabelecimento) : '';
      const rawCep = String(e.codigo_cep_estabelecimento || '').replace(/\D/g, '');
      const cep = rawCep.length === 8 ? `${rawCep.slice(0, 5)}-${rawCep.slice(5)}` : undefined;
      const natJur = String(e.descricao_natureza_juridica_estabelecimento || '').trim();

      return {
        cnes: String(e.codigo_cnes),
        name: formatPtTitleCase(rawName),
        tipo,
        isPublicEntity: natJur.startsWith('1'),
        street: street ? `${street}${num}` : '',
        bairro,
        cep,
        phone: (e.numero_telefone_estabelecimento || '').trim() || undefined,
        hours: e.descricao_turno_atendimento
          ? formatPtTitleCase(e.descricao_turno_atendimento)
          : undefined,
        lat,
        lng,
      };
    });

    // Only cache non-empty results or genuine tiny-city scans so transient network errors don't stick
    if (units.length > 0 || all0.length < 20) {
      cnesMunicipalityCache.set(ibge6, { ts: Date.now(), units });
    }
    return units;
  })();

  inFlightCnesByIbge.set(ibge6, task);
  try {
    return await task;
  } finally {
    inFlightCnesByIbge.delete(ibge6);
  }
}

function getDiversityBucket(tipo: number): 'ubs' | 'caps' | 'hosp' | 'upa' {
  if (tipo === 70 || tipo === 71) return 'caps';
  if (tipo === 73 || tipo === 20) return 'upa';
  if (tipo === 5 || tipo === 7 || tipo === 61 || tipo === 15) return 'hosp';
  return 'ubs';
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const rawIbge = typeof req.query?.ibge === 'string' ? req.query.ibge.replace(/\D/g, '') : '';
  const city = typeof req.query?.city === 'string' ? req.query.city.trim() : '';
  const uf = typeof req.query?.uf === 'string' ? req.query.uf.trim().toUpperCase() : '';
  const userLat = req.query?.lat !== undefined ? Number(req.query.lat) : NaN;
  const userLng = req.query?.lng !== undefined ? Number(req.query.lng) : NaN;

  let ibge6 = rawIbge.length >= 6 ? rawIbge.slice(0, 6) : '';
  if (!ibge6 && city && uf) {
    ibge6 = (await resolveIbge6FromCityUf(city, uf)) || '';
  }

  if (!ibge6) {
    res.status(200).json({ units: [] });
    return;
  }

  const allUnits = await loadMunicipalityFreePublicUnits(ibge6);
  const hasUserCoords = Number.isFinite(userLat) && Number.isFinite(userLng);

  const withinRadius = allUnits
    .map((u) => ({
      ...u,
      distanceKm: hasUserCoords ? haversineKm(userLat, userLng, u.lat, u.lng) : 0,
    }))
    .filter((u) => !hasUserCoords || u.distanceKm <= 30)
    .sort((a, b) => a.distanceKm - b.distanceKm);

  // Reserve top slots across UBS/Posto, CAPS, Hospitals/Maternidades, and UPAs so one category never crowds out others.
  const selected: typeof withinRadius = [];
  const selectedIds = new Set<string>();
  const bucketQuotas: Record<'ubs' | 'caps' | 'hosp' | 'upa', number> = {
    ubs: 10,
    hosp: 6,
    caps: 5,
    upa: 4,
  };
  const bucketCounts: Record<'ubs' | 'caps' | 'hosp' | 'upa', number> = {
    ubs: 0,
    hosp: 0,
    caps: 0,
    upa: 0,
  };

  for (const unit of withinRadius) {
    const bucket = getDiversityBucket(unit.tipo);
    if (bucketCounts[bucket] < bucketQuotas[bucket]) {
      selected.push(unit);
      selectedIds.add(unit.cnes);
      bucketCounts[bucket]++;
    }
  }

  for (const unit of withinRadius) {
    if (selected.length >= 50) break;
    if (selectedIds.has(unit.cnes)) continue;
    selected.push(unit);
    selectedIds.add(unit.cnes);
  }

  selected.sort((a, b) => a.distanceKm - b.distanceKm);

  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.status(200).json({ units: selected });
}
