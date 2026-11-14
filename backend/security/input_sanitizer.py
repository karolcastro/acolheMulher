"""
Sanitização e validação estrita de entradas de usuárias e agentes MCP.

Previne ataques de injeção (XSS, HTML injection, null-byte injection,
excessive payload / ReDoS) antes que qualquer dado chegue aos casos de uso.
"""

import html
import re

from backend.domain.exceptions import SecurityViolationError

# Caracteres de controle ASCII (exceto espaço comum) que nunca devem existir em buscas
_CONTROL_CHARS_RE = re.compile(r"[\x00-\x1f\x7f]")
# Padrões básicos de marcação HTML/script perigosa
_HTML_TAG_RE = re.compile(r"<\s*/?\s*[a-zA-Z][^>]*>")


class InputSanitizer:
    """Responsável por limpar e limitar strings externas de forma determinística."""

    def __init__(self, max_length: int = 120) -> None:
        self._max_length = max_length

    def sanitize_text(self, raw_value: str | None, field_name: str = "entrada") -> str:
        """
        Limpa texto recebido via HTTP ou MCP:
        1. Garante tipo string e remove espaços nas pontas.
        2. Bloqueia payloads maiores que o limite seguro.
        3. Remove caracteres de controle e rejeita tags HTML/script.
        4. Escapa entidades residuais para segurança em serializações.
        """
        if raw_value is None:
            return ""
        if not isinstance(raw_value, str):
            raise SecurityViolationError(
                f"O campo '{field_name}' deve ser um texto válido.",
                code="INVALID_INPUT_TYPE",
            )

        trimmed = _CONTROL_CHARS_RE.sub("", raw_value).strip()

        if len(trimmed) > self._max_length:
            raise SecurityViolationError(
                f"O campo '{field_name}' excedeu o limite máximo de {self._max_length} caracteres.",
                code="PAYLOAD_TOO_LARGE",
            )

        if _HTML_TAG_RE.search(trimmed):
            raise SecurityViolationError(
                f"Conteúdo não permitido detectado no campo '{field_name}'.",
                code="UNSAFE_MARKUP_DETECTED",
            )

        return html.escape(trimmed, quote=False)
