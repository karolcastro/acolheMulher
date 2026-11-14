"""
Caso de Uso: Listagem de ONGs e Coletivos Gratuitos de Apoio à Mulher.
"""

from backend.application.dto import ListNgosInput, dataclass_to_dict
from backend.domain.repositories import NgoRepositoryPort
from backend.domain.value_objects import NgoArea
from backend.security.input_sanitizer import InputSanitizer


class ListNgosUseCase:
    """Consulta e filtra ONGs parceiras de saúde, parto, jurídico, acolhimento e renda."""

    def __init__(self, ngo_repository: NgoRepositoryPort, sanitizer: InputSanitizer) -> None:
        self._ngo_repository = ngo_repository
        self._sanitizer = sanitizer

    def execute(self, payload: ListNgosInput) -> dict[str, object]:
        """Retorna lista sanitizada de ONGs gratuitas por área de atuação."""
        clean_area = self._sanitizer.sanitize_text(payload.area, "area")
        area = NgoArea.from_raw(clean_area)
        ngos = self._ngo_repository.list_by_area(area)

        return {
            "area": area.value,
            "total": len(ngos),
            "ngos": [dataclass_to_dict(item) for item in ngos],
        }
