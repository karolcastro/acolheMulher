# Arquitetura técnica — AcolheMulher

Este documento descreve a arquitetura observada no código do repositório. Ele não presume que todos os serviços estejam implantados ou configurados em produção.

## 1. Visão geral

O repositório contém três blocos de execução:

1. **Frontend React/Vite:** aplicação de navegação e consulta de serviços.
2. **Endpoints TypeScript:** funções HTTP em `api/` para CNES e transcrição, além de `server.ts` para execução Express própria e desenvolvimento local.
3. **Backend Python independente:** API REST e servidor MCP, com arquitetura em camadas e integração opcional ao Supabase.

O frontend não inicializa automaticamente o backend Python. A implantação do backend Python exige um serviço de execução próprio e configuração de CORS.

## 2. Frontend

### Tecnologias

- React 19 e TypeScript.
- Vite 8 e Tailwind CSS 4.
- Lucide React e Motion.
- `vite-plugin-pwa` com Workbox.

### Organização

- `src/App.tsx`: composição da aplicação, navegação entre seções, estado de localização, saída rápida e abertura das orientações offline.
- `src/components/`: telas e componentes, incluindo busca, cartões de serviço, área de ONGs, triagem, camuflagem, integração e gerador de widget.
- `src/context/CatalogContext.tsx`: estado e carregamento do catálogo local/remoto, sincronização Realtime quando disponível e submissão de organizações.
- `src/data/`: catálogo estático de serviços, ONGs e dados auxiliares.
- `src/hooks/`: estado de conectividade, instalação PWA, unidades SUS próximas e reconhecimento de voz.
- `src/utils/`: proximidade por CEP, busca de saúde, análise de demanda e interpretação de consulta por voz.
- `src/lib/supabaseClient.ts`: cliente Supabase e mapeamento/validação dos registros recebidos.

### Catálogo

O catálogo inicial é carregado a partir dos módulos locais em `src/data/`. Quando as variáveis públicas Supabase estão configuradas, o contexto consulta as tabelas `services` e `ngos`, combina os registros remotos com os dados locais e pode receber alterações via Supabase Realtime. Em caso de indisponibilidade, os dados locais servem como fallback.

O cliente considera serviços públicos elegíveis quando estão ativos, verificados e não exigem cadastro. O mapeamento também valida categorias, modo de acesso e URLs externas.

## 3. APIs TypeScript

### Rotas serverless em `api/`

| Método | Rota | Arquivo | Responsabilidade |
|---|---|---|---|
| GET | `/api/cnes-public` | `api/cnes-public.ts` | Consulta unidades públicas elegíveis na API CNES; aceita código IBGE ou cidade/UF e, opcionalmente, coordenadas para ordenar/limitar por distância |
| POST | `/api/transcribe` | `api/transcribe.ts` | Recebe áudio Base64, valida tipo/tamanho, encaminha para Gemini e devolve transcrição |

Essas rotas dependem da plataforma que interpreta a pasta `api/` como funções serverless e das variáveis de ambiente correspondentes.

### Servidor Express em `server.ts`

O script `npm run dev` executa `tsx server.ts`. O Express expõe:

