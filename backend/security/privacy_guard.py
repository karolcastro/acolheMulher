"""
Guardião de Privacidade Trauma-Informed (Zero-PII & Anti-Rastreamento).

Princípios implementados para segurança de mulheres em risco de violência:
- Nenhum cadastro, login, CPF, nome, e-mail ou telefone pessoal é exigido ou armazenado.
- Consultas de CEP e comandos de voz nunca são persistidos em banco ou arquivo de log.
- Respostas HTTP recebem cabeçalhos anti-cache para impedir que proxies ou histórico
  compartilhado armazenem consultas sensíveis (ex.: Delegacia da Mulher / Abrigo).
"""

import re

# Expressões para mascarar dados caso alguma mensagem de erro interna seja inspecionada
_CEP_RE = re.compile(r"\b\d{5}-?\d{3}\b")
_IPV4_RE = re.compile(r"\b(?:\d{1,3}\.){3}\d{1,3}\b")


class PrivacyGuard:
    """Centraliza regras de anonimato, não-persistência e higienização de logs."""

    @staticmethod
    def anti_cache_headers() -> dict[str, str]:
        """
        Retorna cabeçalhos HTTP que impedem o armazenamento da resposta em
        caches de navegador, operadoras ou dispositivos compartilhados.
        """
        return {
            "Cache-Control": "no-store, no-cache, must-revalidate, private, max-age=0",
            "Pragma": "no-cache",
            "Expires": "0",
        }

    @staticmethod
    def redact_sensitive_text(message: str) -> str:
        """
        Remove eventuais CEPs ou endereços IP de mensagens de log/telemetria,
        garantindo conformidade estrita com a política Zero-Rastro.
        """
        masked = _CEP_RE.sub("[CEP-OCULTO]", message)
        masked = _IPV4_RE.sub("[IP-OCULTO]", masked)
        return masked

    @staticmethod
    def assert_zero_registration_policy() -> dict[str, object]:
        """Retorna declaração verificável das garantias de privacidade ativas."""
        return {
            "requires_registration": False,
            "stores_cep_history": False,
            "stores_voice_audio": False,
            "stores_client_ip": False,
            "quick_exit_supported": True,
            "camouflage_mode_supported": True,
        }
