"""Testes dos Casos de Uso da camada Application com Gateway de CEP mockado (sem rede)."""

import unittest

from backend.application.dto import ListNgosInput, SearchServicesInput, VoiceQueryInput
from backend.application.emergency_orientation_use_case import EmergencyOrientationUseCase
from backend.application.list_ngos_use_case import ListNgosUseCase
from backend.application.resolve_voice_query_use_case import ResolveVoiceQueryUseCase
from backend.application.search_services_use_case import SearchServicesUseCase
from backend.domain.entities import LocationInfo
from backend.domain.repositories import CepGatewayPort
from backend.domain.value_objects import Cep
from backend.infrastructure.in_memory_ngo_repository import InMemoryNgoRepository
from backend.infrastructure.in_memory_service_repository import InMemoryServiceRepository
from backend.security.input_sanitizer import InputSanitizer


class _FakeCepGateway(CepGatewayPort):
    """Stub determinístico de CEP para testes offline rápidos e isolados."""

    def lookup_cep(self, cep: Cep) -> LocationInfo | None:
        if cep.digits == "01001000":
            return LocationInfo(cep="01001-000", city="São Paulo", uf="SP", neighborhood="Sé")
        if cep.digits == "66090000":
            return LocationInfo(cep="66090-000", city="Belém", uf="PA", neighborhood="Marco")
        return None


class TestUseCases(unittest.TestCase):
    """Valida regras de negócio de busca, parto humanizado, exames, voz e emergência."""

    def setUp(self) -> None:
        self.sanitizer = InputSanitizer()
        self.service_repo = InMemoryServiceRepository()
        self.ngo_repo = InMemoryNgoRepository()
        self.cep_gateway = _FakeCepGateway()

    def test_search_saude_filters_parto_humanizado_and_exames(self) -> None:
        uc = SearchServicesUseCase(self.service_repo, self.ngo_repo, self.cep_gateway, self.sanitizer)

        parto_res = uc.execute(SearchServicesInput(category="saude", cep="01001-000", health_filter="parto"))
        parto_names = [s["name"] for s in parto_res["services"]]  # type: ignore[index]
        self.assertTrue(any("Casa Angela" in name for name in parto_names))
        self.assertFalse(any("Américas Amigas" in name for name in parto_names))

        exames_res = uc.execute(SearchServicesInput(category="saude", cep="01001-000", health_filter="exames"))
        exames_names = [s["name"] for s in exames_res["services"]]  # type: ignore[index]
        self.assertTrue(any("Américas Amigas" in name for name in exames_names))
        self.assertTrue(any("Instituto Protea" in name for name in exames_names))

    def test_resolve_voice_query_handles_spoken_meia_and_emergency_city(self) -> None:
        uc = ResolveVoiceQueryUseCase(self.cep_gateway, self.sanitizer)

        spoken_cep = uc.execute(
            VoiceQueryInput(transcript="meu cep e meia seis zero nove zero zero zero zero")
        )
        self.assertEqual(spoken_cep["matched_by"], "cep")
        self.assertEqual(spoken_cep["location"]["uf"], "PA")  # type: ignore[index]

        spoken_emergency = uc.execute(
            VoiceQueryInput(transcript="preciso de delegacia de emergencia em Salvador")
        )
        self.assertEqual(spoken_emergency["matched_by"], "city")
        self.assertEqual(spoken_emergency["suggested_section"], "emergencia")
        self.assertEqual(spoken_emergency["location"]["uf"], "BA")  # type: ignore[index]

    def test_list_ngos_and_emergency_offline(self) -> None:
        ngo_uc = ListNgosUseCase(self.ngo_repo, self.sanitizer)
        saude_ngos = ngo_uc.execute(ListNgosInput(area="saude_parto"))
        self.assertGreaterEqual(saude_ngos["total"], 2)  # type: ignore[arg-type]

        emergency_uc = EmergencyOrientationUseCase()
        offline = emergency_uc.execute()
        numbers = {ch["number"] for ch in offline["channels"]}  # type: ignore[index]
        self.assertEqual(numbers, {"180", "190", "188", "129"})
        self.assertFalse(offline["privacy_guarantees"]["stores_cep_history"])  # type: ignore[index]


if __name__ == "__main__":
    unittest.main()
