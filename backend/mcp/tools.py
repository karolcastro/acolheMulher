"""
Registro e execução das Ferramentas (Tools) expostas pelo servidor MCP.

Cada ferramenta possui:
- Schema JSON estrito de entrada (inputSchema) para o agente de IA.
- Inspeção de segurança prévia via McpSecurityGuard (anti-Prompt Injection).
- Delegação direta ao Caso de Uso correspondente na camada Application.
"""

import json
from typing import Any, Callable

from backend.application.dto import ListNgosInput, SearchServicesInput, VoiceQueryInput
from backend.application.emergency_orientation_use_case import EmergencyOrientationUseCase
from backend.application.list_ngos_use_case import ListNgosUseCase
from backend.application.resolve_voice_query_use_case import ResolveVoiceQueryUseCase
from backend.application.search_services_use_case import SearchServicesUseCase
from backend.domain.exceptions import DomainError
from backend.security.mcp_auth_guard import McpSecurityGuard


class McpToolRegistry:
    """Catálogo seguro de ferramentas MCP do AcolheMulher."""

    def __init__(
        self,
        search_services: SearchServicesUseCase,
        resolve_voice: ResolveVoiceQueryUseCase,
        list_ngos: ListNgosUseCase,
        emergency_orientation: EmergencyOrientationUseCase,
        security_guard: McpSecurityGuard,
    ) -> None:
        self._search_services = search_services
        self._resolve_voice = resolve_voice
        self._list_ngos = list_ngos
        self._emergency_orientation = emergency_orientation
        self._security_guard = security_guard

        self._handlers: dict[str, Callable[[dict[str, Any]], dict[str, object]]] = {
            "buscar_servicos_por_cep": self._handle_search_services,
            "interpretar_busca_por_voz": self._handle_resolve_voice,
            "listar_ongs_apoio": self._handle_list_ngos,
            "obter_emergencia_offline": self._handle_emergency_offline,
        }

    def list_tools(self) -> list[dict[str, Any]]:
        """Retorna os metadados e JSON Schemas de todas as ferramentas disponíveis."""
        return [
            {
                "name": "buscar_servicos_por_cep",
                "description": (
                    "Busca serviços 100% gratuitos e sem cadastro para mulheres no Brasil "
                    "(delegacias 24h, apoio psicológico, advogada gratuita, casas de parto humanizado, "
                    "ONGs de exames gratuitos, SUS e cursos) por CEP, UF ou cidade."
                ),
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "category": {
                            "type": "string",
                            "enum": ["todos", "emergencia", "juridico", "psicologico", "saude", "cursos", "social"],
                            "description": "Categoria do serviço buscado.",
                        },
                        "cep": {
                            "type": "string",
                            "description": "CEP brasileiro com 8 dígitos (ex.: 01001-000).",
                        },
                        "uf": {
                            "type": "string",
                            "description": "Sigla do estado brasileiro (ex.: SP, BA, RJ, MG, DF).",
                        },
                        "city": {
                            "type": "string",
                            "description": "Nome do município (ex.: Salvador, São Paulo).",
                        },
                        "health_filter": {
                            "type": "string",
                            "enum": ["todos", "parto", "exames", "sus"],
                            "description": "Subfiltro opcional quando category='saude'.",
                        },
                    },
                    "additionalProperties": False,
                },
            },
            {
                "name": "interpretar_busca_por_voz",
                "description": (
                    "Interpreta transcrição de fala em português (Web Speech API) contendo CEP "
                    "falado por extenso (incluindo 'meia'=6), cidade/estado ou pedido de emergência."
                ),
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "transcript": {
                            "type": "string",
                            "description": "Frase transcrita da fala da usuária em português.",
                        },
                    },
                    "required": ["transcript"],
                    "additionalProperties": False,
                },
            },
            {
                "name": "listar_ongs_apoio",
                "description": (
                    "Lista ONGs gratuitas que auxiliam mulheres em saúde/parto/exames, "
                    "psicologia/jurídico, acolhimento/proteção e cursos/renda."
                ),
                "inputSchema": {
                    "type": "object",
                    "properties": {
                        "area": {
                            "type": "string",
                            "enum": [
                                "todas",
                                "saude_parto",
                                "psicologico_juridico",
                                "acolhimento_protecao",
                                "cursos_renda",
                            ],
                            "description": "Área de atuação da ONG.",
                        },
                    },
                    "additionalProperties": False,
                },
            },
            {
                "name": "obter_emergencia_offline",
                "description": (
                    "Retorna canais de socorro imediato (180, 190, 188, 129), garantias de "
                    "privacidade Zero-PII e orientações de segurança digital e uso offline."
                ),
                "inputSchema": {
                    "type": "object",
                    "properties": {},
                    "additionalProperties": False,
                },
            },
        ]

    def call_tool(self, name: str, arguments: dict[str, Any] | None) -> dict[str, Any]:
        """Executa a ferramenta solicitada após validação anti-Prompt Injection."""
        safe_args = arguments if arguments is not None else {}
        self._security_guard.inspect_tool_arguments(safe_args)

        handler = self._handlers.get(name)
        if handler is None:
            return {
                "content": [{"type": "text", "text": f"Ferramenta desconhecida: {name}"}],
                "isError": True,
            }

        try:
            data = handler(safe_args)
            return {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps(data, ensure_ascii=False, indent=2),
                    }
                ],
                "isError": False,
            }
        except DomainError as err:
            return {
                "content": [
                    {
                        "type": "text",
                        "text": json.dumps({"error": err.code, "message": err.message}, ensure_ascii=False),
                    }
                ],
                "isError": True,
            }

    def _handle_search_services(self, args: dict[str, Any]) -> dict[str, object]:
        payload = SearchServicesInput(
            category=str(args.get("category") or "todos"),
            cep=str(args["cep"]) if args.get("cep") else None,
            uf=str(args["uf"]) if args.get("uf") else None,
            city=str(args["city"]) if args.get("city") else None,
            health_filter=str(args.get("health_filter") or "todos"),
        )
        return self._search_services.execute(payload)

    def _handle_resolve_voice(self, args: dict[str, Any]) -> dict[str, object]:
        payload = VoiceQueryInput(transcript=str(args.get("transcript") or ""))
        return self._resolve_voice.execute(payload)

    def _handle_list_ngos(self, args: dict[str, Any]) -> dict[str, object]:
        payload = ListNgosInput(area=str(args.get("area") or "todas"))
        return self._list_ngos.execute(payload)

    def _handle_emergency_offline(self, _args: dict[str, Any]) -> dict[str, object]:
        return self._emergency_orientation.execute()
