# 🚀 Guia Rápido de Deploy: Vercel + Supabase (com Segurança RLS)

Todos os arquivos de configuração já estão prontos no repositório. Siga os 3 passos abaixo nas suas contas gratuitas:

---

## Passo 1 — Configurar o Banco com Segurança RLS no Supabase
1. Acesse [supabase.com](https://supabase.com), clique em **New Project** e escolha a região **South America (São Paulo)** (`sa-east-1`).
2. No menu lateral, abra **SQL Editor** → **New query**.
3. Copie todo o conteúdo do arquivo `supabase/migrations/001_schema_rls.sql` e clique em **Run**.
   - Se você já havia rodado a versão anterior do `001_schema_rls.sql`, execute também `supabase/migrations/002_enable_realtime.sql` no SQL Editor para liberar o **Supabase Realtime** nas tabelas `services` e `ngos`.
   - Isso cria as tabelas `services`, `ngos` e `partner_profiles` com **Row Level Security (`ENABLE` + `FORCE`)** ativada.
   - O acesso público (`anon`) tem permissão **apenas de leitura (`SELECT`)** em serviços verificados — ninguém consegue alterar ou apagar dados sem autenticação de parceira.
   - Nenhum dado pessoal, CEP consultado ou histórico de busca das usuárias é gravado no banco (*Zero-PII*).
4. Vá em **Project Settings → API** e copie:
   - `Project URL` (`VITE_SUPABASE_URL`)
   - `anon public` key (`VITE_SUPABASE_ANON_KEY`) — **nunca** exponha a chave `service_role` no frontend.

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
