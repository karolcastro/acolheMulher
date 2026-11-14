"""
Repositórios concretos conectados ao Supabase (PostgreSQL + RLS) via PostgREST.

Características de Arquitetura Limpa, Segurança e Resiliência:
- Implementam exatamente ServiceRepositoryPort e NgoRepositoryPort (DIP).
- Usam apenas a chave 'anon' (somente leitura protegida pelas políticas RLS do Supabase).
- Validam todas as URLs com SSRFProtector antes de sair para a rede.
- Possuem fallback automático para os repositórios em memória caso o Supabase esteja
  em pausa (plano gratuito após 7 dias) ou temporariamente indisponível.
"""

import json
import urllib.error
import urllib.parse
import urllib.request
from typing import Any

from backend.domain.entities import SupportNgo, SupportService
from backend.domain.repositories import NgoRepositoryPort, ServiceRepositoryPort
from backend.domain.value_objects import NgoArea, ServiceCategory
from backend.infrastructure.in_memory_ngo_repository import InMemoryNgoRepository
from backend.infrastructure.in_memory_service_repository import InMemoryServiceRepository
from backend.security.ssrf_protector import SSRFProtector


class _SupabaseRestClient:
    """Cliente HTTP mínimo sem dependências externas para consultas PostgREST com RLS."""

    def __init__(self, base_url: str, anon_key: str, timeout_seconds: float = 3.5) -> None:
        self._base_url = base_url.rstrip("/")
        self._anon_key = anon_key
        self._timeout = timeout_seconds

    def fetch_rows(self, table: str, query_params: dict[str, str]) -> list[dict[str, Any]]:
        """Executa GET somente leitura em /rest/v1/<table> respeitando políticas RLS."""
        encoded_query = urllib.parse.urlencode(query_params)
        raw_url = f"{self._base_url}/rest/v1/{table}?{encoded_query}"
        safe_url = SSRFProtector.validate_supabase_url(raw_url, self._base_url)

        request = urllib.request.Request(
            safe_url,
            headers={
                "apikey": self._anon_key,
                "Authorization": f"Bearer {self._anon_key}",
                "Accept": "application/json",
            },
            method="GET",
        )

        with urllib.request.urlopen(request, timeout=self._timeout) as response:
            if response.status != 200:
                raise RuntimeError(f"Supabase retornou status {response.status}")
            payload = json.loads(response.read().decode("utf-8"))
            if not isinstance(payload, list):
                raise ValueError("Resposta PostgREST inválida.")
            return payload


class SupabaseServiceRepository(ServiceRepositoryPort):
    """Repositório de serviços consultando PostgreSQL/Supabase com RLS e fallback seguro."""

    def __init__(
        self,
        base_url: str,
        anon_key: str,
        timeout_seconds: float = 3.5,
        fallback: ServiceRepositoryPort | None = None,
    ) -> None:
        self._client = _SupabaseRestClient(base_url, anon_key, timeout_seconds)
        self._fallback = fallback or InMemoryServiceRepository()

    def find_by_category_and_location(
        self,
        category: ServiceCategory,
        uf: str | None = None,
        city: str | None = None,
    ) -> list[SupportService]:
        """Consulta serviços verificados no Supabase (RLS) com fallback local automático."""
        params: dict[str, str] = {"select": "*"}
        if category != ServiceCategory.TODOS:
            params["category"] = f"eq.{category.value}"

        try:
            rows = self._client.fetch_rows("services", params)
            mapped = [self._map_row(row) for row in rows]
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, ValueError, RuntimeError):
            return self._fallback.find_by_category_and_location(category, uf=uf, city=city)

        if not mapped:
            return self._fallback.find_by_category_and_location(category, uf=uf, city=city)

        target_uf = uf.upper().strip() if uf else None
        target_city = city.lower().strip() if city else None

        national = [item for item in mapped if item.is_national_online]
        regional: list[SupportService] = []
        for item in mapped:
            if item.is_national_online:
                continue
            if target_uf or target_city:
                matches_uf = bool(target_uf and item.state and item.state.upper() == target_uf)
                matches_city = bool(target_city and item.city and target_city in item.city.lower())
                if matches_uf or matches_city:
                    regional.append(item)
            else:
                regional.append(item)

        return [*regional, *national]

    @staticmethod
    def _map_row(row: dict[str, Any]) -> SupportService:
        return SupportService(
            id=str(row["id"]),
            name=str(row["name"]),
            category=ServiceCategory.from_raw(str(row["category"])),
            subcategory=str(row["subcategory"]),
            description=str(row["description"]),
            is_national_online=bool(row.get("is_national_online", False)),
            state=str(row["state"]) if row.get("state") else None,
            city=str(row["city"]) if row.get("city") else None,
            neighborhood=str(row["neighborhood"]) if row.get("neighborhood") else None,
            address=str(row["address"]) if row.get("address") else None,
            phone=str(row["phone"]) if row.get("phone") else None,
            whatsapp=str(row["whatsapp"]) if row.get("whatsapp") else None,
            website=str(row["website"]) if row.get("website") else None,
            hours=str(row["hours"]),
            access_mode=str(row["access_mode"]),
            requires_registration=bool(row.get("requires_registration", False)),
            free_confirmation=str(row["free_confirmation"]),
            tags=tuple(str(t) for t in (row.get("tags") or ())),
            tips_for_woman=str(row["tips_for_woman"]) if row.get("tips_for_woman") else None,
        )


class SupabaseNgoRepository(NgoRepositoryPort):
    """Repositório de ONGs consultando PostgreSQL/Supabase com RLS e fallback seguro."""

    def __init__(
        self,
        base_url: str,
        anon_key: str,
        timeout_seconds: float = 3.5,
        fallback: NgoRepositoryPort | None = None,
    ) -> None:
        self._client = _SupabaseRestClient(base_url, anon_key, timeout_seconds)
        self._fallback = fallback or InMemoryNgoRepository()

    def list_by_area(self, area: NgoArea = NgoArea.TODAS) -> list[SupportNgo]:
        params: dict[str, str] = {"select": "*"}
        if area != NgoArea.TODAS:
            params["area"] = f"eq.{area.value}"
        try:
            rows = self._client.fetch_rows("ngos", params)
            mapped = [self._map_row(row) for row in rows]
            return mapped or self._fallback.list_by_area(area)
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError, ValueError, RuntimeError):
            return self._fallback.list_by_area(area)

    def find_by_related_category(self, category: ServiceCategory) -> list[SupportNgo]:
        all_ngos = self.list_by_area(NgoArea.TODAS)
        if category == ServiceCategory.TODOS:
            return all_ngos
        return [ngo for ngo in all_ngos if category in ngo.related_categories]

    @staticmethod
    def _map_row(row: dict[str, Any]) -> SupportNgo:
        raw_cats = row.get("related_categories") or ()
        return SupportNgo(
            id=str(row["id"]),
            name=str(row["name"]),
            organization=str(row["organization"]),
            area=NgoArea.from_raw(str(row["area"])),
            area_label=str(row["area_label"]),
            coverage=str(row["coverage"]),
            summary=str(row["summary"]),
            how_they_help=tuple(str(item) for item in (row.get("how_they_help") or ())),
            access_channel=str(row["access_channel"]),
            website_url=str(row["website_url"]),
            related_categories=tuple(ServiceCategory.from_raw(str(c)) for c in raw_cats),
            featured=bool(row.get("featured", False)),
        )
