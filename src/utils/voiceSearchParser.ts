import { AppSection, CepInfo } from '../types';
import { estimateCoordinatesForCepAndCity } from './cepProximity';

const WORD_TO_DIGIT: Record<string, string> = {
  zero: '0',
  um: '1',
  uma: '1',
  hum: '1',
  dois: '2',
  duas: '2',
  tres: '3',
  quatro: '4',
  cinco: '5',
  seis: '6',
  meia: '6',
  sete: '7',
  oito: '8',
  nove: '9',
};

const TENS_TO_NUMBER: Record<string, number> = {
  dez: 10,
  onze: 11,
  doze: 12,
  treze: 13,
  quatorze: 14,
  catorze: 14,
  quinze: 15,
  dezesseis: 16,
  dezessete: 17,
  dezoito: 18,
  dezenove: 19,
  vinte: 20,
  trinta: 30,
  quarenta: 40,
  cinquenta: 50,
  sessenta: 60,
  setenta: 70,
  oitenta: 80,
  noventa: 90,
};

interface KnownLocation {
  aliases: string[];
  localidade: string;
  uf: string;
  cep: string;
  ddd: string;
}

const KNOWN_CITIES: KnownLocation[] = [
  { aliases: ['sao paulo', 'sp', 'capital paulista', 'sampa'], localidade: 'São Paulo', uf: 'SP', cep: '01001-000', ddd: '11' },
  { aliases: ['campinas'], localidade: 'Campinas', uf: 'SP', cep: '13010-000', ddd: '19' },
  { aliases: ['guarulhos'], localidade: 'Guarulhos', uf: 'SP', cep: '07010-000', ddd: '11' },
  { aliases: ['santos'], localidade: 'Santos', uf: 'SP', cep: '11010-000', ddd: '13' },
  { aliases: ['osasco'], localidade: 'Osasco', uf: 'SP', cep: '06010-000', ddd: '11' },
  { aliases: ['santo andre'], localidade: 'Santo André', uf: 'SP', cep: '09010-000', ddd: '11' },
  { aliases: ['sao bernardo', 'sao bernardo do campo'], localidade: 'São Bernardo do Campo', uf: 'SP', cep: '09710-000', ddd: '11' },
  { aliases: ['sorocaba'], localidade: 'Sorocaba', uf: 'SP', cep: '18010-000', ddd: '15' },
  { aliases: ['ribeirao preto'], localidade: 'Ribeirão Preto', uf: 'SP', cep: '14010-000', ddd: '16' },
  { aliases: ['sao jose dos campos'], localidade: 'São José dos Campos', uf: 'SP', cep: '12210-000', ddd: '12' },
  { aliases: ['bauru'], localidade: 'Bauru', uf: 'SP', cep: '17010-000', ddd: '14' },
  { aliases: ['rio de janeiro', 'rio', 'rj'], localidade: 'Rio de Janeiro', uf: 'RJ', cep: '20040-002', ddd: '21' },
  { aliases: ['niteroi'], localidade: 'Niterói', uf: 'RJ', cep: '24020-000', ddd: '21' },
  { aliases: ['duque de caxias'], localidade: 'Duque de Caxias', uf: 'RJ', cep: '25010-000', ddd: '21' },
  { aliases: ['nova iguacu'], localidade: 'Nova Iguaçu', uf: 'RJ', cep: '26210-000', ddd: '21' },
  { aliases: ['sao goncalo'], localidade: 'São Gonçalo', uf: 'RJ', cep: '24410-000', ddd: '21' },
  { aliases: ['campos dos goytacazes', 'campos'], localidade: 'Campos dos Goytacazes', uf: 'RJ', cep: '28010-000', ddd: '22' },
  { aliases: ['salvador', 'ba', 'bahia'], localidade: 'Salvador', uf: 'BA', cep: '40285-001', ddd: '71' },
  { aliases: ['feira de santana'], localidade: 'Feira de Santana', uf: 'BA', cep: '44001-000', ddd: '75' },
  { aliases: ['vitoria da conquista'], localidade: 'Vitória da Conquista', uf: 'BA', cep: '45000-000', ddd: '77' },
  { aliases: ['camacari'], localidade: 'Camaçari', uf: 'BA', cep: '42800-000', ddd: '71' },
  { aliases: ['brasilia', 'df', 'distrito federal', 'ceilandia', 'taguatinga'], localidade: 'Brasília', uf: 'DF', cep: '72225-010', ddd: '61' },
  { aliases: ['belo horizonte', 'bh', 'mg', 'minas gerais'], localidade: 'Belo Horizonte', uf: 'MG', cep: '30130-100', ddd: '31' },
  { aliases: ['uberlandia'], localidade: 'Uberlândia', uf: 'MG', cep: '38400-000', ddd: '34' },
  { aliases: ['contagem'], localidade: 'Contagem', uf: 'MG', cep: '32010-000', ddd: '31' },
  { aliases: ['juiz de fora'], localidade: 'Juiz de Fora', uf: 'MG', cep: '36010-000', ddd: '32' },
  { aliases: ['montes claros'], localidade: 'Montes Claros', uf: 'MG', cep: '39400-000', ddd: '38' },
  { aliases: ['recife', 'pe', 'pernambuco'], localidade: 'Recife', uf: 'PE', cep: '50060-000', ddd: '81' },
  { aliases: ['olinda'], localidade: 'Olinda', uf: 'PE', cep: '53020-000', ddd: '81' },
  { aliases: ['jaboatao', 'jaboatao dos guararapes'], localidade: 'Jaboatão dos Guararapes', uf: 'PE', cep: '54110-000', ddd: '81' },
  { aliases: ['caruaru'], localidade: 'Caruaru', uf: 'PE', cep: '55002-000', ddd: '81' },
  { aliases: ['petrolina'], localidade: 'Petrolina', uf: 'PE', cep: '56302-000', ddd: '87' },
  { aliases: ['curitiba', 'pr', 'parana'], localidade: 'Curitiba', uf: 'PR', cep: '80035-050', ddd: '41' },
  { aliases: ['londrina'], localidade: 'Londrina', uf: 'PR', cep: '86010-000', ddd: '43' },
  { aliases: ['maringa'], localidade: 'Maringá', uf: 'PR', cep: '87010-000', ddd: '44' },
  { aliases: ['foz do iguacu'], localidade: 'Foz do Iguaçu', uf: 'PR', cep: '85851-000', ddd: '45' },
  { aliases: ['porto alegre', 'rs', 'rio grande do sul'], localidade: 'Porto Alegre', uf: 'RS', cep: '90010-000', ddd: '51' },
  { aliases: ['caxias do sul'], localidade: 'Caxias do Sul', uf: 'RS', cep: '95010-000', ddd: '54' },
  { aliases: ['pelotas'], localidade: 'Pelotas', uf: 'RS', cep: '96010-000', ddd: '53' },
  { aliases: ['canoas'], localidade: 'Canoas', uf: 'RS', cep: '92010-000', ddd: '51' },
  { aliases: ['belem', 'pa', 'para'], localidade: 'Belém', uf: 'PA', cep: '66090-000', ddd: '91' },
  { aliases: ['ananindeua'], localidade: 'Ananindeua', uf: 'PA', cep: '67010-000', ddd: '91' },
  { aliases: ['santarem'], localidade: 'Santarém', uf: 'PA', cep: '68005-000', ddd: '93' },
  { aliases: ['fortaleza', 'ce', 'ceara'], localidade: 'Fortaleza', uf: 'CE', cep: '60025-000', ddd: '85' },
  { aliases: ['caucaia'], localidade: 'Caucaia', uf: 'CE', cep: '61600-000', ddd: '85' },
  { aliases: ['juazeiro do norte'], localidade: 'Juazeiro do Norte', uf: 'CE', cep: '63010-000', ddd: '88' },
  { aliases: ['manaus', 'am', 'amazonas'], localidade: 'Manaus', uf: 'AM', cep: '69005-000', ddd: '92' },
  { aliases: ['goiania', 'go', 'goias'], localidade: 'Goiânia', uf: 'GO', cep: '74003-010', ddd: '62' },
  { aliases: ['aparecida de goiania'], localidade: 'Aparecida de Goiânia', uf: 'GO', cep: '74910-000', ddd: '62' },
  { aliases: ['anapolis'], localidade: 'Anápolis', uf: 'GO', cep: '75020-000', ddd: '62' },
  { aliases: ['florianopolis', 'floripa', 'sc', 'santa catarina'], localidade: 'Florianópolis', uf: 'SC', cep: '88010-000', ddd: '48' },
  { aliases: ['joinville'], localidade: 'Joinville', uf: 'SC', cep: '89201-000', ddd: '47' },
  { aliases: ['blumenau'], localidade: 'Blumenau', uf: 'SC', cep: '89010-000', ddd: '47' },
  { aliases: ['vitoria', 'es', 'espirito santo'], localidade: 'Vitória', uf: 'ES', cep: '29010-000', ddd: '27' },
  { aliases: ['vila velha'], localidade: 'Vila Velha', uf: 'ES', cep: '29100-000', ddd: '27' },
  { aliases: ['serra'], localidade: 'Serra', uf: 'ES', cep: '29160-000', ddd: '27' },
  { aliases: ['natal', 'rn', 'rio grande do norte'], localidade: 'Natal', uf: 'RN', cep: '59010-000', ddd: '84' },
  { aliases: ['mossoro'], localidade: 'Mossoró', uf: 'RN', cep: '59600-000', ddd: '84' },
  { aliases: ['maceio', 'al', 'alagoas'], localidade: 'Maceió', uf: 'AL', cep: '57020-000', ddd: '82' },
  { aliases: ['sao luis', 'ma', 'maranhao'], localidade: 'São Luís', uf: 'MA', cep: '65010-000', ddd: '98' },
  { aliases: ['imperatriz'], localidade: 'Imperatriz', uf: 'MA', cep: '65900-000', ddd: '99' },
  { aliases: ['joao pessoa', 'pb', 'paraiba'], localidade: 'João Pessoa', uf: 'PB', cep: '58010-000', ddd: '83' },
  { aliases: ['campina grande'], localidade: 'Campina Grande', uf: 'PB', cep: '58400-000', ddd: '83' },
  { aliases: ['teresina', 'pi', 'piaui'], localidade: 'Teresina', uf: 'PI', cep: '64000-000', ddd: '86' },
  { aliases: ['aracaju', 'se', 'sergipe'], localidade: 'Aracaju', uf: 'SE', cep: '49010-000', ddd: '79' },
  { aliases: ['campo grande', 'ms', 'mato grosso do sul'], localidade: 'Campo Grande', uf: 'MS', cep: '79002-000', ddd: '67' },
  { aliases: ['cuiaba', 'mt', 'mato grosso'], localidade: 'Cuiabá', uf: 'MT', cep: '78005-000', ddd: '65' },
  { aliases: ['palmas', 'to', 'tocantins'], localidade: 'Palmas', uf: 'TO', cep: '77001-000', ddd: '63' },
  { aliases: ['porto velho', 'ro', 'rondonia'], localidade: 'Porto Velho', uf: 'RO', cep: '76801-000', ddd: '69' },
  { aliases: ['macapa', 'ap', 'amapa'], localidade: 'Macapá', uf: 'AP', cep: '68900-000', ddd: '96' },
  { aliases: ['boa vista', 'rr', 'roraima'], localidade: 'Boa Vista', uf: 'RR', cep: '69301-000', ddd: '95' },
  { aliases: ['rio branco', 'ac', 'acre'], localidade: 'Rio Branco', uf: 'AC', cep: '69900-000', ddd: '68' },
];

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

