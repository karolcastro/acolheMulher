"""
Guardião de Segurança para o Protocolo MCP (Model Context Protocol).

Proteções implementadas especificamente para agentes de IA e integrações MCP:
1. Anti-Prompt Injection: detecta padrões de manipulação de instruções em
   argumentos enviados às ferramentas MCP antes do processamento.
2. URI Traversal Guard: garante que 'resources/read' só acesse URIs no
   namespace oficial 'acolhemulher://' sem sequências '../'.
3. Verificação opcional de Token HMAC em tempo constante (hmac.compare_digest)
   para operações exclusivas da Área de Parceiros/ONGs (nunca exigido para usuárias).
"""

import hmac
import re

from backend.domain.exceptions import SecurityViolationError

_PROMPT_INJECTION_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"ignore\s+(all\s+)?previous\s+instructions", re.IGNORECASE),
    re.compile(r"system\s*prompt", re.IGNORECASE),
    re.compile(r"<\s*script\b", re.IGNORECASE),
    re.compile(r";\s*(drop|delete|union|exec)\s+", re.IGNORECASE),
    re.compile(r"\$\([^)]+\)|`[^`]+`"),
)


class McpSecurityGuard:
    """Validador de segurança para requisições JSON-RPC 2.0 do servidor MCP."""

    def __init__(self, partner_api_token: str | None = None) -> None:
        self._partner_api_token = partner_api_token

    def inspect_tool_arguments(self, arguments: dict[str, object]) -> None:
        """
        Analisa argumentos de uma chamada 'tools/call' em busca de Prompt Injection,
        tentativas de execução de comando ou injeção SQL/script.
        """
        if not isinstance(arguments, dict):
            raise SecurityViolationError(
                "Os argumentos da ferramenta MCP devem ser um objeto JSON.",
                code="MCP_INVALID_ARGUMENTS",
            )

        for key, value in arguments.items():
            if isinstance(value, str):
                for pattern in _PROMPT_INJECTION_PATTERNS:
                    if pattern.search(value):
                        raise SecurityViolationError(
                            f"Padrão inseguro bloqueado no parâmetro MCP '{key}'.",
                            code="MCP_PROMPT_INJECTION_BLOCKED",
                        )

    @staticmethod
    def validate_resource_uri(uri: str) -> str:
        """
        Garante que o Resource solicitado pertence ao namespace 'acolhemulher://'
        e não contém caracteres de travessia de diretório.
        """
        cleaned = (uri or "").strip()
        if not cleaned.startswith("acolhemulher://"):
            raise SecurityViolationError(
                "URI de recurso MCP fora do escopo permitido.",
                code="MCP_INVALID_RESOURCE_URI",
            )
        if ".." in cleaned or "\\" in cleaned:
            raise SecurityViolationError(
                "Tentativa de travessia de caminho bloqueada.",
                code="MCP_PATH_TRAVERSAL_BLOCKED",
            )
        return cleaned

    def verify_partner_token(self, provided_token: str | None) -> bool:
        """
        Valida credencial de parceiro/ONG em tempo constante (previne timing attacks).
        Usado apenas para endpoints técnicos de parceiros quando ACOLHE_PARTNER_TOKEN estiver ativo.
        """
        if not self._partner_api_token:
            return True
        if not provided_token:
            return False
        return hmac.compare_digest(
            provided_token.encode("utf-8"),
            self._partner_api_token.encode("utf-8"),
        )
