"""
Entidades de Domínio puras e imutáveis do AcolheMulher.

Cada entidade representa um conceito central do atendimento às mulheres:
- LocationInfo: localização resolvida sem armazenar dados pessoais (apenas CEP/cidade/UF).
- SupportService: serviço gratuito (SUS, Casa de Parto Humanizado, ONG de exames, DEAM, Defensoria, curso).
- SupportNgo: ONG ou coletivo de apoio gratuito verificado.
- EmergencyChannel: linha direta de emergência que funciona mesmo offline/sem créditos.
"""

from dataclasses import dataclass, field

from backend.domain.value_objects import NgoArea, ServiceCategory


@dataclass(frozen=True)
class LocationInfo:
    """Representa uma localização territorial obtida via CEP ou nome da cidade."""

    cep: str
    city: str
    uf: str
    neighborhood: str = ""
    street: str = ""
    ddd: str = ""


@dataclass(frozen=True)
class SupportService:
    """Representa um serviço público, filantrópico ou de ONG 100% gratuito."""

    id: str
    name: str
    category: ServiceCategory
    subcategory: str
    description: str
    hours: str
    access_mode: str
    free_confirmation: str
    is_national_online: bool = False
    state: str | None = None
    city: str | None = None
    neighborhood: str | None = None
    address: str | None = None
    phone: str | None = None
    whatsapp: str | None = None
    website: str | None = None
    requires_registration: bool = False
    tags: tuple[str, ...] = field(default_factory=tuple)
    tips_for_woman: str | None = None


@dataclass(frozen=True)
class SupportNgo:
    """Representa uma ONG que oferece auxílio gratuito sem fins lucrativos."""

    id: str
    name: str
    organization: str
    area: NgoArea
    area_label: str
    coverage: str
    summary: str
    how_they_help: tuple[str, ...]
    access_channel: str
    website_url: str
    related_categories: tuple[ServiceCategory, ...]
    featured: bool = False


@dataclass(frozen=True)
class EmergencyChannel:
    """Canal oficial de socorro imediato (funciona por telefone mesmo sem internet)."""

    number: str
    name: str
    description: str
    availability: str
    cost: str
    safety_tip: str
