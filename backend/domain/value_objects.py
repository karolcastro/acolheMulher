"""
Objetos de Valor (Value Objects) imutáveis e auto-validáveis.

No Clean Code / DDD, Value Objects encapsulam validações de formato para que
o restante do sistema nunca opere sobre strings brutas potencialmente inválidas.
"""

from dataclasses import dataclass
from enum import Enum
import re

from backend.domain.exceptions import InvalidCategoryError, InvalidCepError, InvalidStateUfError

# Conjunto oficial das 27 Unidades Federativas do Brasil
VALID_BRAZILIAN_UFS: frozenset[str] = frozenset({
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO",
    "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI",
    "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
})


class ServiceCategory(str, Enum):
    """Categorias principais de apoio disponíveis no AcolheMulher."""

    TODOS = "todos"
    EMERGENCIA = "emergencia"
    JURIDICO = "juridico"
    PSICOLOGICO = "psicologico"
    SAUDE = "saude"
    CURSOS = "cursos"
    SOCIAL = "social"

    @classmethod
    def from_raw(cls, raw: str | None) -> "ServiceCategory":
        """Converte texto de entrada em ServiceCategory válida ou lança InvalidCategoryError."""
        if not raw:
            return cls.TODOS
        normalized = raw.strip().lower()
        for member in cls:
            if member.value == normalized:
                return member
        raise InvalidCategoryError(raw)


class HealthSubFilter(str, Enum):
    """Subfiltros da área de Saúde (Parto Humanizado, Exames Gratuitos, SUS)."""

    TODOS = "todos"
    PARTO = "parto"
    EXAMES = "exames"
    SUS = "sus"

    @classmethod
    def from_raw(cls, raw: str | None) -> "HealthSubFilter":
        """Converte texto em HealthSubFilter seguro com fallback para TODOS."""
        if not raw:
            return cls.TODOS
        normalized = raw.strip().lower()
        for member in cls:
            if member.value == normalized:
                return member
        return cls.TODOS


class NgoArea(str, Enum):
    """Áreas de atuação das ONGs parceiras e redes de apoio gratuitas."""

    TODAS = "todas"
    SAUDE_PARTO = "saude_parto"
    PSICOLOGICO_JURIDICO = "psicologico_juridico"
    ACOLHIMENTO_PROTECAO = "acolhimento_protecao"
    CURSOS_RENDA = "cursos_renda"

    @classmethod
    def from_raw(cls, raw: str | None) -> "NgoArea":
        """Converte texto em NgoArea válida com fallback para TODAS."""
        if not raw:
            return cls.TODAS
        normalized = raw.strip().lower()
        for member in cls:
            if member.value == normalized:
                return member
        return cls.TODAS


@dataclass(frozen=True)
class Cep:
    """
    Objeto de Valor que representa um Código de Endereçamento Postal brasileiro.

    Garante invariantes: sempre armazena exatamente 8 dígitos numéricos
    e formata de modo seguro como '00000-000'.
    """

    digits: str

    def __post_init__(self) -> None:
        cleaned = re.sub(r"\D", "", self.digits or "")
        if len(cleaned) != 8:
            raise InvalidCepError()
        # Como frozen=True impede atribuição direta, usamos object.__setattr__ apenas na construção
        object.__setattr__(self, "digits", cleaned)

    @property
    def formatted(self) -> str:
        """Retorna o CEP no padrão visual brasileiro XXXXX-XXX."""
        return f"{self.digits[:5]}-{self.digits[5:]}"


@dataclass(frozen=True)
class StateUF:
    """Objeto de Valor que valida uma sigla de estado brasileiro (ex.: SP, BA, DF)."""

    code: str

    def __post_init__(self) -> None:
        normalized = (self.code or "").strip().upper()
        if normalized not in VALID_BRAZILIAN_UFS:
            raise InvalidStateUfError(self.code)
        object.__setattr__(self, "code", normalized)
