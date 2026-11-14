"""
Caso de Uso: Interpretação de Busca por Voz em Português (Web Speech API).

Permite que mulheres em emergência ou com dificuldade de digitação falem:
- Números de CEP por extenso (incluindo "meia" = 6, ex.: "zero um zero zero um meia zero zero")
- Nome da cidade ou estado brasileiro (ex.: "Salvador", "São Paulo", "Minas Gerais")
- Intenção imediata (ex.: "delegacia", "emergência", "parto humanizado", "advogada")
"""

import re
import unicodedata

from backend.application.dto import VoiceQueryInput, dataclass_to_dict
from backend.domain.entities import LocationInfo
from backend.domain.repositories import CepGatewayPort
from backend.domain.value_objects import Cep
from backend.security.input_sanitizer import InputSanitizer

_WORD_TO_DIGIT: dict[str, str] = {
    "zero": "0",
    "um": "1",
    "uma": "1",
    "hum": "1",
    "dois": "2",
    "duas": "2",
    "tres": "3",
    "quatro": "4",
    "cinco": "5",
    "seis": "6",
    "meia": "6",
    "sete": "7",
    "oito": "8",
    "nove": "9",
}

_TENS_TO_NUMBER: dict[str, int] = {
    "dez": 10, "onze": 11, "doze": 12, "treze": 13, "quatorze": 14, "catorze": 14,
    "quinze": 15, "dezesseis": 16, "dezessete": 17, "dezoito": 18, "dezenove": 19,
    "vinte": 20, "trinta": 30, "quarenta": 40, "cinquenta": 50,
    "sessenta": 60, "setenta": 70, "oitenta": 80, "noventa": 90,
}

_KNOWN_CITIES: tuple[dict[str, str | tuple[str, ...]], ...] = (
    {"aliases": ("sao paulo", "sp", "capital paulista"), "city": "São Paulo", "uf": "SP", "cep": "01001-000", "ddd": "11"},
    {"aliases": ("campinas",), "city": "Campinas", "uf": "SP", "cep": "13010-000", "ddd": "19"},
    {"aliases": ("rio de janeiro", "rio", "rj"), "city": "Rio de Janeiro", "uf": "RJ", "cep": "20040-002", "ddd": "21"},
    {"aliases": ("salvador", "ba", "bahia"), "city": "Salvador", "uf": "BA", "cep": "40285-001", "ddd": "71"},
    {"aliases": ("brasilia", "df", "distrito federal", "ceilandia"), "city": "Brasília", "uf": "DF", "cep": "72225-010", "ddd": "61"},
    {"aliases": ("belo horizonte", "bh", "mg", "minas gerais"), "city": "Belo Horizonte", "uf": "MG", "cep": "30130-100", "ddd": "31"},
    {"aliases": ("recife", "pe", "pernambuco"), "city": "Recife", "uf": "PE", "cep": "50060-000", "ddd": "81"},
    {"aliases": ("curitiba", "pr", "parana"), "city": "Curitiba", "uf": "PR", "cep": "80035-050", "ddd": "41"},
    {"aliases": ("porto alegre", "rs", "rio grande do sul"), "city": "Porto Alegre", "uf": "RS", "cep": "90010-000", "ddd": "51"},
    {"aliases": ("belem", "pa", "para"), "city": "Belém", "uf": "PA", "cep": "66090-000", "ddd": "91"},
)


def _normalize_text(text: str) -> str:
    """Remove acentos e padroniza para minúsculas, facilitando matching fonético."""
    decomposed = unicodedata.normalize("NFD", text.lower())
    without_accents = "".join(ch for ch in decomposed if unicodedata.category(ch) != "Mn")
    return without_accents.strip()


