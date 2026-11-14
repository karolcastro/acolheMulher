import { AppSection, CepInfo } from '../types';

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
  { aliases: ['rio de janeiro', 'rio', 'rj'], localidade: 'Rio de Janeiro', uf: 'RJ', cep: '20040-002', ddd: '21' },
  { aliases: ['niteroi'], localidade: 'Niterói', uf: 'RJ', cep: '24020-000', ddd: '21' },
  { aliases: ['salvador', 'ba', 'bahia'], localidade: 'Salvador', uf: 'BA', cep: '40285-001', ddd: '71' },
  { aliases: ['brasilia', 'df', 'distrito federal', 'ceilandia', 'taguatinga'], localidade: 'Brasília', uf: 'DF', cep: '72225-010', ddd: '61' },
  { aliases: ['belo horizonte', 'bh', 'mg', 'minas gerais'], localidade: 'Belo Horizonte', uf: 'MG', cep: '30130-100', ddd: '31' },
  { aliases: ['recife', 'pe', 'pernambuco'], localidade: 'Recife', uf: 'PE', cep: '50060-000', ddd: '81' },
  { aliases: ['curitiba', 'pr', 'parana'], localidade: 'Curitiba', uf: 'PR', cep: '80035-050', ddd: '41' },
  { aliases: ['porto alegre', 'rs', 'rio grande do sul'], localidade: 'Porto Alegre', uf: 'RS', cep: '90010-000', ddd: '51' },
  { aliases: ['belem', 'pa', 'para'], localidade: 'Belém', uf: 'PA', cep: '66090-000', ddd: '91' },
  { aliases: ['fortaleza', 'ce', 'ceara'], localidade: 'Fortaleza', uf: 'CE', cep: '60025-000', ddd: '85' },
  { aliases: ['manaus', 'am', 'amazonas'], localidade: 'Manaus', uf: 'AM', cep: '69005-000', ddd: '92' },
  { aliases: ['goiania', 'go', 'goias'], localidade: 'Goiânia', uf: 'GO', cep: '74003-010', ddd: '62' },
  { aliases: ['florianopolis', 'floripa', 'sc', 'santa catarina'], localidade: 'Florianópolis', uf: 'SC', cep: '88010-000', ddd: '48' },
  { aliases: ['vitoria', 'es', 'espirito santo'], localidade: 'Vitória', uf: 'ES', cep: '29010-000', ddd: '27' },
  { aliases: ['natal', 'rn', 'rio grande do norte'], localidade: 'Natal', uf: 'RN', cep: '59010-000', ddd: '84' },
  { aliases: ['maceio', 'al', 'alagoas'], localidade: 'Maceió', uf: 'AL', cep: '57020-000', ddd: '82' },
  { aliases: ['sao luis', 'ma', 'maranhao'], localidade: 'São Luís', uf: 'MA', cep: '65010-000', ddd: '98' },
  { aliases: ['joao pessoa', 'pb', 'paraiba'], localidade: 'João Pessoa', uf: 'PB', cep: '58010-000', ddd: '83' },
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
    /\b(emergencia|socorro|perigo|delegacia|deam|violencia|agressao|abrigo|policia|180|190|protecao)\b/.test(
      norm
    )
  ) {
    return 'emergencia';
  }
  if (/\b(psicolog\w*|emocional|terapia|cvv|ansiedade|escuta)\b/.test(norm)) {
    return 'psicologico';
  }
  if (/\b(advogad\w*|juridic\w*|defensoria|medida protetiva|pensao|divorcio|guarda)\b/.test(norm)) {
    return 'juridico';
  }
  if (/\b(saude|parto|exame|mamografia|papanicolau|sus|hospital|ginecolog\w*|prenatal|pre natal)\b/.test(norm)) {
    return 'saude';
  }
  if (/\b(curso\w*|capacitacao|renda|emprego|trabalho|empreender|tecnologia)\b/.test(norm)) {
    return 'cursos';
  }
  if (/\b(ong|ongs|voluntari\w*)\b/.test(norm)) {
    return 'ongs_apoio';
  }

  return undefined;
}

export function findKnownCity(transcript: string): KnownLocation | undefined {
  const norm = normalizeText(transcript);
  if (!norm) return undefined;

  // Prefer longest alias match so "rio de janeiro" beats "rio"
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

export async function resolveLocationQuery(rawQuery: string): Promise<LocationResolutionResult> {
  const trimmed = rawQuery.trim();
  const suggestedSection = detectSectionIntent(trimmed);

  // 1. Check for spoken/typed 8-digit CEP
  const spokenDigits = extractCepDigitsFromSpeech(trimmed);
  if (spokenDigits.length === 8) {
    const formatted = formatCep(spokenDigits);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${spokenDigits}/json/`);
      const data = await res.json();
      if (data.erro) {
        return {
          formattedInput: formatted,
          suggestedSection,
          error: 'CEP não encontrado. Verifique os números ou fale o nome da sua cidade.',
        };
      }
      return {
        cepInfo: {
          cep: data.cep || formatted,
          logradouro: data.logradouro || '',
          bairro: data.bairro || '',
          localidade: data.localidade,
          uf: data.uf,
          ddd: data.ddd,
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
    return {
      cepInfo: {
        cep: matchedCity.cep,
        logradouro: '',
        bairro: '',
        localidade: matchedCity.localidade,
        uf: matchedCity.uf,
        ddd: matchedCity.ddd,
      },
      formattedInput: `${matchedCity.localidade} - ${matchedCity.uf}`,
      suggestedSection,
    };
  }

  // 3. If user only expressed an emergency/service intent without a CEP or city
  if (suggestedSection) {
    return {
      formattedInput: trimmed,
      suggestedSection,
    };
  }

  // 4. Partial digits or unrecognized place
  if (spokenDigits.length > 0 && spokenDigits.length < 8) {
    return {
      formattedInput: formatCep(spokenDigits),
      error: 'Fale ou digite os 8 números do CEP (ex: 01001-000) ou o nome da sua cidade.',
    };
  }

  return {
    formattedInput: trimmed,
    error: 'Não reconhecemos um CEP ou cidade. Diga os 8 números do CEP ou o nome da cidade.',
  };
}
