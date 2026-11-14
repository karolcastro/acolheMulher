"""
Repositório concreto em memória para consulta de Serviços Gratuitos.
"""

from backend.domain.entities import SupportService
from backend.domain.repositories import ServiceRepositoryPort
from backend.domain.value_objects import ServiceCategory
from backend.infrastructure.catalog_data import NATIONAL_SERVICES_DATA, REGIONAL_SERVICES_DATA


class InMemoryServiceRepository(ServiceRepositoryPort):
    """Implementação do ServiceRepositoryPort utilizando o catálogo curado em memória."""

    def __init__(
        self,
        national_services: tuple[SupportService, ...] = NATIONAL_SERVICES_DATA,
        regional_services: tuple[SupportService, ...] = REGIONAL_SERVICES_DATA,
    ) -> None:
        self._national = national_services
        self._regional = regional_services

    def find_by_category_and_location(
        self,
        category: ServiceCategory,
        uf: str | None = None,
        city: str | None = None,
    ) -> list[SupportService]:
        """
        Retorna serviços regionais compatíveis com UF/cidade priorizados no topo,
        seguidos pelos serviços nacionais disponíveis em todo o país.
        """
        national_matches = [
            s for s in self._national
            if category == ServiceCategory.TODOS or s.category == category
        ]

        regional_matches: list[SupportService] = []
        target_uf = uf.upper().strip() if uf else None
        target_city = city.lower().strip() if city else None

        for service in self._regional:
            if category != ServiceCategory.TODOS and service.category != category:
                continue

            if target_uf or target_city:
                matches_uf = bool(target_uf and service.state and service.state.upper() == target_uf)
                matches_city = bool(
                    target_city and service.city and target_city in service.city.lower()
                )
                if matches_uf or matches_city:
                    regional_matches.append(service)
            else:
                regional_matches.append(service)

        return [*regional_matches, *national_matches]
