"""
Composition Root (Ponto de Entrada Principal) do Backend Python AcolheMulher.

Conecta todas as camadas da Arquitetura Limpa (Config -> Security -> Infrastructure
-> Application -> MCP -> Presentation) seguindo Injeção de Dependências explícita.

Modos de execução:
- API REST + MCP HTTP:  python3 -m backend.main
- Servidor MCP STDIO:   python3 -m backend.mcp.server
- Suíte de Testes:      python3 -m unittest discover -s backend/tests -v
"""

from backend.application.emergency_orientation_use_case import EmergencyOrientationUseCase
from backend.application.list_ngos_use_case import ListNgosUseCase
from backend.application.resolve_voice_query_use_case import ResolveVoiceQueryUseCase
from backend.application.search_services_use_case import SearchServicesUseCase
from backend.config.settings import AppSettings, load_settings
from backend.domain.repositories import NgoRepositoryPort, ServiceRepositoryPort
from backend.infrastructure.in_memory_ngo_repository import InMemoryNgoRepository
from backend.infrastructure.in_memory_service_repository import InMemoryServiceRepository
from backend.infrastructure.supabase_repositories import (
    SupabaseNgoRepository,
    SupabaseServiceRepository,
)
from backend.infrastructure.viacep_gateway import ViaCepGateway
from backend.mcp.resources import McpResourceRegistry
from backend.mcp.server import AcolheMulherMcpServer
from backend.mcp.tools import McpToolRegistry
from backend.presentation.controllers import ApiControllers
from backend.presentation.http_server import create_http_server
from backend.security.input_sanitizer import InputSanitizer
from backend.security.mcp_auth_guard import McpSecurityGuard
from backend.security.rate_limiter import EphemeralRateLimiter


def build_application(settings: AppSettings | None = None) -> tuple[ApiControllers, AcolheMulherMcpServer]:
    """
    Constrói o grafo completo de dependências da aplicação (Dependency Injection).
    Separar a montagem facilita testes unitários e de integração sem subir sockets.
    """
    cfg = settings or load_settings()

    # 1. Camada de Segurança
    sanitizer = InputSanitizer(max_length=cfg.security.max_input_length)
    rate_limiter = EphemeralRateLimiter(
        ephemeral_secret=cfg.security.ephemeral_hmac_secret,
        max_requests=cfg.security.rate_limit_max_requests,
        window_seconds=cfg.security.rate_limit_window_seconds,
    )
    mcp_guard = McpSecurityGuard(partner_api_token=cfg.security.partner_api_token)

    # 2. Camada de Infraestrutura (Supabase + RLS quando configurado, com fallback local)
    fallback_services = InMemoryServiceRepository()
    fallback_ngos = InMemoryNgoRepository()

    service_repo: ServiceRepositoryPort
    ngo_repo: NgoRepositoryPort
    if cfg.supabase.is_configured and cfg.supabase.url and cfg.supabase.anon_key:
        service_repo = SupabaseServiceRepository(
            base_url=cfg.supabase.url,
            anon_key=cfg.supabase.anon_key,
            timeout_seconds=cfg.supabase.timeout_seconds,
            fallback=fallback_services,
        )
        ngo_repo = SupabaseNgoRepository(
            base_url=cfg.supabase.url,
            anon_key=cfg.supabase.anon_key,
            timeout_seconds=cfg.supabase.timeout_seconds,
            fallback=fallback_ngos,
        )
    else:
        service_repo = fallback_services
        ngo_repo = fallback_ngos

    cep_gateway = ViaCepGateway(timeout_seconds=cfg.security.external_http_timeout_seconds)

    # 3. Camada de Aplicação (Casos de Uso)
    search_uc = SearchServicesUseCase(service_repo, ngo_repo, cep_gateway, sanitizer)
    voice_uc = ResolveVoiceQueryUseCase(cep_gateway, sanitizer)
    ngo_uc = ListNgosUseCase(ngo_repo, sanitizer)
    emergency_uc = EmergencyOrientationUseCase()

    # 4. Camada MCP (Tools, Resources, Prompts e Protocolo JSON-RPC 2.0)
    mcp_server = AcolheMulherMcpServer(
        server_name=cfg.app_name,
        server_version=cfg.app_version,
        tool_registry=McpToolRegistry(search_uc, voice_uc, ngo_uc, emergency_uc, mcp_guard),
        resource_registry=McpResourceRegistry(search_uc, emergency_uc, mcp_guard),
        rate_limiter=rate_limiter,
    )

    # 5. Camada de Apresentação (Controllers HTTP)
    controllers = ApiControllers(
        search_services=search_uc,
        resolve_voice=voice_uc,
        list_ngos=ngo_uc,
        emergency_orientation=emergency_uc,
        mcp_server=mcp_server,
        rate_limiter=rate_limiter,
        mcp_guard=mcp_guard,
    )

    return controllers, mcp_server


def main() -> None:
    """Inicializa o servidor HTTP + MCP do AcolheMulher."""
    settings = load_settings()
    controllers, _ = build_application(settings)
    server = create_http_server(
        host=settings.host,
        port=settings.port,
        allowed_origin=settings.allowed_origin,
        controllers=controllers,
    )
    print(f"{settings.app_name} ativo em http://{settings.host}:{settings.port} (Zero-PII ativo)")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.server_close()


if __name__ == "__main__":
    main()
