# Implantação — AcolheMulher (Vercel, Supabase e backend Python)

Este guia descreve os componentes presentes no repositório. Frontend, funções TypeScript e backend Python têm processos de implantação diferentes.

## 1. Componentes

- **Frontend:** Vite/React, build em `dist/`.
- **Funções serverless TypeScript:** arquivos em `api/` (`cnes-public.ts` e `transcribe.ts`).
- **Servidor Express:** `server.ts`, usado no desenvolvimento local e em execução Node própria; não é iniciado pelo comando de build Vite.
- **Backend Python:** API REST e MCP independentes, executados com `python3 -m backend.main`.
- **Banco:** Supabase/PostgreSQL. MySQL em `database/mysql/` é alternativa SQL de referência, não o banco conectado pela aplicação.

## 2. Configurar Supabase

1. Crie/seleciona um projeto Supabase.
2. Em SQL Editor, aplique as migrations de `supabase/migrations/` na ordem: **001, 002, 003, 004, 005, 006 e 007**.
3. Não execute apenas a migration 001 se pretende habilitar analytics, busca por voz relacional, deduplicação de ONGs e sanitização implementadas nas migrations posteriores.
4. Em banco já existente, confira o histórico, faça backup e valide o estado antes de executar qualquer migration. Não trate a sequência como procedimento de atualização cega em produção.
5. Configure no frontend:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
6. Use apenas a chave pública anon no frontend. Nunca exponha `service_role` ou senha do banco.

As tabelas, funções, views, RLS e dependências estão documentadas em [docs/DATABASE.md](docs/DATABASE.md). A existência dos arquivos SQL no Git não comprova que foram aplicados no projeto Supabase conectado.

## 3. Publicar frontend e APIs TypeScript na Vercel

1. Importe `karolcastro/acolheMulher` como projeto.
2. Configure:
   - Framework: Vite (detectado pelo `vercel.json`);
   - Build command: `npm run build`;
   - Output directory: `dist`.
3. Configure as variáveis:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `GEMINI_API_KEY` para habilitar transcrição por Gemini.
4. Faça o deploy. A pasta `api/` contém os handlers TypeScript para `/api/cnes-public` e `/api/transcribe`, seguindo a convenção de funções da Vercel.
5. Após alterar variáveis, faça novo deploy e valide as rotas publicadas.

O arquivo `vercel.json` define build Vite, rewrites da SPA e cabeçalhos HTTP. O build Vite não inicia `server.ts` nem o backend Python.

## 4. Executar servidor Express fora da Vercel

Para desenvolvimento local:

```bash
npm install
npm run dev
```

Esse comando executa `tsx server.ts`, inicia Express e Vite middleware. O servidor Express implementa `/api/health`, `/api/cnes-public` e `/api/transcribe`.

Se optar por hospedar o Express como serviço Node independente, configure a porta conforme o ambiente e a chave Gemini no servidor. Não é necessário executar esse processo para o frontend estático Vercel com as funções da pasta `api/`.

## 5. Backend Python (opcional e independente)

Execute:

```bash
python3 -m backend.main
```

Configurações principais:

| Variável | Uso |
|---|---|
| `ACOLHE_HOST` | Host HTTP; padrão `127.0.0.1` |
| `ACOLHE_PORT` | Porta HTTP; padrão `8000` |
| `ACOLHE_ALLOWED_ORIGIN` | Origem CORS permitida |
| `SUPABASE_URL` | URL Supabase |
| `SUPABASE_ANON_KEY` | Chave pública anon |
| `ACOLHE_PARTNER_TOKEN` | Token opcional para rotas/operações de parceiro |
| `ACOLHE_EPHEMERAL_SECRET` | Segredo opcional para rate limiter |

O backend usa repositórios em memória quando o Supabase não está configurado e pode recorrer ao catálogo em memória em falhas de integração conforme os repositórios. Isso não torna o banco remoto disponível e os dados escritos apenas em memória não são persistentes.

Para MCP via STDIO:

```bash
python3 -m backend.mcp.server
```

O backend Python não é implantado automaticamente pelo projeto Vercel; publique-o separadamente em um serviço Python/HTTP e configure a origem CORS adequada.

## 6. Gemini

A transcrição do endpoint TypeScript requer `GEMINI_API_KEY` (o código também aceita `GOOGLE_API_KEY`). A chave deve existir somente no ambiente servidor. Sem chave válida, o endpoint retorna indisponibilidade de transcrição e a interface pode orientar a usuária a digitar a busca.

## 7. Verificação pós-deploy

- [ ] Página inicial e navegação carregam.
- [ ] Catálogo local aparece sem Supabase.
- [ ] Catálogo remoto carrega com Supabase e migrations aplicadas.
- [ ] Leitura pública respeita RLS.
- [ ] Cadastro de ONG persiste apenas com Supabase/RPC configurados e rejeita duplicidades.
- [ ] Métricas agregadas e analytics de voz registram apenas os campos esperados.
- [ ] `/api/cnes-public` responde com dados ou lista vazia quando não há município válido.
- [ ] `/api/transcribe` retorna erro controlado quando a chave Gemini não está configurada.
- [ ] PWA instala e o modal offline apresenta orientações; validar separadamente quais recursos estão realmente em cache.
- [ ] Se o backend Python for implantado, testar health, CORS, rotas REST e MCP.

## 8. Limitações conhecidas a validar

- O gerador de widget produz um iframe apontando para `https://acolhemulher.org/embed`, mas não foi localizada rota `/embed` implementada no frontend versionado. Não divulgar o embed como funcional até publicar e testar essa rota/domínio.
- O modo offline não garante acesso ao catálogo dinâmico nem às APIs externas.
- O fallback em memória não persiste alterações após reinício do processo.
- A configuração versionada não comprova que o projeto Supabase/Vercel de produção esteja com as mesmas variáveis, migrations e políticas.
