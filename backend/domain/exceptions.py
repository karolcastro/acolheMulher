"""
Exceções semânticas da camada de Domínio e Segurança.

Permite que os casos de uso e adaptadores (HTTP / MCP) traduzam falhas
de negócio de forma padronizada, sem vazar detalhes internos de sistema.
"""


class DomainError(Exception):
    """Exceção base para violações de regra de negócio."""

    def __init__(self, message: str, code: str = "DOMAIN_ERROR") -> None:
        super().__init__(message)
        self.message = message
        self.code = code


class InvalidCepError(DomainError):
    """Lançada quando o CEP informado não possui exatamente 8 dígitos válidos."""

    def __init__(self, message: str = "O CEP deve conter exatamente 8 dígitos numéricos.") -> None:
        super().__init__(message=message, code="INVALID_CEP")


class InvalidStateUfError(DomainError):
    """Lançada quando a sigla da Unidade Federativa (UF) não é brasileira."""

    def __init__(self, uf: str) -> None:
        super().__init__(message=f"UF inválida: {uf}.", code="INVALID_UF")


class InvalidCategoryError(DomainError):
    """Lançada quando a categoria de apoio solicitada não existe no domínio."""

    def __init__(self, category: str) -> None:
        super().__init__(message=f"Categoria não suportada: {category}.", code="INVALID_CATEGORY")


class SecurityViolationError(DomainError):
    """Lançada pelas camadas de segurança ao detectar tentativa de ataque ou abuso."""

    def __init__(self, message: str, code: str = "SECURITY_VIOLATION") -> None:
        super().__init__(message=message, code=code)


class RateLimitExceededError(SecurityViolationError):
    """Lançada quando uma origem excede o limite seguro de requisições por minuto."""

    def __init__(self) -> None:
        super().__init__(
            message="Muitas consultas em sequência. Aguarde alguns segundos e tente novamente.",
            code="RATE_LIMIT_EXCEEDED",
        )


class ExternalLookupError(DomainError):
    """Lançada quando uma fonte externa (ex.: ViaCEP) falha ou fica indisponível."""

    def __init__(self, message: str = "Não foi possível consultar o CEP no momento.") -> None:
        super().__init__(message=message, code="EXTERNAL_LOOKUP_ERROR")