export function formatCep(digits: string): string {
  const clean = digits.replace(/\D/g, '').slice(0, 8);
  if (clean.length > 5) {
    return `${clean.slice(0, 5)}-${clean.slice(5)}`;
  }
  return clean;
}

/**
 * Extracts CEP digits from spoken Portuguese transcripts, including number words
 * like "zero um zero zero um meia zero zero" or "vinte e quatro".
 */
export function extractCepDigitsFromSpeech(transcript: string): string {
  const normalized = normalizeText(transcript).replace(/[-.,/]/g, ' ');
  const tokens = normalized.split(/\s+/).filter(Boolean);

  let digits = '';
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    if (/^\d+$/.test(token)) {
      digits += token;
      continue;
    }

    if (WORD_TO_DIGIT[token] !== undefined) {
      digits += WORD_TO_DIGIT[token];
      continue;
    }

    if (TENS_TO_NUMBER[token] !== undefined) {
      let val = TENS_TO_NUMBER[token];
      if (
        val >= 20 &&
        tokens[i + 1] === 'e' &&
        tokens[i + 2] &&
        WORD_TO_DIGIT[tokens[i + 2]] !== undefined
      ) {
        val += Number(WORD_TO_DIGIT[tokens[i + 2]]);
        i += 2;
      }
      digits += String(val);
    }
  }

  return digits;
}

