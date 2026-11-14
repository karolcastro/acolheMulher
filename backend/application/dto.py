"""
Data Transfer Objects (DTOs) para comunicação limpa entre Camadas.

Evita expor entidades internas diretamente e padroniza entradas e saídas
dos Casos de Uso para os controladores HTTP e ferramentas MCP.
"""

from dataclasses import asdict, dataclass


@dataclass(frozen=True)
class SearchServicesInput:
    """Parâmetros de entrada para busca de serviços gratuitos por localização."""

    category: str = "todos"
    cep: str | None = None
    uf: str | None = None
    city: str | None = None
    health_filter: str = "todos"


@dataclass(frozen=True)
class VoiceQueryInput:
    """Parâmetros recebidos da transcrição de voz (Web Speech API)."""

    transcript: str


@dataclass(frozen=True)
class ListNgosInput:
    """Parâmetros para listagem e filtragem de ONGs parceiras."""

    area: str = "todas"


def dataclass_to_dict(instance: object) -> dict[str, object]:
    """Converte uma dataclass de domínio/DTO em dicionário serializável em JSON."""
    return asdict(instance)  # type: ignore[arg-type]
