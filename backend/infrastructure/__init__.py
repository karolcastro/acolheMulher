"""
Camada de Infraestrutura (Infrastructure Layer).

Implementa as interfaces abstratas (Ports) definidas na camada de Domínio:
- Repositórios em memória sem coleta de PII.
- Gateway HTTP seguro para consulta oficial na API ViaCEP (com proteção SSRF).
"""
