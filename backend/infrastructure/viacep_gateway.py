"""
Adaptador seguro de consulta externa à API oficial ViaCEP.

Camadas de segurança aplicadas neste gateway:
- Validação anti-SSRF via SSRFProtector antes de abrir qualquer conexão HTTPS.
- Timeout estrito para evitar exaustão de threads.
- Redação de eventuais CEPs em mensagens de erro via PrivacyGuard.
"""

import json
import urllib.error
import urllib.request

from backend.domain.entities import LocationInfo
from backend.domain.exceptions import ExternalLookupError
from backend.domain.repositories import CepGatewayPort
from backend.domain.value_objects import Cep
from backend.security.ssrf_protector import SSRFProtector


class ViaCepGateway(CepGatewayPort):
    """Implementação do CepGatewayPort consumindo viacep.com.br via stdlib urllib."""

    def __init__(self, timeout_seconds: float = 4.0) -> None:
        self._timeout = timeout_seconds

    def lookup_cep(self, cep: Cep) -> LocationInfo | None:
        """Consulta dados públicos territoriais do CEP sem enviar cookies ou rastreadores."""
        raw_url = f"https://viacep.com.br/ws/{cep.digits}/json/"
        safe_url = SSRFProtector.validate_viacep_url(raw_url)

        request = urllib.request.Request(
            safe_url,
            headers={
                "Accept": "application/json",
                "User-Agent": "AcolheMulher-PrivacyFirst/1.0",
            },
            method="GET",
        )

        try:
            with urllib.request.urlopen(request, timeout=self._timeout) as response:
                if response.status != 200:
                    raise ExternalLookupError()
                payload = json.loads(response.read().decode("utf-8"))
        except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise ExternalLookupError(
                "Não foi possível consultar o serviço de CEP agora. Tente pelo nome da cidade."
            ) from exc

        if not isinstance(payload, dict) or payload.get("erro"):
            return None

        return LocationInfo(
            cep=str(payload.get("cep") or cep.formatted),
            city=str(payload.get("localidade") or ""),
            uf=str(payload.get("uf") or ""),
            neighborhood=str(payload.get("bairro") or ""),
            street=str(payload.get("logradouro") or ""),
            ddd=str(payload.get("ddd") or ""),
        )
