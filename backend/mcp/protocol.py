"""
Definições estruturais do protocolo MCP (JSON-RPC 2.0, versão 2024-11-05).

Separa claramente a construção de respostas de sucesso e erro JSON-RPC
sem expor stack traces ou detalhes internos de infraestrutura.
"""

from dataclasses import dataclass
from typing import Any

MCP_PROTOCOL_VERSION = "2024-11-05"


@dataclass(frozen=True)
class JsonRpcErrorCodes:
    """Códigos numéricos padrão da especificação JSON-RPC 2.0."""

    PARSE_ERROR = -32700
    INVALID_REQUEST = -32600
    METHOD_NOT_FOUND = -32601
    INVALID_PARAMS = -32602
    INTERNAL_ERROR = -32603
    SECURITY_BLOCKED = -32001
    RATE_LIMITED = -32029


def build_jsonrpc_result(request_id: Any, result: dict[str, Any]) -> dict[str, Any]:
    """Constrói envelope JSON-RPC 2.0 de sucesso."""
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "result": result,
    }


def build_jsonrpc_error(
    request_id: Any,
    code: int,
    message: str,
    data: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Constrói envelope JSON-RPC 2.0 padronizado de erro."""
    error_body: dict[str, Any] = {
        "code": code,
        "message": message,
    }
    if data is not None:
        error_body["data"] = data
    return {
        "jsonrpc": "2.0",
        "id": request_id,
        "error": error_body,
    }
