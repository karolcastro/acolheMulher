"""
Proteção contra SSRF (Server-Side Request Forgery).

Garante que o servidor Python jamais faça requisições HTTP para endereços
internos (127.0.0.1, 169.254.169.254, redes privadas) ou domínios arbitrários.
Somente a API oficial ViaCEP via HTTPS e padrão estrito de rota é permitida.
"""

import re
from urllib.parse import urlparse

from backend.domain.exceptions import SecurityViolationError

_ALLOWED_HOSTS: frozenset[str] = frozenset({"viacep.com.br"})
_VIACEP_PATH_RE = re.compile(r"^/ws/\d{8}/json/$")


class SSRFProtector:
    """Valida URLs externas contra uma allowlist estrita antes de qualquer requisição."""

    @staticmethod
    def validate_viacep_url(url: str) -> str:
        """
        Confirma que a URL usa obrigatoriamente HTTPS, pertence a 'viacep.com.br'
        e segue exatamente o caminho '/ws/<8-digitos>/json/'.
        """
        parsed = urlparse(url)

        if parsed.scheme != "https":
            raise SecurityViolationError(
                "Chamadas externas devem utilizar HTTPS obrigatoriamente.",
                code="INSECURE_SCHEME",
            )

        if (parsed.hostname or "").lower() not in _ALLOWED_HOSTS:
            raise SecurityViolationError(
                "Destino externo não autorizado pela política anti-SSRF.",
                code="SSRF_BLOCKED_HOST",
            )

        if parsed.port is not None and parsed.port != 443:
            raise SecurityViolationError(
                "Porta externa não autorizada.",
                code="SSRF_BLOCKED_PORT",
            )

        if not _VIACEP_PATH_RE.match(parsed.path):
            raise SecurityViolationError(
                "Caminho de consulta externa inválido.",
                code="SSRF_INVALID_PATH",
            )

        return url

    @staticmethod
    def validate_supabase_url(target_url: str, configured_base_url: str) -> str:
        """
        Garante que chamadas ao Supabase usem HTTPS, apontem exatamente para
        o domínio configurado em SUPABASE_URL e acessem apenas '/rest/v1/'.
        """
        base = urlparse(configured_base_url)
        target = urlparse(target_url)

        if target.scheme != "https" or base.scheme != "https":
            raise SecurityViolationError(
                "Conexões ao Supabase exigem HTTPS obrigatoriamente.",
                code="INSECURE_SUPABASE_SCHEME",
            )

        if not base.hostname or target.hostname != base.hostname:
            raise SecurityViolationError(
                "Host Supabase não autorizado pela política anti-SSRF.",
                code="SSRF_BLOCKED_SUPABASE_HOST",
            )

        if not target.path.startswith("/rest/v1/"):
            raise SecurityViolationError(
                "Endpoint Supabase fora do prefixo permitido '/rest/v1/'.",
                code="SSRF_INVALID_SUPABASE_PATH",
            )

        return target_url
