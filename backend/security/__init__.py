"""
Camada Transversal de Segurança (Security Layer).

Implementa defesa em profundidade para proteger mulheres em situação de
vulnerabilidade e os serviços do servidor HTTP e MCP:
- PrivacyGuard: política Zero-PII (sem logs de CEP, voz ou IP) e cabeçalhos anti-cache.
- InputSanitizer: sanitização estrita contra XSS, caracteres de controle e payloads gigantes.
- SSRFProtector: allowlist exclusiva para consulta segura à API ViaCEP via HTTPS.
- EphemeralRateLimiter: proteção contra abuso usando chaves anônimas HMAC-SHA256.
- SecurityHeaders: cabeçalhos OWASP (CSP, X-Frame-Options, Referrer-Policy, Permissions-Policy).
- McpSecurityGuard: prevenção de Prompt Injection, validação de tools MCP e Path Traversal.
"""
