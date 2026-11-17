# Banco de dados — AcolheMulher

## 1. Banco utilizado pela aplicação

O código cliente utiliza `@supabase/supabase-js` e a API REST do Supabase. O backend Python também possui repositórios Supabase. Portanto, o banco conectado ao produto é **PostgreSQL gerenciado pelo Supabase**.

O arquivo `database/mysql/acolhemulher_mysql8_star_schema_utf8mb4.sql` é um script alternativo de referência para MySQL 8.0+. Não há adaptador MySQL no fluxo de execução atual do frontend ou do backend Python; executar esse SQL não conecta automaticamente a aplicação ao MySQL.

## 2. Migrations

Os arquivos estão em `supabase/migrations/` e devem ser lidos/executados em ordem numérica para uma instalação nova:

| Ordem | Arquivo | Escopo principal |
|---|---|---|
| 001 | `001_schema_rls.sql` | Estrutura inicial de perfis de parceiros, serviços e ONGs; políticas RLS e publicação Realtime |
| 002 | `002_enable_realtime.sql` | Ativação explícita de Realtime para tabelas do catálogo |
| 003 | `003_search_demand_stats.sql` | Primeira estrutura de contadores agregados de demanda e RPC de registro |
| 004 | `004_normalized_star_schema_rls.sql` | Evolução para dimensões e fatos analíticos, normalização e políticas de acesso |
| 005 | `005_ngos_dedupe_and_complete_search_tracking.sql` | Regras de deduplicação de ONGs, RPC de cadastro e ampliação do rastreamento por canal |
| 006 | `006_strict_3nf_star_schema_voice_rls.sql` | Normalização adicional e estrutura relacional para estatísticas de buscas por voz |
| 007 | `007_strict_zero_accents_zero_special_chars_all_tables.sql` | Sanitização e restrições de texto/normalização em tabelas e funções |

**Atenção:** o guia de implantação não deve orientar a executar apenas a migration 001 e presumir que todos os recursos mais recentes estarão disponíveis. A aplicação chama funções e views criadas em migrations posteriores. Em bancos já existentes, compare o histórico e o estado real antes de reaplicar scripts; faça backup e valide no ambiente de homologação.

## 3. Catálogo operacional

As tabelas centrais usadas pelo frontend são:

- `public.services`: serviços de atendimento e seus atributos de categoria, localização, acesso, gratuidade, verificação e situação.
- `public.ngos`: organizações/ONGs, área de atuação, abrangência, canais de acesso, resumo, formas de ajuda e categorias relacionadas.
- `public.partner_profiles`: estrutura de perfil de parceiro definida na migration inicial.

O frontend consulta `services` e `ngos` quando o Supabase está configurado. O código combina os registros remotos com os catálogos estáticos em `src/data/servicesData.ts` e `src/data/ngosData.ts`. Em falha/ausência de integração, o catálogo local funciona como fallback; a persistência remota de novos registros não está disponível nesse modo.

A migration 005 cria/atualiza a função `register_ngo_candidate`, utilizada pelo fluxo de cadastro de ONG no contexto do catálogo. A função aplica validações e controles de duplicidade no banco. A gravação depende da migration correspondente e de o Supabase estar acessível.

## 4. Modelo analítico

As migrations 004–006 introduzem um modelo dimensional com dimensões de calendário, categoria, região, canal e atributos normalizados de catálogo/organização, além de fatos de demanda e voz. Entre os objetos identificados no código estão:

- Dimensões: `dim_dates`, `dim_categories`, `dim_regions`, `dim_access_channels`, `dim_organizations`, `dim_ngo_areas`, `dim_subcategories`, `dim_access_modes`, `dim_voice_intents` e `dim_voice_keywords`.
- Fatos de voz: `fact_voice_searches` e `fact_voice_search_keywords`.
- Views consultadas pelo frontend: `vw_star_search_demand`, `vw_star_demand_totals` e `vw_star_voice_searches`.
- Estrutura legada: `search_demand_stats`, criada na migration 003 e mantida como fallback de leitura no código de analytics.

A migration 004 também introduz a estrutura de demanda em Star Schema. O código de analytics tenta registrar a demanda pela RPC `record_star_search_demand` e usa `record_anonymous_search_demand` como fallback legado.

## 5. O que é registrado em analytics

O módulo `src/utils/demandAnalytics.ts` registra contagens agregadas por:
- data;
- assunto/categoria normalizada;
- UF;
- cidade;
- canal de acesso (por exemplo, web, voz, PWA offline ou widget, conforme o ponto de chamada).

A função de voz remove dígitos/CEP e normaliza a transcrição antes de chamar `record_voice_search_relational`. A migration 006 armazena intenção, categoria, região, canal, texto normalizado, indicador de que houve CEP falado, quantidade de palavras e contadores. Assim, é correto dizer que o banco não armazena o CEP completo como identificador da usuária; não é correto afirmar que nenhuma informação textual de busca é persistida, pois há uma forma normalizada da consulta de voz.

O objetivo do modelo é análise agregada de demanda por tema e território, sem exigir identificação cadastral da usuária. Região (cidade/UF) e texto normalizado de voz ainda são dados que merecem controles de acesso, retenção e revisão de privacidade.

## 6. Segurança e RLS

As migrations definem políticas de Row Level Security e usam `ENABLE ROW LEVEL SECURITY` e `FORCE ROW LEVEL SECURITY` em diversas tabelas. As políticas e permissões variam conforme a tabela e a operação.

- O cliente frontend utiliza a chave pública anon; não deve receber `service_role` ou segredo administrativo.
- Leituras públicas são limitadas por políticas e filtros de registros ativos/verificados.
- Escritas analíticas e cadastro de ONGs são feitas por funções RPC específicas, com privilégios controlados no banco.
- Views analíticas recebem permissões explícitas e, em versões recentes, configuração `security_invoker` quando definida pela migration.
- A presença de RLS no SQL versionado não comprova que as migrations foram executadas no projeto Supabase de produção. A configuração efetiva deve ser conferida no painel/SQL do projeto ativo.

## 7. Configuração

Frontend:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Backend Python:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Use somente a chave pública anon no cliente. Nunca coloque `service_role`, senha do banco ou tokens privados em variáveis `VITE_*`, no Git ou em código entregue ao navegador.

## 8. Verificação recomendada após implantação

1. Confirmar que as migrations 001–007 foram aplicadas sem erro e na ordem correta.
2. Verificar a existência das tabelas, views e funções RPC mencionadas acima.
3. Conferir RLS, FORCE RLS, grants e policies no banco real.
4. Testar leitura do catálogo com a chave anon.
5. Testar registro agregado de demanda e busca por voz, sem enviar CEP completo.
6. Testar cadastro de ONG e as regras de duplicidade.
7. Confirmar Realtime nas tabelas do catálogo e comportamento de fallback quando o Supabase estiver indisponível.

Este documento descreve o schema versionado no repositório. Não afirma que o banco de produção já esteja atualizado ou que todas as operações tenham sido testadas em um projeto Supabase ativo.
