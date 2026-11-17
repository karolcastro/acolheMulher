# 🚀 Guia Rápido de Deploy: Vercel + Supabase (com Segurança RLS)

Todos os arquivos de configuração já estão prontos no repositório. Siga os 3 passos abaixo nas suas contas gratuitas:

---

## Passo 1 — Configurar o Banco com Segurança RLS no Supabase
1. Acesse [supabase.com](https://supabase.com), clique em **New Project** e escolha a região **South America (São Paulo)** (`sa-east-1`).
2. No menu lateral, abra **SQL Editor** → **New query**.
3. Copie todo o conteúdo do arquivo `supabase/migrations/001_schema_rls.sql` e clique em **Run**.
   - Se você já havia rodado a versão anterior do `001_schema_rls.sql`, execute também `supabase/migrations/002_enable_realtime.sql` no SQL Editor para liberar o **Supabase Realtime** nas tabelas `services` e `ngos`.
   - Para normalização completa (**3FN**), modelo **Star Schema** (`fact_search_demand` + dimensões `dim_dates`, `dim_categories`, `dim_regions`, `dim_access_channels`), busca por proximidade geográfica (`<= 30 km`) e políticas **RLS estritas** em todas as tabelas e views (`security_invoker`), execute **`supabase/migrations/004_normalized_star_schema_rls.sql`** (pode rodar mesmo após `003_search_demand_stats.sql` — ele migra os dados automaticamente).
   - Em seguida, execute **`supabase/migrations/005_ngos_dedupe_and_complete_search_tracking.sql`** para sincronizar todas as **14 ONGs verificadas**, ativar **travas anti-duplicidade** (`uq_ngos_name_normalized` e `uq_ngos_domain_scope` + RPC `register_ngo_candidate`) e registrar todos os canais de busca da plataforma no Star Schema.
   - Em seguida, execute **`supabase/migrations/006_strict_3nf_star_schema_voice_rls.sql`** para normalização integral (**3FN/1FN**), **RLS forçado em 100% das tabelas** e conversão relacional de pesquisas por voz (*Zero-PII*: `dim_voice_intents`, `dim_voice_keywords`, `fact_voice_searches`, `fact_voice_search_keywords`).
   - Em seguida, execute **`supabase/migrations/007_strict_zero_accents_zero_special_chars_all_tables.sql`** para limpar **100% dos registros existentes** e travar com *Triggers* (`BEFORE INSERT/UPDATE`) e *Constraints CHECK* que **nenhum acento ou caractere especial** (`á`, `ç`, `—`, `·`, `()`, `/`, `%`, `&`, `:`, `-`) possa ser salvo em qualquer tabela do banco.
   - Por fim, execute **`supabase/migrations/008_expand_women_courses_ngos_brasil.sql`** para expandir o catálogo de ONGs de cursos gratuitos para mulheres (**PrograMaria**, **AI Girls**, **WoMakersCode**, **Tech Girls**, **Rede Mulher Empreendedora**, **Minas Programam**, **PretaLab**, **PyLadies Brasil**, **InfoPreta**, **Mulher em Construção** e polos presenciais/online por todo o Brasil) já em ASCII estrito.
   - **Versão MySQL 8.0+ (`utf8mb4`):** se quiser subir o mesmo modelo normalizado em Star Schema no MySQL, utilize **`database/mysql/acolhemulher_mysql8_star_schema_utf8mb4.sql`**, com `CHECK (... COLLATE utf8mb4_bin REGEXP)` e triggers garantindo zero acentos e zero caracteres especiais, views `SQL SECURITY DEFINER`, stored procedures de voz para dados relacionais e isolamento por roles.
   - Todas as tabelas possuem **Row Level Security (`ENABLE` + `FORCE`)** ativada no PostgreSQL/Supabase (e equivalente via Views/Triggers/Procedures/Roles no MySQL 8.0+).
   - O acesso público (`anon`) tem permissão **apenas de leitura (`SELECT`)** em serviços verificados e totais agregados — nenhuma escrita direta é permitida ao público; o registro de demanda, pesquisas por voz relacionais e novas ONGs ocorre apenas via funções RPC validadas (`record_star_search_demand`, `record_voice_search_relational` e `register_ngo_candidate`).
   - Nenhum dado pessoal, CEP completo da usuária, áudio, IP ou histórico individual é gravado no banco (*Zero-PII*).
4. Vá em **Project Settings → API** e copie:
   - `Project URL` (`VITE_SUPABASE_URL`)
   - `anon public` key (`VITE_SUPABASE_ANON_KEY`) — **nunca** exponha a chave `service_role` no frontend.
5. Para ativar a **Triagem Inteligente com IA Generativa + RAG** (`/api/triage-ai`) e transcrição de voz (`/api/transcribe`), configure também `GEMINI_API_KEY` nas variáveis de ambiente do servidor (Vercel / AI Studio Secrets — nunca com prefixo `VITE_`).

---

## Passo 2 — Publicar o Frontend + PWA + Realtime na Vercel
1. Acesse [vercel.com](https://vercel.com) e clique em **Add New → Project**.
2. Conecte seu repositório GitHub: `karolcastro/acolheMulher`.
3. Em **Environment Variables** da Vercel, adicione as 2 variáveis públicas para conectar o frontend em tempo real ao Supabase:
   - `VITE_SUPABASE_URL` = sua Project URL do Supabase
   - `VITE_SUPABASE_ANON_KEY` = sua chave `anon public` do Supabase
   *(Se o projeto na Vercel já foi criado, vá em **Settings → Environment Variables**, adicione as duas variáveis e clique em **Deployments → Redeploy**.)*
4. A Vercel detectará automaticamente o `vercel.json` já configurado com:
   - Build: `npm run build` | Pasta de saída: `dist`
   - Rotas SPA compatíveis com **PWA offline** (`/sw.js` e `/manifest.webmanifest`)
   - Cabeçalhos OWASP (`Referrer-Policy: no-referrer`, `Permissions-Policy: microphone=(self)`, `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`).
5. Clique em **Deploy**. Em ~1 minuto seu link `https://...vercel.app` estará online com HTTPS ativo para o PWA Offline, Busca por Voz e atualizações em tempo real do Supabase.
6. **Privacidade:** deixe o *Vercel Web Analytics* desativado para não registrar IPs ou visitas das usuárias.

---

## Passo 3 — (Opcional) Subir o Backend Python + MCP
Para rodar a API Python e o servidor MCP continuamente via HTTP:
1. Em um serviço Web gratuito compatível com Python (ex.: **Render** ou **Koyeb**), conecte o repositório e configure:
   - **Start Command:** `ACOLHE_HOST=0.0.0.0 ACOLHE_PORT=$PORT python3 -m backend.main`
   - **Variáveis de ambiente:**
     - `ACOLHE_ALLOWED_ORIGIN` = URL da sua Vercel (`https://seu-app.vercel.app`)
     - `SUPABASE_URL` = URL do seu projeto Supabase
     - `SUPABASE_ANON_KEY` = chave `anon public` do Supabase
2. Caso o plano gratuito do Supabase pause após 7 dias sem uso, o backend Python e o PWA **fazem fallback automático** para o catálogo local em memória, sem deixar nenhuma usuária sem atendimento.
