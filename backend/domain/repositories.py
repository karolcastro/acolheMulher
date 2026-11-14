"""
Interfaces Abstratas (Ports / Repositories) da Camada de Domínio.

Seguindo o Princípio da Inversão de Dependência (DIP - SOLID), os casos de uso
dependem apenas destas interfaces abstratas, nunca de detalhes como ViaCEP,
arquivos JSON ou banco de dados.
"""

from abc import ABC, abstractmethod

from backend.domain.entities import LocationInfo, SupportNgo, SupportService
from backend.domain.value_objects import Cep, NgoArea, ServiceCategory


class ServiceRepositoryPort(ABC):
    """Contrato para consulta de serviços gratuitos nacionais e regionais."""

    @abstractmethod
    def find_by_category_and_location(
        self,
        category: ServiceCategory,
        uf: str | None = None,
        city: str | None = None,
    ) -> list[SupportService]:
        """Retorna serviços compatíveis com a categoria e localidade informadas."""


class NgoRepositoryPort(ABC):
    """Contrato para consulta de ONGs e coletivos de apoio."""

    @abstractmethod
    def list_by_area(self, area: NgoArea = NgoArea.TODAS) -> list[SupportNgo]:
        """Lista ONGs filtrando opcionalmente pela área de atuação."""

    @abstractmethod
    def find_by_related_category(self, category: ServiceCategory) -> list[SupportNgo]:
        """Retorna ONGs relacionadas a uma categoria específica de atendimento."""


class CepGatewayPort(ABC):
    """Contrato para resolução externa de CEP (ex.: ViaCEP)."""

    @abstractmethod
    def lookup_cep(self, cep: Cep) -> LocationInfo | None:
        """Consulta cidade, bairro e UF a partir de um CEP validado."""
