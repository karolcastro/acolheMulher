"""
Repositório concreto em memória para consulta de ONGs e coletivos de apoio.
"""

from backend.domain.entities import SupportNgo
from backend.domain.repositories import NgoRepositoryPort
from backend.domain.value_objects import NgoArea, ServiceCategory
from backend.infrastructure.catalog_data import SUPPORT_NGOS_DATA


class InMemoryNgoRepository(NgoRepositoryPort):
    """Implementação do NgoRepositoryPort com busca por área e categoria relacionada."""

    def __init__(self, ngos: tuple[SupportNgo, ...] = SUPPORT_NGOS_DATA) -> None:
        self._ngos = ngos

    def list_by_area(self, area: NgoArea = NgoArea.TODAS) -> list[SupportNgo]:
        """Filtra ONGs por área de atuação ou retorna todas quando área = TODAS."""
        if area == NgoArea.TODAS:
            return list(self._ngos)
        return [ngo for ngo in self._ngos if ngo.area == area]

    def find_by_related_category(self, category: ServiceCategory) -> list[SupportNgo]:
        """Retorna ONGs que atendem uma categoria específica de necessidade."""
        if category == ServiceCategory.TODOS:
            return list(self._ngos)
        return [ngo for ngo in self._ngos if category in ngo.related_categories]
