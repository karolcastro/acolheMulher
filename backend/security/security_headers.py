"""
Cabeçalhos de Segurança HTTP recomendados pela OWASP.

Protege o frontend e os endpoints da API contra Clickjacking, MIME-sniffing,
vazamento de Referer (crucial quando uma mulher acessa serviços de proteção)
e restrição de permissões do dispositivo (permitindo microfone apenas na própria origem
para a busca por voz já implementada no AcolheMulher).
"""


class SecurityHeadersBuilder:
    """Constrói o conjunto completo de cabeçalhos defensivos para respostas HTTP."""

    @staticmethod
    def build(allowed_origin: str) -> dict[str, str]:
        """Retorna mapa imutável de cabeçalhos HTTP de segurança."""
        return {
            # Impede que navegadores adivinhem o MIME-type (anti-MIME sniffing)
            "X-Content-Type-Options": "nosniff",
            # Protege endpoints da API contra embutimento malicioso (Clickjacking)
            "X-Frame-Options": "DENY",
            # Nunca envia a URL anterior em links externos (ex.: ao abrir link de ONG ou WhatsApp)
            "Referrer-Policy": "no-referrer",
            # Restringe APIs sensíveis do aparelho; mantém microfone na própria origem para busca por voz
            "Permissions-Policy": "geolocation=(), camera=(), microphone=(self)",
            # Política restritiva para respostas JSON/API
            "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none';",
            # Força HTTPS em navegadores compatíveis
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            # CORS estrito para o domínio configurado do frontend
            "Access-Control-Allow-Origin": allowed_origin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
        }
