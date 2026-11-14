"""
Configurações imutáveis da aplicação carregadas via variáveis de ambiente.

Boas práticas de Clean Code & Segurança:
- Nenhum segredo ou chave é fixado no código-fonte (hardcoded).
- Utiliza dataclass congelada (frozen=True) para impedir mutação em tempo de execução.
"""

from dataclasses import dataclass, field
import os
import secrets


@dataclass(frozen=True)
class SecuritySettings:
    """Parâmetros de segurança e privacidade da camada transversal."""

    # Segredo efêmero gerado em tempo de execução apenas para anonimizar chaves de rate limit
    ephemeral_hmac_secret: str = field(
        default_factory=lambda: os.getenv("ACOLHE_EPHEMERAL_SECRET") or secrets.token_hex(32)
    )
    # Token opcional para rotas/tools administrativas de parceiros/ONGs (nunca exigido para usuárias finais)
    partner_api_token: str | None = field(
        default_factory=lambda: os.getenv("ACOLHE_PARTNER_TOKEN")
    )
    # Limite de requisições por janela de tempo para prevenir abuso sem rastrear usuárias
    rate_limit_max_requests: int = int(os.getenv("ACOLHE_RATE_LIMIT_MAX", "60"))
    rate_limit_window_seconds: int = int(os.getenv("ACOLHE_RATE_LIMIT_WINDOW", "60"))
    # Limite máximo de caracteres aceito em entradas de busca ou voz
    max_input_length: int = 120
    # Timeout curto (segundos) para chamadas externas (ViaCEP) evitando travamento de threads
    external_http_timeout_seconds: float = 4.0


@dataclass(frozen=True)
class SupabaseSettings:
    """Configurações opcionais de conexão segura ao Supabase (PostgREST + RLS)."""

    url: str | None = field(default_factory=lambda: (os.getenv("SUPABASE_URL") or "").strip() or None)
    anon_key: str | None = field(
        default_factory=lambda: (os.getenv("SUPABASE_ANON_KEY") or "").strip() or None
    )
    timeout_seconds: float = 3.5

    @property
    def is_configured(self) -> bool:
        """Indica se URL e chave pública anon (somente leitura com RLS) estão presentes."""
        return bool(self.url and self.anon_key)


@dataclass(frozen=True)
class AppSettings:
    """Configurações gerais do servidor HTTP e do servidor MCP."""

    app_name: str = "AcolheMulher API & MCP Server"
    app_version: str = "1.0.0"
    host: str = os.getenv("ACOLHE_HOST", "127.0.0.1")
    port: int = int(os.getenv("ACOLHE_PORT", "8000"))
    allowed_origin: str = os.getenv("ACOLHE_ALLOWED_ORIGIN", "http://localhost:3000")
    security: SecuritySettings = field(default_factory=SecuritySettings)
    supabase: SupabaseSettings = field(default_factory=SupabaseSettings)


def load_settings() -> AppSettings:
    """Fábrica responsável por construir a configuração validada da aplicação."""
    return AppSettings()
