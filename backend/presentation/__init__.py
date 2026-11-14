"""
Camada de Apresentação (Presentation Layer).

Contém os controllers HTTP e o servidor HTTP puro (stdlib http.server),
responsáveis apenas por traduzir requisições HTTP para DTOs da camada Application
e aplicar cabeçalhos de segurança/privacidade em todas as respostas.
"""
