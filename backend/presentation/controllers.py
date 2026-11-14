"""
Controllers finos (Thin Controllers) da API REST e do endpoint MCP HTTP.

Princípio Clean Code:
Controllers não contêm regras de negócio; apenas convertem parâmetros HTTP
em DTOs, delegam aos Casos de Uso e mapeiam exceções de domínio para status HTTP.
"""

from typing import Any

from backend.application.dto import ListNgosInput, SearchServicesInput, VoiceQueryInput
from backend.application.emergency_orientation_use_case import EmergencyOrientationUseCase
from backend.application.list_ngos_use_case import ListNgosUseCase
from backend.application.resolve_voice_query_use_case import ResolveVoiceQueryUseCase
from backend.application.search_services_use_case import SearchServicesUseCase
from backend.domain.exceptions import (
    DomainError,
    ExternalLookupError,
    RateLimitExceededError,
    SecurityViolationError,
)
from backend.mcp.server import AcolheMulherMcpServer
from backend.security.mcp_auth_guard import McpSecurityGuard
from backend.security.privacy_guard import PrivacyGuard
from backend.security.rate_limiter import EphemeralRateLimiter


class ApiControllers:
    """Agrupa manipuladores HTTP desacoplados do servidor de transporte."""

    def __init__(
        self,
        search_services: SearchServicesUseCase,
        resolve_voice: ResolveVoiceQueryUseCase,
        list_ngos: ListNgosUseCase,
        emergency_orientation: EmergencyOrientationUseCase,
        mcp_server: AcolheMulherMcpServer,
        rate_limiter: EphemeralRateLimiter,
        mcp_guard: McpSecurityGuard,
    ) -> None:
        self._search_services = search_services
        self._resolve_voice = resolve_voice
        self._list_ngos = list_ngos
        self._emergency_orientation = emergency_orientation
        self._mcp_server = mcp_server
        self._rate_limiter = rate_limiter
        self._mcp_guard = mcp_guard

    def health(self) -> tuple[int, dict[str, Any]]:
        """Endpoint de verificação de saúde e garantias de privacidade."""
        return 200, {
            "status": "ok",
            "service": "AcolheMulher Python Clean Architecture + MCP",
            "privacy": PrivacyGuard.assert_zero_registration_policy(),
        }

    def get_services(self, query_params: dict[str, list[str]], client_id: str) -> tuple[int, dict[str, Any]]:
        """GET /api/services — Busca serviços gratuitos por CEP, UF, cidade e categoria."""
        return self._execute_safely(
            client_id,
            lambda: self._search_services.execute(
                SearchServicesInput(
                    category=self._first(query_params, "category", "todos"),
                    cep=self._first_optional(query_params, "cep"),
                    uf=self._first_optional(query_params, "uf"),
                    city=self._first_optional(query_params, "city"),
                    health_filter=self._first(query_params, "health_filter", "todos"),
                )
            ),
        )

    def get_ngos(self, query_params: dict[str, list[str]], client_id: str) -> tuple[int, dict[str, Any]]:
        """GET /api/ngos — Lista ONGs parceiras gratuitas filtradas por área."""
        return self._execute_safely(
            client_id,
            lambda: self._list_ngos.execute(
                ListNgosInput(area=self._first(query_params, "area", "todas"))
            ),
        )

    def get_emergency_offline(self, client_id: str) -> tuple[int, dict[str, Any]]:
        """GET /api/emergency/offline — Retorna telefones 24h e segurança digital."""
        return self._execute_safely(client_id, self._emergency_orientation.execute)

    def post_voice_resolve(self, body: dict[str, Any], client_id: str) -> tuple[int, dict[str, Any]]:
        """POST /api/voice/resolve — Interpreta transcrição da Web Speech API em pt-BR."""
        transcript = str(body.get("transcript") or "")
        return self._execute_safely(
            client_id,
            lambda: self._resolve_voice.execute(VoiceQueryInput(transcript=transcript)),
        )

    def post_mcp(self, body: dict[str, Any], client_id: str) -> tuple[int, dict[str, Any] | None]:
        """POST /mcp — Transporte HTTP para chamadas JSON-RPC 2.0 do protocolo MCP."""
        response = self._mcp_server.handle_message(body, client_identifier=client_id)
        if response is None:
            return 204, None
        return 200, response

    def get_partner_export(self, auth_header: str | None, client_id: str) -> tuple[int, dict[str, Any]]:
        """GET /api/partners/export — Base aberta para ONGs com validação opcional de token."""
        token = None
        if auth_header and auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()

        if not self._mcp_guard.verify_partner_token(token):
            return 401, {"error": "UNAUTHORIZED", "message": "Token de parceiro inválido."}

        return self._execute_safely(
            client_id,
            lambda: self._search_services.execute(SearchServicesInput(category="todos")),
        )

    def _execute_safely(
        self,
        client_id: str,
        fn: Any,
    ) -> tuple[int, dict[str, Any]]:
        """Aplica Rate Limiting anônimo e traduz exceções de domínio para HTTP."""
        try:
            self._rate_limiter.check_and_record(client_id)
            return 200, fn()
        except RateLimitExceededError as err:
            return 429, {"error": err.code, "message": err.message}
        except SecurityViolationError as err:
            return 400, {"error": err.code, "message": err.message}
        except ExternalLookupError as err:
            return 502, {"error": err.code, "message": err.message}
        except DomainError as err:
            return 422, {"error": err.code, "message": err.message}
        except Exception:
            return 500, {"error": "INTERNAL_ERROR", "message": "Erro interno inesperado."}

    @staticmethod
    def _first(params: dict[str, list[str]], key: str, default: str) -> str:
        values = params.get(key)
        return values[0] if values else default

    @staticmethod
    def _first_optional(params: dict[str, list[str]], key: str) -> str | None:
        values = params.get(key)
        return values[0] if values and values[0] else None
