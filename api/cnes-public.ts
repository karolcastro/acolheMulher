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
  [/\bjose\b/gi, 'José'],
  [/\bjoao\b/gi, 'João'],
  [/\bantonio\b/gi, 'Antônio'],
  [/\bmaria\b/gi, 'Maria'],
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

async function fetchCnesBatch(ibge6: string, tipoUnidade?: number, limit = 100): Promise<CnesRawEstabelecimento[]> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4500);
  try {
    const tipoParam = typeof tipoUnidade === 'number' ? `&codigo_tipo_unidade=${tipoUnidade}` : '';
    const url = `https://apidadosabertos.saude.gov.br/cnes/estabelecimentos?codigo_municipio=${ibge6}&status=1${tipoParam}&limit=${limit}&offset=0`;
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

function isStrictFreePublicCnes(e: CnesRawEstabelecimento): boolean {
  if (e.codigo_motivo_desabilitacao_estabelecimento) return false;
  const tipo = Number(e.codigo_tipo_unidade);
  if (!ALLOWED_CNES_TYPES.has(tipo)) return false;

  const lat = Number(e.latitude_estabelecimento_decimo_grau);
  const lng = Number(e.longitude_estabelecimento_decimo_grau);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) < 0.1 || Math.abs(lng) < 0.1) {
    return false;
  }

  const nome = `${e.nome_fantasia || ''} ${e.nome_razao_social || ''}`.trim();
  if (!nome || EXCLUDED_CNES_NAME_RE.test(nome)) return false;

  const natJur = String(e.descricao_natureza_juridica_estabelecimento || '').trim();
  const susAmb = String(e.estabelecimento_faz_atendimento_ambulatorial_sus || '').toUpperCase() === 'SIM';
  const hosp = Number(e.estabelecimento_possui_atendimento_hospitalar) === 1;

  if (natJur.startsWith('1')) {
    if ((tipo === 4 || tipo === 7) && !susAmb && !hosp) {
      return false;
    }
    return true;
  }

  if (natJur.startsWith('3')) {
    return (
      (susAmb || hosp) &&
      /\b(santa casa|maternidade|sus|hospital municipal|hospital estadual|hospital universit[aá]rio|filantr[oó]pic)\b/i.test(
        nome
      )
    );
  }

  return false;
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

  const initialBatch = await fetchCnesBatch(ibge6, undefined, 100);
  const allRows: CnesRawEstabelecimento[] = [...initialBatch];

  // Larger municipalities (>100 CNES records) also query core free SUS unit types explicitly
  if (initialBatch.length >= 100) {
    const [ubsRows, capsRows, hospRows, upaRows, partoRows] = await Promise.all([
      fetchCnesBatch(ibge6, 2, 100),
      fetchCnesBatch(ibge6, 70, 50),
      fetchCnesBatch(ibge6, 5, 50),
      fetchCnesBatch(ibge6, 73, 30),
      fetchCnesBatch(ibge6, 61, 20),
    ]);
    allRows.push(...ubsRows, ...capsRows, ...hospRows, ...upaRows, ...partoRows);
  }

  const deduped = new Map<number, CnesRawEstabelecimento>();
  for (const row of allRows) {
    const code = Number(row.codigo_cnes);
    if (!Number.isFinite(code) || deduped.has(code)) continue;
    if (!isStrictFreePublicCnes(row)) continue;
    deduped.set(code, row);
  }

  const hasUserCoords = Number.isFinite(userLat) && Number.isFinite(userLng);

  const units = Array.from(deduped.values())
    .map((e) => {
      const lat = Number(e.latitude_estabelecimento_decimo_grau);
      const lng = Number(e.longitude_estabelecimento_decimo_grau);
      const distanceKm = hasUserCoords ? haversineKm(userLat, userLng, lat, lng) : 0;
      const tipo = Number(e.codigo_tipo_unidade);
      const rawName = (e.nome_fantasia || e.nome_razao_social || '').trim();
      const street = e.endereco_estabelecimento ? formatPtTitleCase(e.endereco_estabelecimento) : '';
      const num = e.numero_estabelecimento && e.numero_estabelecimento !== 'S/N' ? `, ${e.numero_estabelecimento}` : '';
      const bairro = e.bairro_estabelecimento ? formatPtTitleCase(e.bairro_estabelecimento) : '';
      const rawCep = String(e.codigo_cep_estabelecimento || '').replace(/\D/g, '');
      const cep = rawCep.length === 8 ? `${rawCep.slice(0, 5)}-${rawCep.slice(5)}` : undefined;

      return {
        cnes: String(e.codigo_cnes),
        name: formatPtTitleCase(rawName),
        tipo,
        street: street ? `${street}${num}` : '',
        bairro,
        cep,
        phone: (e.numero_telefone_estabelecimento || '').trim() || undefined,
        hours: e.descricao_turno_atendimento ? formatPtTitleCase(e.descricao_turno_atendimento) : undefined,
        lat,
        lng,
        distanceKm,
      };
    })
    .filter((u) => !hasUserCoords || u.distanceKm <= 30)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, 35);

  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.status(200).json({ units });
}