export function detectSectionIntent(transcript: string): AppSection | undefined {
  const norm = normalizeText(transcript);

  if (
    /\b(emergencia|socorro|perigo|delegacia|deam|violencia|agress\w*|abrigo|policia|180|190|protecao|proteger|medo|ameac\w*|bater|apanh\w*|denuncia\w*)\b/.test(
      norm
    )
  ) {
    return 'emergencia';
  }
  if (
    /\b(psicolog\w*|emocional|terapia|cvv|ansiedade|escuta|depress\w*|triste\w*|desabaf\w*|sozinha|conversar)\b/.test(
      norm
    )
  ) {
    return 'psicologico';
  }
  if (
    /\b(advogad\w*|juridic\w*|defensoria|medida protetiva|protetiva|pensao|divorcio|guarda|separac\w*|processo|justica|lei)\b/.test(
      norm
    )
  ) {
    return 'juridico';
  }
  if (
    /\b(saude|parto|exame\w*|mamografia|papanicolau|sus|hospital|ginecolog\w*|prenatal|pre natal|gravida|gestante|bebe|ultrassom|ubs|posto|remedio|consulta|medico)\b/.test(
      norm
    )
  ) {
    return 'saude';
  }
  if (
    /\b(curso\w*|capacitac\w*|renda|emprego|trabalho|empreender|tecnologia|estudar|aprender|profissao|oficina)\b/.test(
      norm
    )
  ) {
    return 'cursos';
  }
  if (/\b(ong|ongs|voluntari\w*|coletivo\w*|doacao|cesta|alimento\w*)\b/.test(norm)) {
    return 'ongs_apoio';
  }

  return undefined;
}

