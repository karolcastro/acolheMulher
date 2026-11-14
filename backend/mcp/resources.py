"""
Recursos (Resources) e Prompts MCP somente leitura do AcolheMulher.

Permite que clientes MCP leiam dados estáticos de emergência, o catálogo
aberto e a política Zero-PII sob URIs controladas ('acolhemulher://...').
"""

import json
from typing import Any

from backend.application.dto import SearchServicesInput
from backend.application.emergency_orientation_use_case import EmergencyOrientationUseCase
from backend.application.search_services_use_case import SearchServicesUseCase
from backend.security.mcp_auth_guard import McpSecurityGuard
from backend.security.privacy_guard import PrivacyGuard


class McpResourceRegistry:
    """Gerencia Resources e Prompts MCP protegidos contra Path Traversal."""

    def __init__(
        self,
        search_services: SearchServicesUseCase,
        emergency_orientation: EmergencyOrientationUseCase,
        security_guard: McpSecurityGuard,
    ) -> None:
        self._search_services = search_services
        self._emergency_orientation = emergency_orientation
        self._security_guard = security_guard

    @staticmethod
    def list_resources() -> list[dict[str, Any]]:
        """Lista os Resources disponíveis para leitura por agentes MCP."""
        return [
            {
                "uri": "acolhemulher://emergencia/offline",
                "name": "Canais de Emergência Offline",
                "description": "Números gratuitos 24h (180, 190, 188, 129) e segurança digital.",
                "mimeType": "application/json",
            },
            {
                "uri": "acolhemulher://servicos/catalogo",
                "name": "Catálogo Nacional de Serviços e ONGs",
                "description": "Base completa de serviços gratuitos, casas de parto e ONGs de exames.",
                "mimeType": "application/json",
            },
            {
                "uri": "acolhemulher://seguranca/privacidade",
                "name": "Política Zero-PII e Segurança",
                "description": "Garantias técnicas de anonimato e proteção contra rastreamento.",
                "mimeType": "application/json",
            },
        ]

    def read_resource(self, raw_uri: str) -> dict[str, Any]:
        """Lê um recurso autorizado validando antes a URI com McpSecurityGuard."""
        uri = self._security_guard.validate_resource_uri(raw_uri)

        if uri == "acolhemulher://emergencia/offline":
            content = self._emergency_orientation.execute()
        elif uri == "acolhemulher://servicos/catalogo":
            content = self._search_services.execute(SearchServicesInput(category="todos"))
        elif uri == "acolhemulher://seguranca/privacidade":
            content = PrivacyGuard.assert_zero_registration_policy()
        else:
            raise KeyError(f"Recurso não encontrado: {uri}")

        return {
            "contents": [
                {
                    "uri": uri,
                    "mimeType": "application/json",
                    "text": json.dumps(content, ensure_ascii=False, indent=2),
                }
            ]
        }

    @staticmethod
    def list_prompts() -> list[dict[str, Any]]:
        """Lista prompts institucionais trauma-informed para orientar agentes MCP."""
        return [
            {
                "name": "orientar_mulher_em_vulnerabilidade",
                "description": "Diretrizes de acolhimento objetivo, gratuito e sem exigir cadastro.",
                "arguments": [
                    {
                        "name": "necessidade",
                        "description": "Tipo de ajuda buscada (ex.: parto humanizado, exames, proteção).",
                        "required": True,
                    }
                ],
            }
        ]

    @staticmethod
    def get_prompt(name: str, arguments: dict[str, Any] | None = None) -> dict[str, Any]:
        """Retorna instruções seguras do protocolo trauma-informed para o agente."""
        if name != "orientar_mulher_em_vulnerabilidade":
            raise KeyError(f"Prompt não encontrado: {name}")

        need = str((arguments or {}).get("necessidade") or "apoio gratuito")
        return {
            "description": "Protocolo de atendimento acolhedor e seguro do AcolheMulher",
            "messages": [
                {
                    "role": "user",
                    "content": {
                        "type": "text",
                        "text": (
                            f"Você está auxiliando uma mulher que precisa de '{need}'. "
                            "Regras obrigatórias: 1) Nunca peça nome, CPF, e-mail ou login; "
                            "2) Priorize serviços 100% gratuitos (SUS, Casas de Parto Humanizado, ONGs, Defensoria); "
                            "3) Em risco imediato, destaque Ligue 180 e Polícia 190."
                        ),
                    },
                }
            ],
        }
