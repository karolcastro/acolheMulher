"""
Caso de Uso: Orientação de Emergência e Acesso Offline.

Fornece os canais públicos gratuitos (180, 190, 188, 129), instruções de
segurança digital (Sair Rápido, Modo Disfarce) e guia de acesso offline PWA.
"""

from backend.application.dto import dataclass_to_dict
from backend.domain.entities import EmergencyChannel
from backend.security.privacy_guard import PrivacyGuard


class EmergencyOrientationUseCase:
    """Retorna informações vitais de emergência que funcionam mesmo offline."""

    _OFFLINE_CHANNELS: tuple[EmergencyChannel, ...] = (
        EmergencyChannel(
            number="180",
            name="Central de Atendimento à Mulher — Ligue 180",
            description="Orientação jurídica, acolhimento e encaminhamento para rede de proteção.",
            availability="24 horas por dia, 7 dias por semana",
            cost="Ligação gratuita, funciona mesmo sem créditos",
            safety_tip="Também atende via WhatsApp oficial (61) 96100-0180.",
        ),
        EmergencyChannel(
            number="190",
            name="Polícia Militar — Emergência Imediata",
            description="Socorro policial em risco iminente, agressão ou descumprimento de medida protetiva.",
            availability="24 horas por dia",
            cost="Ligação gratuita de emergência",
            safety_tip="Se não puder falar alto, informe o endereço pausadamente e deixe a linha aberta.",
        ),
        EmergencyChannel(
            number="188",
            name="Centro de Valorização da Vida (CVV)",
            description="Escuta emocional confidencial e gratuita para momentos de crise.",
            availability="24 horas por dia",
            cost="Ligação gratuita e anônima",
            safety_tip="Não exige nome verdadeiro nem documento.",
        ),
        EmergencyChannel(
            number="129",
            name="Defensoria Pública Estadual",
            description="Orientação jurídica e pedido gratuito de medidas protetivas, guarda e pensão.",
            availability="Horário comercial (com plantões de urgência nos estados)",
            cost="100% gratuito",
            safety_tip="Atende mesmo sem todos os documentos no primeiro comparecimento.",
        ),
    )

    def execute(self) -> dict[str, object]:
        """Retorna pacote compacto pronto para cache offline e uso emergencial."""
        return {
            "offline_ready": True,
            "channels": [dataclass_to_dict(c) for c in self._OFFLINE_CHANNELS],
            "privacy_guarantees": PrivacyGuard.assert_zero_registration_policy(),
            "digital_safety": [
                "Use a tecla ESC ou o botão Sair Rápido para redirecionar imediatamente ao Google.",
                "Ative o botão Disfarçar para exibir uma receita culinária caso alguém se aproxime.",
                "Instale o app pelo navegador (Adicionar à Tela Inicial) para não deixar histórico na loja de aplicativos.",
            ],
        }
