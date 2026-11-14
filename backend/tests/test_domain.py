"""Testes unitários da camada de Domínio (Value Objects e exceções)."""

import unittest

from backend.domain.exceptions import InvalidCategoryError, InvalidCepError, InvalidStateUfError
from backend.domain.value_objects import Cep, ServiceCategory, StateUF


class TestDomainValueObjects(unittest.TestCase):
    """Valida invariantes dos Value Objects de domínio."""

    def test_cep_normalizes_and_formats(self) -> None:
        cep = Cep("01001-000")
        self.assertEqual(cep.digits, "01001000")
        self.assertEqual(cep.formatted, "01001-000")

    def test_invalid_cep_raises_domain_error(self) -> None:
        with self.assertRaises(InvalidCepError):
            Cep("1234")

    def test_state_uf_validates_official_states(self) -> None:
        uf = StateUF("ba")
        self.assertEqual(uf.code, "BA")
        with self.assertRaises(InvalidStateUfError):
            StateUF("XX")

    def test_service_category_rejects_unknown_category(self) -> None:
        self.assertEqual(ServiceCategory.from_raw("saude"), ServiceCategory.SAUDE)
        with self.assertRaises(InvalidCategoryError):
            ServiceCategory.from_raw("inexistente")


if __name__ == "__main__":
    unittest.main()
