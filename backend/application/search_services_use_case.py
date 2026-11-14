"""
Caso de Uso: Busca de Serviços Gratuitos por Localização e Categoria.

Fluxo executado:
1. Sanitiza todas as entradas recebidas (InputSanitizer).
2. Se um CEP for informado, valida via Value Object Cep e consulta o CepGatewayPort.
3. Valida a categoria (ServiceCategory) e o subfiltro de saúde (HealthSubFilter).
4. Consulta serviços compatíveis no ServiceRepositoryPort e ONGs relacionadas no NgoRepositoryPort.
5. Retorna resposta estruturada sem registrar histórico da usuária.
"""

from backend.application.dto import SearchServicesInput, dataclass_to_dict
from backend.domain.entities import LocationInfo, SupportNgo, SupportService
from backend.domain.repositories import CepGatewayPort, NgoRepositoryPort, ServiceRepositoryPort
from backend.domain.value_objects import Cep, HealthSubFilter, ServiceCategory, StateUF
from backend.security.input_sanitizer import InputSanitizer


class SearchServicesUseCase:
    """Orquestra a pesquisa territorial de serviços gratuitos sem cadastro."""

    def __init__(
        self,
        service_repository: ServiceRepositoryPort,
        ngo_repository: NgoRepositoryPort,
        cep_gateway: CepGatewayPort,
        sanitizer: InputSanitizer,
    ) -> None:
        self._service_repository = service_repository
        self._ngo_repository = ngo_repository
        self._cep_gateway = cep_gateway
        self._sanitizer = sanitizer

    def execute(self, payload: SearchServicesInput) -> dict[str, object]:
        """Executa a busca territorial e aplica filtros específicos (ex.: Saúde/Parto/Exames)."""
        clean_category = self._sanitizer.sanitize_text(payload.category, "category")
        clean_cep = self._sanitizer.sanitize_text(payload.cep, "cep")
        clean_uf = self._sanitizer.sanitize_text(payload.uf, "uf")
        clean_city = self._sanitizer.sanitize_text(payload.city, "city")
        clean_health_filter = self._sanitizer.sanitize_text(payload.health_filter, "health_filter")

        category = ServiceCategory.from_raw(clean_category)
        health_filter = HealthSubFilter.from_raw(clean_health_filter)

        resolved_location: LocationInfo | None = None
        target_uf: str | None = StateUF(clean_uf).code if clean_uf else None
        target_city: str | None = clean_city or None

        if clean_cep:
            validated_cep = Cep(clean_cep)
            resolved_location = self._cep_gateway.lookup_cep(validated_cep)
            if resolved_location is not None:
                target_uf = resolved_location.uf
                target_city = resolved_location.city

        services = self._service_repository.find_by_category_and_location(
            category=category,
            uf=target_uf,
            city=target_city,
        )

        if category == ServiceCategory.SAUDE and health_filter != HealthSubFilter.TODOS:
            services = self._apply_health_subfilter(services, health_filter)

        related_ngos: list[SupportNgo] = self._ngo_repository.find_by_related_category(category)

        return {
            "location": dataclass_to_dict(resolved_location) if resolved_location else None,
            "category": category.value,
            "health_filter": health_filter.value,
            "total_services": len(services),
            "services": [dataclass_to_dict(item) for item in services],
            "related_ngos": [dataclass_to_dict(ngo) for ngo in related_ngos],
            "requires_registration": False,
        }

    @staticmethod
    def _apply_health_subfilter(
        services: list[SupportService],
        health_filter: HealthSubFilter,
    ) -> list[SupportService]:
        """Filtra serviços de saúde entre Parto Humanizado, Exames Gratuitos e SUS."""
        filtered: list[SupportService] = []
        for item in services:
            searchable = f"{item.subcategory} {item.name}".lower()
            is_parto = (
                "parto humanizado" in searchable
                or "casa de parto" in searchable
                or "casa do parto" in searchable
            )
            is_exames = (
                "exame" in searchable
                or "mamografia" in searchable
                or "papanicolau" in searchable
            )

            if health_filter == HealthSubFilter.PARTO and is_parto:
                filtered.append(item)
            elif health_filter == HealthSubFilter.EXAMES and is_exames:
                filtered.append(item)
            elif health_filter == HealthSubFilter.SUS and not is_parto and not is_exames:
                filtered.append(item)

        return filtered
