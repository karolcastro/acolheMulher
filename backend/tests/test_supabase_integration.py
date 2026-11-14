"""Testes de segurança SSRF e fallback resiliente da integração Supabase + RLS."""

import unittest
import urllib.error

from backend.domain.exceptions import SecurityViolationError
from backend.domain.value_objects import NgoArea, ServiceCategory
from backend.infrastructure.supabase_repositories import (
    SupabaseNgoRepository,
    SupabaseServiceRepository,
)
from backend.security.ssrf_protector import SSRFProtector


class TestSupabaseIntegration(unittest.TestCase):
    """Valida proteção SSRF para PostgREST e fallback automático caso o banco esteja pausado."""

    def test_ssrf_protector_validates_supabase_rest_urls(self) -> None:
        base = "https://xyzcompany.supabase.co"
        safe = SSRFProtector.validate_supabase_url(
            "https://xyzcompany.supabase.co/rest/v1/services?select=*",
            base,
        )
        self.assertIn("/rest/v1/services", safe)

        for bad_url in (
            "http://xyzcompany.supabase.co/rest/v1/services",
            "https://evil.example.com/rest/v1/services",
            "https://xyzcompany.supabase.co/auth/v1/admin/users",
        ):
            with self.assertRaises(SecurityViolationError):
                SSRFProtector.validate_supabase_url(bad_url, base)

    def test_supabase_repositories_fallback_gracefully_when_offline_or_paused(self) -> None:
        service_repo = SupabaseServiceRepository(
            base_url="https://xyzcompany.supabase.co",
            anon_key="fake-anon-key",
        )
        ngo_repo = SupabaseNgoRepository(
            base_url="https://xyzcompany.supabase.co",
            anon_key="fake-anon-key",
        )

        # Simula indisponibilidade/pausa sem depender de internet real
        def _raise_url_error(*_args: object, **_kwargs: object) -> list[dict[str, object]]:
            raise urllib.error.URLError("offline")

        service_repo._client.fetch_rows = _raise_url_error  # type: ignore[method-assign]
        ngo_repo._client.fetch_rows = _raise_url_error  # type: ignore[method-assign]

        services = service_repo.find_by_category_and_location(ServiceCategory.SAUDE, uf="SP")
        ngos = ngo_repo.list_by_area(NgoArea.SAUDE_PARTO)

        self.assertTrue(any("Casa Angela" in s.name for s in services))
        self.assertTrue(any("Américas Amigas" in n.name for n in ngos))


if __name__ == "__main__":
    unittest.main()
