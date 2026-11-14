"""
Servidor HTTP seguro usando apenas a biblioteca padrão do Python (http.server).

Características de segurança e privacidade:
- Aplica SecurityHeadersBuilder (OWASP) e PrivacyGuard.anti_cache_headers() em todas as respostas.
- Limita tamanho máximo do corpo JSON (MAX_BODY_BYTES = 16 KB) contra exaustão de memória.
- Desativa logs padrão com endereço IP da usuária para cumprir a política Zero-Rastro.
"""

from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
from typing import Any
from urllib.parse import parse_qs, urlparse

from backend.presentation.controllers import ApiControllers
from backend.security.privacy_guard import PrivacyGuard
from backend.security.security_headers import SecurityHeadersBuilder

_MAX_BODY_BYTES = 16 * 1024  # 16 KB suficientes para CEP, transcrição de voz ou JSON-RPC MCP


def create_http_server(
    host: str,
    port: int,
    allowed_origin: str,
    controllers: ApiControllers,
) -> ThreadingHTTPServer:
    """Fábrica que instancia o servidor HTTP injetando os controllers e cabeçalhos."""
    security_headers = SecurityHeadersBuilder.build(allowed_origin)
    anti_cache_headers = PrivacyGuard.anti_cache_headers()

    class AcolheMulherHandler(BaseHTTPRequestHandler):
        """Handler HTTP com roteamento limpo e zero registro de IP em logs."""

        def log_message(self, format: str, *args: Any) -> None:
            # Silencia log de acesso padrão do BaseHTTPRequestHandler para não gravar IPs nem CEPs
            return

        def _send_json(self, status_code: int, payload: dict[str, Any] | None) -> None:
            self.send_response(status_code)
            for key, value in security_headers.items():
                self.send_header(key, value)
            for key, value in anti_cache_headers.items():
                self.send_header(key, value)

            if payload is None:
                self.end_headers()
                return

            encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Content-Length", str(len(encoded)))
            self.end_headers()
            self.wfile.write(encoded)

        def _client_identifier(self) -> str:
            # Usado apenas como entrada do hash HMAC efêmero do RateLimiter (nunca armazenado em claro)
            return self.client_address[0] if self.client_address else "unknown"

        def do_OPTIONS(self) -> None:
            self._send_json(204, None)

        def do_GET(self) -> None:
            parsed = urlparse(self.path)
            params = parse_qs(parsed.query)
            client_id = self._client_identifier()

            if parsed.path == "/api/health":
                status, data = controllers.health()
                self._send_json(status, data)
            elif parsed.path == "/api/services":
                status, data = controllers.get_services(params, client_id)
                self._send_json(status, data)
            elif parsed.path == "/api/ngos":
                status, data = controllers.get_ngos(params, client_id)
                self._send_json(status, data)
            elif parsed.path == "/api/emergency/offline":
                status, data = controllers.get_emergency_offline(client_id)
                self._send_json(status, data)
            elif parsed.path == "/api/partners/export":
                auth = self.headers.get("Authorization")
                status, data = controllers.get_partner_export(auth, client_id)
                self._send_json(status, data)
            else:
                self._send_json(404, {"error": "NOT_FOUND", "message": "Rota não encontrada."})

        def do_POST(self) -> None:
            parsed = urlparse(self.path)
            content_length = int(self.headers.get("Content-Length", "0") or "0")

            if content_length <= 0 or content_length > _MAX_BODY_BYTES:
                self._send_json(
                    413,
                    {"error": "INVALID_BODY_SIZE", "message": "Tamanho de corpo inválido ou excedido."},
                )
                return

            try:
                raw_body = self.rfile.read(content_length).decode("utf-8")
                body = json.loads(raw_body)
                if not isinstance(body, dict):
                    raise ValueError("Corpo deve ser um objeto JSON.")
            except (UnicodeDecodeError, json.JSONDecodeError, ValueError):
                self._send_json(400, {"error": "INVALID_JSON", "message": "JSON malformado."})
                return

            client_id = self._client_identifier()
            if parsed.path == "/api/voice/resolve":
                status, data = controllers.post_voice_resolve(body, client_id)
                self._send_json(status, data)
            elif parsed.path == "/mcp":
                status, data = controllers.post_mcp(body, client_id)
                self._send_json(status, data)
            else:
                self._send_json(404, {"error": "NOT_FOUND", "message": "Rota não encontrada."})

    return ThreadingHTTPServer((host, port), AcolheMulherHandler)