class ResolveVoiceQueryUseCase:
    """Interpreta comandos falados em pt-BR e resolve localização e categoria sugerida."""

    def __init__(self, cep_gateway: CepGatewayPort, sanitizer: InputSanitizer) -> None:
        self._cep_gateway = cep_gateway
        self._sanitizer = sanitizer

    def execute(self, payload: VoiceQueryInput) -> dict[str, object]:
        """Analisa a transcrição sanitizada e retorna localização e seção sugerida."""
        clean_transcript = self._sanitizer.sanitize_text(payload.transcript, "transcript")
        suggested_section = self._detect_section_intent(clean_transcript)
        digits = self._extract_cep_digits(clean_transcript)

        if len(digits) == 8:
            validated_cep = Cep(digits)
            location = self._cep_gateway.lookup_cep(validated_cep)
            if location is not None:
                return {
                    "location": dataclass_to_dict(location),
                    "formatted_input": validated_cep.formatted,
                    "suggested_section": suggested_section,
                    "matched_by": "cep",
                }

        city_match = self._find_known_city(clean_transcript)
        if city_match is not None:
            location = LocationInfo(
                cep=str(city_match["cep"]),
                city=str(city_match["city"]),
                uf=str(city_match["uf"]),
                ddd=str(city_match["ddd"]),
            )
            return {
                "location": dataclass_to_dict(location),
                "formatted_input": f"{location.city} - {location.uf}",
                "suggested_section": suggested_section,
                "matched_by": "city",
            }

        return {
            "location": None,
            "formatted_input": clean_transcript,
            "suggested_section": suggested_section,
            "matched_by": "intent_only" if suggested_section else "none",
        }

    @staticmethod
    def _extract_cep_digits(transcript: str) -> str:
        """Extrai dígitos numéricos e numerais falados em português de uma frase."""
        cleaned = re.sub(r"[-.,/]", " ", _normalize_text(transcript))
        tokens = [tok for tok in cleaned.split() if tok]
        digits = ""

        idx = 0
        while idx < len(tokens):
            token = tokens[idx]
            if token.isdigit():
                digits += token
            elif token in _WORD_TO_DIGIT:
                digits += _WORD_TO_DIGIT[token]
            elif token in _TENS_TO_NUMBER:
                value = _TENS_TO_NUMBER[token]
                if (
                    value >= 20
                    and idx + 2 < len(tokens)
                    and tokens[idx + 1] == "e"
                    and tokens[idx + 2] in _WORD_TO_DIGIT
                ):
                    value += int(_WORD_TO_DIGIT[tokens[idx + 2]])
                    idx += 2
                digits += str(value)
            idx += 1

        return digits

    @staticmethod
    def _detect_section_intent(transcript: str) -> str | None:
        """Identifica a área de atendimento solicitada pela usuária no comando de voz."""
        norm = _normalize_text(transcript)
        if re.search(r"\b(emergencia|socorro|perigo|delegacia|deam|violencia|abrigo|policia|180|190)\b", norm):
            return "emergencia"
        if re.search(r"\b(psicolog\w*|emocional|terapia|cvv|ansiedade|escuta)\b", norm):
            return "psicologico"
        if re.search(r"\b(advogad\w*|juridic\w*|defensoria|medida protetiva|pensao|divorcio)\b", norm):
            return "juridico"
        if re.search(r"\b(saude|parto|exame|mamografia|papanicolau|sus|hospital)\b", norm):
            return "saude"
        if re.search(r"\b(curso\w*|capacitacao|renda|emprego|trabalho)\b", norm):
            return "cursos"
        if re.search(r"\b(ong|ongs|voluntari\w*)\b", norm):
            return "ongs_apoio"
        return None

    @staticmethod
    def _find_known_city(transcript: str) -> dict[str, str | tuple[str, ...]] | None:
        """Localiza a cidade/estado brasileiro mais específico citado na fala."""
        norm = _normalize_text(transcript)
        if not norm:
            return None

        best_match: dict[str, str | tuple[str, ...]] | None = None
        best_length = 0

        for entry in _KNOWN_CITIES:
            aliases = entry["aliases"]
            if not isinstance(aliases, tuple):
                continue
            for alias in aliases:
                pattern = re.compile(rf"\b{re.escape(alias)}\b", re.IGNORECASE)
                if pattern.search(norm) and len(alias) > best_length:
                    best_match = entry
                    best_length = len(alias)

        return best_match
