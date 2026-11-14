"""
Servidor MCP (Model Context Protocol) com suporte a transporte STDIO e JSON-RPC HTTP.

Uso via linha de comando (STDIO - padrão para Claude Desktop, Cursor, agentes):
    python3 -m backend.mcp.server
"""

import json
import sys
from typing import Any

from backend.config.settings import load_settings
from backend.domain.exceptions import RateLimitExceededError, SecurityViolationError
from backend.mcp.protocol import (
    MCP_PROTOCOL_VERSION,
    JsonRpcErrorCodes,
    build_jsonrpc_error,
    build_jsonrpc_result,
)
from backend.mcp.resources import McpResourceRegistry
from backend.mcp.tools import McpToolRegistry
from backend.security.rate_limiter import EphemeralRateLimiter


class AcolheMulherMcpServer:
    """Núcleo agnóstico de transporte do servidor MCP (processa mensagens JSON-RPC 2.0)."""

    def __init__(
        self,
        server_name: str,
        server_version: str,
        tool_registry: McpToolRegistry,
        resource_registry: McpResourceRegistry,
        rate_limiter: EphemeralRateLimiter,
    ) -> None:
        self._server_name = server_name
        self._server_version = server_version
        self._tools = tool_registry
        self._resources = resource_registry
        self._rate_limiter = rate_limiter

    def handle_message(
        self,
        raw_message: dict[str, Any],
        client_identifier: str = "stdio",
    ) -> dict[str, Any] | None:
        """
        Processa uma mensagem JSON-RPC 2.0 recebida via HTTP ou STDIO.
        Notificações sem campo 'id' retornam None conforme especificação JSON-RPC.
        """
        if not isinstance(raw_message, dict) or raw_message.get("jsonrpc") != "2.0":
            return build_jsonrpc_error(
                raw_message.get("id") if isinstance(raw_message, dict) else None,
                JsonRpcErrorCodes.INVALID_REQUEST,
                "Requisição JSON-RPC 2.0 inválida.",
            )

        request_id = raw_message.get("id")
        method = raw_message.get("method")
        params = raw_message.get("params") or {}

        # Notificações (ex.: notifications/initialized) não exigem resposta
        if request_id is None and method == "notifications/initialized":
            return None

        try:
            self._rate_limiter.check_and_record(client_identifier)
            result = self._dispatch(str(method), params)
            if request_id is None:
                return None
            return build_jsonrpc_result(request_id, result)
        except RateLimitExceededError as err:
            return build_jsonrpc_error(request_id, JsonRpcErrorCodes.RATE_LIMITED, err.message)
        except SecurityViolationError as err:
            return build_jsonrpc_error(
                request_id,
                JsonRpcErrorCodes.SECURITY_BLOCKED,
                err.message,
                {"code": err.code},
            )
        except KeyError as err:
            return build_jsonrpc_error(request_id, JsonRpcErrorCodes.INVALID_PARAMS, str(err))
        except LookupError as err:
            return build_jsonrpc_error(request_id, JsonRpcErrorCodes.METHOD_NOT_FOUND, str(err))
        except Exception:
            # Nunca vaza stack trace interno em respostas MCP
            return build_jsonrpc_error(
                request_id,
                JsonRpcErrorCodes.INTERNAL_ERROR,
                "Erro interno ao processar requisição MCP.",
            )

    def _dispatch(self, method: str, params: dict[str, Any]) -> dict[str, Any]:
        """Roteia métodos oficiais da especificação MCP 2024-11-05."""
        if method == "initialize":
            return {
                "protocolVersion": MCP_PROTOCOL_VERSION,
                "capabilities": {
                    "tools": {"listChanged": False},
                    "resources": {"subscribe": False, "listChanged": False},
                    "prompts": {"listChanged": False},
                },
                "serverInfo": {
                    "name": self._server_name,
                    "version": self._server_version,
                },
            }

        if method == "ping":
            return {}

        if method == "tools/list":
            return {"tools": self._tools.list_tools()}

        if method == "tools/call":
            name = str(params.get("name") or "")
            arguments = params.get("arguments")
            if not name:
                raise KeyError("Parâmetro obrigatório 'name' ausente em tools/call.")
            return self._tools.call_tool(name, arguments)

        if method == "resources/list":
            return {"resources": self._resources.list_resources()}

        if method == "resources/read":
            uri = str(params.get("uri") or "")
            if not uri:
                raise KeyError("Parâmetro obrigatório 'uri' ausente em resources/read.")
            return self._resources.read_resource(uri)

        if method == "prompts/list":
            return {"prompts": self._resources.list_prompts()}

        if method == "prompts/get":
            name = str(params.get("name") or "")
            arguments = params.get("arguments")
            return self._resources.get_prompt(name, arguments)

        raise LookupError(f"Método MCP não suportado: {method}")


def build_default_mcp_server() -> AcolheMulherMcpServer:
    """Composition Root reutilizada para instanciar o servidor MCP STDIO com Supabase + RLS."""
    from backend.main import build_application

    _, mcp_server = build_application()
    return mcp_server


def run_stdio_loop() -> None:
    """Executa o servidor MCP em modo STDIO (leitura de JSON-RPC por linha no stdin)."""
    server = build_default_mcp_server()
    for line in sys.stdin:
        raw = line.strip()
        if not raw:
            continue
        try:
            message = json.loads(raw)
        except json.JSONDecodeError:
            err = build_jsonrpc_error(None, JsonRpcErrorCodes.PARSE_ERROR, "JSON inválido.")
            sys.stdout.write(json.dumps(err, ensure_ascii=False) + "\n")
            sys.stdout.flush()
            continue

        response = server.handle_message(message, client_identifier="stdio")
        if response is not None:
            sys.stdout.write(json.dumps(response, ensure_ascii=False) + "\n")
            sys.stdout.flush()


if __name__ == "__main__":
    run_stdio_loop()