export function findKnownCity(transcript: string): KnownLocation | undefined {
  const norm = normalizeText(transcript);
  if (!norm) return undefined;

  let bestMatch: KnownLocation | undefined;
  let bestLength = 0;

  for (const city of KNOWN_CITIES) {
    for (const alias of city.aliases) {
      const regex = new RegExp(`\\b${alias.replace(/\s+/g, '\\s+')}\\b`, 'i');
      if (regex.test(norm) && alias.length > bestLength) {
        bestMatch = city;
        bestLength = alias.length;
      }
    }
  }

  return bestMatch;
}

export interface LocationResolutionResult {
  cepInfo?: CepInfo;
  formattedInput?: string;
  suggestedSection?: AppSection;
  error?: string;
}

async function geocodeBrazilPlace(query: string): Promise<{ lat: number; lng: number } | null> {
  if (typeof window === 'undefined') return null;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 2200);
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&countrycodes=br&limit=1&q=${encodeURIComponent(
        query
      )}`,
      { signal: controller.signal }
    );
    if (!res.ok) return null;
    const arr = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const lat = Number(arr[0]?.lat);
    const lng = Number(arr[0]?.lon);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
    return null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

function parseValidCoord(raw: unknown): number | undefined {
  if (raw === null || raw === undefined || raw === '') return undefined;
  const num = Number(raw);
  if (!Number.isFinite(num) || Math.abs(num) < 0.01) return undefined;
  return num;
}

async function geocodeCepAddress(
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

export async function resolveLocationQuery(rawQuery: string): Promise<LocationResolutionResult> {
  const trimmed = rawQuery.trim();
  const suggestedSection = detectSectionIntent(trimmed);

  // 1. Check for spoken/typed 8-digit CEP
  const spokenDigits = extractCepDigitsFromSpeech(trimmed);
  if (spokenDigits.length === 8) {
    const formatted = formatCep(spokenDigits);
    try {
      const brasilApiPromise = (async (): Promise<{ lat?: number; lng?: number; fallbackData?: any }> => {
        try {
          const ctrl = new AbortController();
          const t = window.setTimeout(() => ctrl.abort(), 2500);
          const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${spokenDigits}`, { signal: ctrl.signal });
          window.clearTimeout(t);
          if (!r.ok) return {};
          const j = await r.json();
          return {
            lat: parseValidCoord(j?.location?.coordinates?.latitude),
            lng: parseValidCoord(j?.location?.coordinates?.longitude),
            fallbackData: j,
          };
        } catch {
          return {};
        }
      })();

      const viaCepPromise = fetch(`https://viacep.com.br/ws/${spokenDigits}/json/`)
        .then((r) => (r.ok ? r.json() : { erro: true }))
        .catch(() => ({ erro: true }));

      const [data, geoExtra] = await Promise.all([viaCepPromise, brasilApiPromise]);

      if (data.erro && !geoExtra.fallbackData?.city) {
        return {
          formattedInput: formatted,
          suggestedSection,
          error: 'CEP não encontrado. Verifique os números ou fale o nome da sua cidade.',
        };
      }

      const city = (data.localidade || geoExtra.fallbackData?.city || '').trim();
      const uf = (data.uf || geoExtra.fallbackData?.state || '').trim();
      const street = (data.logradouro || geoExtra.fallbackData?.street || '').trim();
      const neighborhood = (data.bairro || geoExtra.fallbackData?.neighborhood || '').trim();
      const estimated = estimateCoordinatesForCepAndCity(formatted, city, uf);

      // Ignore BrasilAPI's bogus Praça da Sé coordinate returned for unrelated São Paulo CEPs
      const isBogusPracaDaSeCoord =
        typeof geoExtra.lat === 'number' &&
        typeof geoExtra.lng === 'number' &&
        !spokenDigits.startsWith('010') &&
        Math.abs(geoExtra.lat - -23.5475) < 0.005 &&
        Math.abs(geoExtra.lng - -46.63611) < 0.005;

      const validBrasilApiCoords =
        typeof geoExtra.lat === 'number' &&
        typeof geoExtra.lng === 'number' &&
        !isBogusPracaDaSeCoord
          ? { lat: geoExtra.lat, lng: geoExtra.lng }
          : null;

      // IMPORTANT:
      // - For street-level CEPs, geocode street/bairro via Nominatim first so every CEP searches its exact neighborhood.
      // - If Nominatim street/bairro isn't found, use valid BrasilAPI coords or geocode the exact city+UF (never default an interior town to a capital).
      const geocodedStreetOrBairro = await geocodeCepAddress(street, neighborhood, city, uf);
      const geocodedCity =
        !geocodedStreetOrBairro && !validBrasilApiCoords && city && uf
          ? await geocodeBrazilPlace(`${city}, ${uf}, Brasil`)
          : null;

      const resolvedLat =
        geocodedStreetOrBairro?.lat ??
        (spokenDigits.startsWith('0') ? estimated?.lat : undefined) ??
        validBrasilApiCoords?.lat ??
        geocodedCity?.lat ??
        estimated?.lat;
      const resolvedLng =
        geocodedStreetOrBairro?.lng ??
        (spokenDigits.startsWith('0') ? estimated?.lng : undefined) ??
        validBrasilApiCoords?.lng ??
        geocodedCity?.lng ??
        estimated?.lng;

      const rawIbge =
        typeof data.ibge === 'string'
          ? data.ibge.replace(/\D/g, '')
          : typeof geoExtra.fallbackData?.ibge === 'string'
          ? geoExtra.fallbackData.ibge.replace(/\D/g, '')
          : '';

      return {
        cepInfo: {
          cep: data.cep || formatted,
          logradouro: street,
          bairro: neighborhood,
          localidade: city,
          uf,
          ddd: data.ddd,
          ibge: rawIbge.length >= 6 ? rawIbge : undefined,
          lat: resolvedLat,
          lng: resolvedLng,
        },
        formattedInput: formatted,
        suggestedSection,
      };
    } catch {
      return {
        formattedInput: formatted,
        suggestedSection,
        error: 'Não foi possível verificar o CEP agora. Tente falar o nome da sua cidade.',
      };
    }
  }

  // 2. Check for known Brazilian city or state spoken/typed
  const matchedCity = findKnownCity(trimmed);
  if (matchedCity) {
    const estimated = estimateCoordinatesForCepAndCity(
      matchedCity.cep,
      matchedCity.localidade,
      matchedCity.uf
    );
    return {
      cepInfo: {
        cep: matchedCity.cep,
        logradouro: '',
        bairro: '',
        localidade: matchedCity.localidade,
        uf: matchedCity.uf,
        ddd: matchedCity.ddd,
        lat: estimated?.lat,
        lng: estimated?.lng,
      },
      formattedInput: `${matchedCity.localidade} - ${matchedCity.uf}`,
      suggestedSection,
    };
  }

  // 3. Fallback: try IBGE official Brazilian municipalities endpoint for any city name
  if (!suggestedSection && spokenDigits.length === 0 && /^[a-zA-ZÀ-ÿ\s-]{3,50}$/.test(trimmed)) {
    const slug = normalizeText(trimmed)
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');
    if (slug.length >= 3) {
      try {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 3000);
        const ibgeRes = await fetch(
          `https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${encodeURIComponent(slug)}`,
          { signal: controller.signal }
        );
        window.clearTimeout(timeoutId);
        if (ibgeRes.ok) {
          const payload = await ibgeRes.json();
          const cityObj = Array.isArray(payload) ? payload[0] : payload;
          const ufSigla =
            cityObj?.microrregiao?.mesorregiao?.UF?.sigla ||
            cityObj?.['regiao-imediata']?.['regiao-intermediaria']?.UF?.sigla;
          if (cityObj?.nome && ufSigla) {
            const geocoded = await geocodeBrazilPlace(`${cityObj.nome}, ${ufSigla}, Brasil`);
            const estimated = estimateCoordinatesForCepAndCity(undefined, cityObj.nome, ufSigla);
            const rawIbge = cityObj?.id ? String(cityObj.id).replace(/\D/g, '') : '';
            return {
              cepInfo: {
                cep: '00000-000',
                logradouro: '',
                bairro: '',
                localidade: cityObj.nome,
                uf: ufSigla,
                ibge: rawIbge.length >= 6 ? rawIbge : undefined,
                lat: geocoded?.lat ?? estimated?.lat,
                lng: geocoded?.lng ?? estimated?.lng,
              },
              formattedInput: `${cityObj.nome} - ${ufSigla}`,
              suggestedSection,
            };
          }
        }
      } catch {
        // Fallback smoothly if offline or timeout
      }
    }
  }

  // 4. If user only expressed an emergency/service intent without a CEP or city
  if (suggestedSection) {
    return {
      formattedInput: trimmed,
      suggestedSection,
    };
  }

  // 5. Partial digits or unrecognized place
  if (spokenDigits.length > 0 && spokenDigits.length < 8) {
    return {
      formattedInput: formatCep(spokenDigits),
      error: 'Digite ou fale os 8 números do CEP (ex: 01001-000) ou o nome da sua cidade.',
    };
  }

  return {
    formattedInput: trimmed,
    error: 'Não encontramos essa cidade pelo nome. Digite os 8 números do seu CEP para localizar qualquer município do Brasil.',
  };
}