| Método | Rota | Responsabilidade |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/cnes-public` | Encaminha para o handler CNES |
| POST | `/api/transcribe` | Transcrição Gemini |

Em modo não produção, o servidor usa o middleware do Vite. Em modo produção, serve arquivos estáticos de `dist/` e faz fallback de navegação para `index.html`. A configuração Vercel atual executa o build Vite; ela não inicia esse Express como processo persistente.

## 4. Backend Python

### Organização em camadas

- `backend/domain/`: entidades, value objects, exceções e contratos de repositório.
- `backend/application/`: casos de uso de busca de serviços, listagem de ONGs, resolução de consulta por voz e orientação emergencial.
- `backend/infrastructure/`: catálogo local em memória, repositórios Supabase e gateway ViaCEP.
- `backend/presentation/`: controllers e servidor HTTP.
- `backend/security/`: sanitização, proteção de privacidade, rate limiting, proteção SSRF, cabeçalhos e guarda de autenticação MCP.
- `backend/mcp/`: protocolo JSON-RPC 2.0, tools, resources e servidor MCP.
- `backend/tests/`: testes unitários e de integração.

O ponto de composição é `backend/main.py`. A função `build_application` instancia as dependências e escolhe repositórios Supabase quando URL e chave anon estão presentes; caso contrário, utiliza repositórios em memória.

### Rotas HTTP Python

| Método | Rota | Finalidade |
|---|---|---|
| GET | `/api/health` | Verificação de saúde |
| GET | `/api/services` | Busca de serviços por CEP, UF, cidade e categoria |
| GET | `/api/ngos` | Listagem de ONGs por área |
| GET | `/api/emergency/offline` | Telefones essenciais e orientações de segurança |
| GET | `/api/partners/export` | Exportação de dados para parceiros, com validação opcional de token conforme configuração |
| POST | `/api/voice/resolve` | Interpretação de transcrição em português |
| POST | `/mcp` | Transporte HTTP do MCP por JSON-RPC 2.0 |

O backend também possui transporte MCP por STDIO, executado por `python3 -m backend.mcp.server`.

### MCP

As tools são registradas em `backend/mcp/tools.py`; resources em `backend/mcp/resources.py`. O servidor implementa métodos do protocolo MCP e utiliza guarda de segurança para operações de parceiro. A disponibilidade de uma integração MCP externa depende de configurar e iniciar esse processo; sua presença no código não significa que esteja conectado a um cliente MCP.

## 5. Integrações externas

| Integração | Onde é utilizada | Dependência / observação |
|---|---|---|
| ViaCEP | Frontend e backend Python | Consulta de endereço a partir de CEP |
| IBGE | `api/cnes-public.ts` | Resolve código municipal a partir de cidade/UF |
| CNES / Ministério da Saúde | `api/cnes-public.ts` | Consulta estabelecimentos e filtra registros elegíveis |
| Gemini | `api/transcribe.ts` e `server.ts` | Transcrição de áudio; exige chave de servidor |
| Supabase | Frontend e backend Python | Catálogo, organizações e analytics; exige URL/chave e schema compatível |
| Web Speech API | Hook de voz do frontend | Depende de suporte e comportamento do navegador |

A busca por voz tem mais de um caminho: reconhecimento de fala nativo do navegador e gravação/transcrição no servidor. O uso de um caminho depende do suporte e do estado do navegador e da disponibilidade da chave Gemini.

## 6. PWA e modo offline

A configuração PWA está em `vite.config.ts`. O Workbox precacheia arquivos do build que correspondem aos padrões configurados e mantém cache de fontes Google. A navegação da API é excluída do fallback de navegação.

O modal de acesso offline apresenta instruções e telefones essenciais. Não há evidência na configuração atual de que todo o catálogo, respostas das APIs ou conteúdo dinâmico seja armazenado para consulta offline. Portanto, a documentação não deve prometer disponibilidade offline de serviços locais ou atualização de dados sem internet.

## 7. Widget e integração de parceiros

A interface `WidgetGenerator.tsx` permite escolher formato/tema e gerar um trecho iframe. O código gerado aponta para `https://acolhemulher.org/embed`. No código de rotas do frontend inspecionado não foi localizada uma implementação de página/endpoint `/embed`; portanto, o gerador de snippet existe, mas a entrega funcional do conteúdo embutido depende da implementação/publicação dessa rota e do domínio. Não divulgar o widget como integração operacional até validar esse endpoint.

A área de parceiros também permite submeter dados de ONGs. A persistência remota depende do Supabase e da função RPC `register_ngo_candidate`; sem conexão, o próprio contexto informa que o registro fica apenas na sessão atual.

## 8. Execução e variáveis

Frontend/Express local:

```bash
npm install
npm run dev
```

Build frontend:

```bash
npm run build
npm run preview
```

Backend Python:

```bash
python3 -m backend.main
```

Variáveis principais:
- Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
- Gemini: `GEMINI_API_KEY` (ou `GOOGLE_API_KEY`).
- Python: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ACOLHE_ALLOWED_ORIGIN`, `ACOLHE_HOST`, `ACOLHE_PORT`, `ACOLHE_PARTNER_TOKEN`, `ACOLHE_EPHEMERAL_SECRET`.

Consulte [DEPLOY_VERCEL_SUPABASE.md](../DEPLOY_VERCEL_SUPABASE.md) para os passos de implantação.
