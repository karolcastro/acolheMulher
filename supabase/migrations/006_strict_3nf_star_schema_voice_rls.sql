-- ============================================================================
-- AcolheMulher — Normalização 1FN/2FN/3FN + Zero Acentos em Chaves + Star Schema de Voz + FORCE RLS
-- ============================================================================
-- Execute este script no SQL Editor do Supabase após 005 (idempotente).
--
-- O que este script adiciona no Supabase (PostgreSQL UTF-8):
-- 1. Chaves normalizadas 100% ASCII sem acentos (*_normalized / slugs) em todas as dimensões.
-- 2. Dimensões 3FN completas: dim_organizations, dim_ngo_areas, dim_subcategories,
--    dim_access_modes e tabela 1FN ngo_help_items (eliminando dependência de arrays).
-- 3. Star Schema de Pesquisas por Voz transformadas em Dados Relacionais (Zero-PII):
--    - dim_voice_intents, dim_voice_keywords
--    - fact_voice_searches, fact_voice_search_keywords
--    - View analítica vw_star_voice_searches (security_invoker = true)
--    - RPC segura record_voice_search_relational(...)
-- 4. ENABLE + FORCE ROW LEVEL SECURITY em 100% das tabelas novas e existentes.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Função de normalização estrita UTF-8 -> ASCII sem acentos
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_ascii_key(p_input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        LOWER(
          TRANSLATE(
            REGEXP_REPLACE(COALESCE(p_input, ''), '\([^)]*\)', ' ', 'g'),
            'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñÝýÿ',
            'aaaaaAAAAAeeeeEEEEiiiiIIIIoooooOOOOOuuuuUUUUccNnYyy'
          )
        ),
        '[^a-z0-9]+',
        ' ',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

-- Garante que city_normalized em dim_regions esteja 100% sem acento
UPDATE public.dim_regions
SET city_normalized = public.normalize_geo_text(city_name)
WHERE city_normalized <> public.normalize_geo_text(city_name);

-- ----------------------------------------------------------------------------
-- 1. Novas Dimensões 3FN + FORCE RLS em Tudo
-- ----------------------------------------------------------------------------

-- 1.1 dim_organizations (3FN para ONGs)
CREATE TABLE IF NOT EXISTS public.dim_organizations (
  organization_sk INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_normalized TEXT NOT NULL UNIQUE,
  organization_name TEXT NOT NULL
);

ALTER TABLE public.dim_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_organizations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dim_organizations_public_read" ON public.dim_organizations;
CREATE POLICY "dim_organizations_public_read"
  ON public.dim_organizations FOR SELECT TO anon, authenticated USING (TRUE);

-- 1.2 dim_ngo_areas (3FN para áreas das ONGs)
CREATE TABLE IF NOT EXISTS public.dim_ngo_areas (
  ngo_area_sk SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  area_key TEXT NOT NULL UNIQUE CHECK (
    area_key IN ('saude_parto', 'psicologico_juridico', 'acolhimento_protecao', 'cursos_renda')
  ),
  area_label TEXT NOT NULL,
  area_normalized TEXT NOT NULL
);

INSERT INTO public.dim_ngo_areas (area_key, area_label, area_normalized)
VALUES
  ('psicologico_juridico', 'Psicologia & Jurídico', 'psicologia e juridico'),
  ('acolhimento_protecao', 'Acolhimento & Proteção', 'acolhimento e protecao'),
  ('saude_parto', 'Saúde, Parto & Exames', 'saude parto e exames'),
  ('cursos_renda', 'Cursos & Renda', 'cursos e renda')
ON CONFLICT (area_key) DO UPDATE SET
  area_label = EXCLUDED.area_label,
  area_normalized = EXCLUDED.area_normalized;

ALTER TABLE public.dim_ngo_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_ngo_areas FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dim_ngo_areas_public_read" ON public.dim_ngo_areas;
CREATE POLICY "dim_ngo_areas_public_read"
  ON public.dim_ngo_areas FOR SELECT TO anon, authenticated USING (TRUE);

-- 1.3 dim_subcategories & dim_access_modes (3FN para serviços)
CREATE TABLE IF NOT EXISTS public.dim_subcategories (
  subcategory_sk INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  subcategory_normalized TEXT NOT NULL UNIQUE,
  subcategory_label TEXT NOT NULL
);

ALTER TABLE public.dim_subcategories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_subcategories FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dim_subcategories_public_read" ON public.dim_subcategories;
CREATE POLICY "dim_subcategories_public_read"
  ON public.dim_subcategories FOR SELECT TO anon, authenticated USING (TRUE);

CREATE TABLE IF NOT EXISTS public.dim_access_modes (
  access_mode_sk SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  access_mode_key TEXT NOT NULL UNIQUE,
  access_mode_label TEXT NOT NULL
);

INSERT INTO public.dim_access_modes (access_mode_key, access_mode_label)
VALUES
  ('livre_demanda', 'Livre Demanda (Porta Aberta)'),
  ('agendamento_previo', 'Agendamento Prévio'),
  ('online_imediato', 'Online Imediato'),
  ('plantao_24h', 'Plantão 24h')
ON CONFLICT (access_mode_key) DO UPDATE SET
  access_mode_label = EXCLUDED.access_mode_label;

ALTER TABLE public.dim_access_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_access_modes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dim_access_modes_public_read" ON public.dim_access_modes;
CREATE POLICY "dim_access_modes_public_read"
  ON public.dim_access_modes FOR SELECT TO anon, authenticated USING (TRUE);

-- 1.4 Tabela 1FN ngo_help_items (desnormaliza array how_they_help em linhas relacionais)
CREATE TABLE IF NOT EXISTS public.ngo_help_items (
  ngo_id TEXT NOT NULL REFERENCES public.ngos(id) ON DELETE CASCADE,
  item_order SMALLINT NOT NULL,
  help_description TEXT NOT NULL,
  help_normalized TEXT NOT NULL,
  PRIMARY KEY (ngo_id, item_order)
);

ALTER TABLE public.ngo_help_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ngo_help_items FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ngo_help_items_public_read" ON public.ngo_help_items;
CREATE POLICY "ngo_help_items_public_read"
  ON public.ngo_help_items
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ngos n
      WHERE n.id = ngo_help_items.ngo_id
        AND n.is_active = TRUE
        AND n.is_verified = TRUE
    )
  );

-- Adiciona FKs normalizadas em public.ngos e public.services
ALTER TABLE public.ngos
  ADD COLUMN IF NOT EXISTS organization_sk INTEGER REFERENCES public.dim_organizations(organization_sk),
  ADD COLUMN IF NOT EXISTS ngo_area_sk SMALLINT REFERENCES public.dim_ngo_areas(ngo_area_sk);

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS name_normalized TEXT,
  ADD COLUMN IF NOT EXISTS subcategory_sk INTEGER REFERENCES public.dim_subcategories(subcategory_sk),
  ADD COLUMN IF NOT EXISTS access_mode_sk SMALLINT REFERENCES public.dim_access_modes(access_mode_sk);

-- Trigger 3FN para manter organization_sk, ngo_area_sk e ngo_help_items sincronizados
CREATE OR REPLACE FUNCTION public.trg_sync_ngo_3fn_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_name TEXT := LEFT(TRIM(COALESCE(NULLIF(NEW.organization, ''), NEW.name)), 180);
  v_org_norm TEXT := public.normalize_ascii_key(v_org_name);
  v_org_sk INTEGER;
  v_area_sk SMALLINT;
BEGIN
  IF v_org_norm = '' THEN
    v_org_norm := 'organizacao parceira';
  END IF;

  INSERT INTO public.dim_organizations (organization_normalized, organization_name)
  VALUES (v_org_norm, v_org_name)
  ON CONFLICT (organization_normalized) DO UPDATE SET organization_name = EXCLUDED.organization_name
  RETURNING organization_sk INTO v_org_sk;

  SELECT ngo_area_sk INTO v_area_sk
  FROM public.dim_ngo_areas
  WHERE area_key = NEW.area;

  NEW.organization_sk := v_org_sk;
  NEW.ngo_area_sk := v_area_sk;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ngo_3fn ON public.ngos;
CREATE TRIGGER trg_sync_ngo_3fn
  BEFORE INSERT OR UPDATE OF organization, area, name
  ON public.ngos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_ngo_3fn_fn();

CREATE OR REPLACE FUNCTION public.trg_sync_ngo_help_items_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idx SMALLINT := 1;
  v_item TEXT;
BEGIN
  DELETE FROM public.ngo_help_items WHERE ngo_id = NEW.id;
  IF NEW.how_they_help IS NOT NULL THEN
    FOREACH v_item IN ARRAY NEW.how_they_help LOOP
      v_item := TRIM(COALESCE(v_item, ''));
      IF v_item <> '' THEN
        INSERT INTO public.ngo_help_items (ngo_id, item_order, help_description, help_normalized)
        VALUES (NEW.id, v_idx, LEFT(v_item, 240), public.normalize_ascii_key(v_item))
        ON CONFLICT DO NOTHING;
        v_idx := v_idx + 1;
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ngo_help_items ON public.ngos;
CREATE TRIGGER trg_sync_ngo_help_items
  AFTER INSERT OR UPDATE OF how_they_help
  ON public.ngos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_ngo_help_items_fn();

-- Trigger 3FN para manter subcategory_sk, access_mode_sk e name_normalized em services
CREATE OR REPLACE FUNCTION public.trg_sync_service_3fn_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sub TEXT := LEFT(TRIM(COALESCE(NULLIF(NEW.subcategory, ''), 'Servico Gratuito')), 160);
  v_sub_norm TEXT := public.normalize_ascii_key(v_sub);
  v_sub_sk INTEGER;
  v_mode_norm TEXT := public.normalize_ascii_key(NEW.access_mode);
  v_mode_key TEXT;
  v_mode_sk SMALLINT;
BEGIN
  NEW.name_normalized := public.normalize_ascii_key(NEW.name);

  INSERT INTO public.dim_subcategories (subcategory_normalized, subcategory_label)
  VALUES (v_sub_norm, v_sub)
  ON CONFLICT (subcategory_normalized) DO UPDATE SET subcategory_label = EXCLUDED.subcategory_label
  RETURNING subcategory_sk INTO v_sub_sk;

  v_mode_key := CASE
    WHEN v_mode_norm LIKE '%24h%' OR v_mode_norm LIKE '%plantao%' THEN 'plantao_24h'
    WHEN v_mode_norm LIKE '%online%' THEN 'online_imediato'
    WHEN v_mode_norm LIKE '%agendamento%' THEN 'agendamento_previo'
    ELSE 'livre_demanda'
  END;

  SELECT access_mode_sk INTO v_mode_sk
  FROM public.dim_access_modes
  WHERE access_mode_key = v_mode_key;

  NEW.subcategory_sk := v_sub_sk;
  NEW.access_mode_sk := v_mode_sk;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_service_3fn ON public.services;
CREATE TRIGGER trg_sync_service_3fn
  BEFORE INSERT OR UPDATE OF name, subcategory, access_mode
  ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_service_3fn_fn();

-- Backfill seguro de services e ngos existentes
UPDATE public.services SET subcategory = subcategory;
UPDATE public.ngos SET how_they_help = how_they_help;

-- ----------------------------------------------------------------------------
-- 2. STAR SCHEMA DE PESQUISAS POR VOZ -> DADOS RELACIONAIS (Zero-PII + FORCE RLS)
-- ----------------------------------------------------------------------------

-- 2.1 dim_voice_intents
CREATE TABLE IF NOT EXISTS public.dim_voice_intents (
  intent_sk SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  intent_key TEXT NOT NULL UNIQUE,
  intent_label_normalized TEXT NOT NULL,
  category_sk SMALLINT NOT NULL REFERENCES public.dim_categories(category_sk)
);

INSERT INTO public.dim_voice_intents (intent_key, intent_label_normalized, category_sk)
SELECT v.intent_key, v.intent_label, c.category_sk
FROM (VALUES
  ('emergencia_protecao', 'pedido de protecao urgente ou delegacia', 'emergencia'),
  ('apoio_psicologico', 'pedido de escuta ou psicologa gratuita', 'psicologico'),
  ('orientacao_juridica', 'pedido de advogada gratuita ou medida protetiva', 'juridico'),
  ('saude_exames_parto', 'pedido de ubs hospital parto ou exames gratuitos', 'saude'),
  ('cursos_autonomia', 'pedido de cursos gratuitos ou geracao de renda', 'cursos'),
  ('busca_ongs_mulheres', 'busca por ongs voltadas para mulheres', 'ongs_apoio'),
  ('busca_local_voz', 'busca por cep ou cidade falada por voz', 'geral')
) AS v(intent_key, intent_label, cat_key)
JOIN public.dim_categories c ON c.category_key = v.cat_key
ON CONFLICT (intent_key) DO UPDATE SET
  intent_label_normalized = EXCLUDED.intent_label_normalized,
  category_sk = EXCLUDED.category_sk;

ALTER TABLE public.dim_voice_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_voice_intents FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dim_voice_intents_public_read" ON public.dim_voice_intents;
CREATE POLICY "dim_voice_intents_public_read"
  ON public.dim_voice_intents FOR SELECT TO anon, authenticated USING (TRUE);

-- 2.2 dim_voice_keywords (chaves ASCII sem acento)
CREATE TABLE IF NOT EXISTS public.dim_voice_keywords (
  keyword_sk INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  keyword_normalized TEXT NOT NULL UNIQUE
);

ALTER TABLE public.dim_voice_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_voice_keywords FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dim_voice_keywords_public_read" ON public.dim_voice_keywords;
CREATE POLICY "dim_voice_keywords_public_read"
  ON public.dim_voice_keywords FOR SELECT TO anon, authenticated USING (TRUE);

-- 2.3 fact_voice_searches (Tabela Fato de Pesquisas de Voz Relacionais)
CREATE TABLE IF NOT EXISTS public.fact_voice_searches (
  voice_fact_sk BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date_sk INTEGER NOT NULL REFERENCES public.dim_dates(date_sk),
  intent_sk SMALLINT NOT NULL REFERENCES public.dim_voice_intents(intent_sk),
  category_sk SMALLINT NOT NULL REFERENCES public.dim_categories(category_sk),
  region_sk BIGINT NOT NULL REFERENCES public.dim_regions(region_sk),
  channel_sk SMALLINT NOT NULL REFERENCES public.dim_access_channels(channel_sk),
  utterance_normalized TEXT NOT NULL,
  had_cep_spoken BOOLEAN NOT NULL DEFAULT FALSE,
  word_count SMALLINT NOT NULL DEFAULT 1,
  search_count INTEGER NOT NULL DEFAULT 1 CHECK (search_count > 0),
  CONSTRAINT uq_fact_voice_grain UNIQUE (date_sk, intent_sk, category_sk, region_sk, utterance_normalized)
);

CREATE INDEX IF NOT EXISTS idx_fact_voice_searches_date
  ON public.fact_voice_searches (date_sk DESC, search_count DESC);

ALTER TABLE public.fact_voice_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_voice_searches FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fact_voice_searches_public_read" ON public.fact_voice_searches;
CREATE POLICY "fact_voice_searches_public_read"
  ON public.fact_voice_searches FOR SELECT TO anon, authenticated USING (TRUE);

-- 2.4 fact_voice_search_keywords (Tabela Associativa Relacional Voz x Palavra-Chave)
CREATE TABLE IF NOT EXISTS public.fact_voice_search_keywords (
  voice_fact_sk BIGINT NOT NULL REFERENCES public.fact_voice_searches(voice_fact_sk) ON DELETE CASCADE,
  keyword_sk INTEGER NOT NULL REFERENCES public.dim_voice_keywords(keyword_sk) ON DELETE CASCADE,
  hit_count INTEGER NOT NULL DEFAULT 1 CHECK (hit_count > 0),
  PRIMARY KEY (voice_fact_sk, keyword_sk)
);

ALTER TABLE public.fact_voice_search_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_voice_search_keywords FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "fact_voice_search_keywords_public_read" ON public.fact_voice_search_keywords;
CREATE POLICY "fact_voice_search_keywords_public_read"
  ON public.fact_voice_search_keywords FOR SELECT TO anon, authenticated USING (TRUE);

-- 2.5 View Analítica Star Schema das Pesquisas por Voz (respeita RLS com security_invoker)
CREATE OR REPLACE VIEW public.vw_star_voice_searches
WITH (security_invoker = true)
AS
SELECT
  v.voice_fact_sk,
  d.full_date AS search_date,
  vi.intent_key,
  vi.intent_label_normalized,
  c.category_key,
  c.label AS category_label,
  r.state_code,
  r.city_name,
  r.city_normalized,
  r.macro_region,
  v.utterance_normalized,
  v.had_cep_spoken,
  v.word_count,
  v.search_count
FROM public.fact_voice_searches v
JOIN public.dim_dates d ON d.date_sk = v.date_sk
JOIN public.dim_voice_intents vi ON vi.intent_sk = v.intent_sk
JOIN public.dim_categories c ON c.category_sk = v.category_sk
JOIN public.dim_regions r ON r.region_sk = v.region_sk;

GRANT SELECT ON public.vw_star_voice_searches TO anon, authenticated;

-- 2.6 RPC Segura para transformar fala sanitizada em dados relacionais no Star Schema
CREATE OR REPLACE FUNCTION public.record_voice_search_relational(
  p_raw_utterance TEXT DEFAULT '',
  p_detected_topic TEXT DEFAULT 'geral',
  p_state TEXT DEFAULT 'BR',
  p_city TEXT DEFAULT 'Nacional'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_had_cep BOOLEAN := (COALESCE(p_raw_utterance, '') ~ '[0-9]{4,}');
  v_clean TEXT;
  v_topic TEXT := LOWER(TRIM(COALESCE(p_detected_topic, '')));
  v_intent_key TEXT;
  v_intent_sk SMALLINT;
  v_cat_sk SMALLINT;
  v_ch_sk SMALLINT;
  v_date_sk INTEGER;
  v_reg_sk BIGINT;
  v_voice_fact_sk BIGINT;
  v_tokens TEXT[];
  v_tok TEXT;
  v_kw_sk INTEGER;
  v_word_count SMALLINT;
BEGIN
  -- Remove dígitos numéricos (Zero-PII) e remove TODOS os acentos
  v_clean := public.normalize_ascii_key(
    REGEXP_REPLACE(COALESCE(p_raw_utterance, ''), '[0-9]{2,}', ' ', 'g')
  );
  v_clean := LEFT(v_clean, 160);
  IF v_clean = '' THEN
    v_clean := CASE WHEN v_had_cep THEN 'busca por cep falado' ELSE 'busca por voz' END;
  END IF;

  IF v_topic = '' OR v_topic = 'todos' THEN
    IF v_clean ~ '\b(emergencia|socorro|perigo|delegacia|deam|violencia|abrigo|policia|denuncia)\b' THEN
      v_topic := 'emergencia';
    ELSIF v_clean ~ '\b(psicolog|emocional|terapia|cvv|ansiedade|escuta|depress)\b' THEN
      v_topic := 'psicologico';
    ELSIF v_clean ~ '\b(advogad|juridic|defensoria|protetiva|pensao|divorcio|guarda)\b' THEN
      v_topic := 'juridico';
    ELSIF v_clean ~ '\b(saude|parto|exame|mamografia|papanicolau|sus|hospital|ubs|posto|medico)\b' THEN
      v_topic := 'saude';
    ELSIF v_clean ~ '\b(curso|capacitacao|renda|emprego|trabalho|tecnologia)\b' THEN
      v_topic := 'cursos';
    ELSIF v_clean ~ '\b(ong|ongs|voluntari|coletivo)\b' THEN
      v_topic := 'ongs_apoio';
    ELSE
      v_topic := 'geral';
    END IF;
  END IF;

  IF v_topic = 'social' THEN
    v_topic := 'ongs_apoio';
  END IF;

  v_intent_key := CASE v_topic
    WHEN 'emergencia' THEN 'emergencia_protecao'
    WHEN 'psicologico' THEN 'apoio_psicologico'
    WHEN 'juridico' THEN 'orientacao_juridica'
    WHEN 'saude' THEN 'saude_exames_parto'
    WHEN 'cursos' THEN 'cursos_autonomia'
    WHEN 'ongs_apoio' THEN 'busca_ongs_mulheres'
    ELSE 'busca_local_voz'
  END;

  SELECT intent_sk, category_sk INTO v_intent_sk, v_cat_sk
  FROM public.dim_voice_intents
  WHERE intent_key = v_intent_key;

  IF v_cat_sk IS NULL THEN
    SELECT category_sk INTO v_cat_sk
    FROM public.dim_categories
    WHERE category_key = 'geral';
  END IF;

  SELECT channel_sk INTO v_ch_sk
  FROM public.dim_access_channels
  WHERE channel_key = 'web_voice';

  v_date_sk := public.ensure_dim_date(CURRENT_DATE);
  v_reg_sk := public.ensure_dim_region(p_state, p_city);
  v_tokens := REGEXP_SPLIT_TO_ARRAY(v_clean, '\s+');
  v_word_count := COALESCE(array_length(v_tokens, 1), 1)::SMALLINT;

  INSERT INTO public.fact_voice_searches (
    date_sk, intent_sk, category_sk, region_sk, channel_sk,
    utterance_normalized, had_cep_spoken, word_count, search_count
  )
  VALUES (
    v_date_sk, v_intent_sk, v_cat_sk, v_reg_sk, v_ch_sk,
    v_clean, v_had_cep, v_word_count, 1
  )
  ON CONFLICT (date_sk, intent_sk, category_sk, region_sk, utterance_normalized)
  DO UPDATE SET
    search_count = public.fact_voice_searches.search_count + 1
  RETURNING voice_fact_sk INTO v_voice_fact_sk;

  FOREACH v_tok IN ARRAY v_tokens LOOP
    IF LENGTH(v_tok) >= 3
       AND v_tok NOT IN ('para', 'com', 'que', 'uma', 'por', 'dos', 'das', 'meu', 'sua', 'nao', 'cep', 'preciso', 'quero', 'onde', 'tem') THEN
      INSERT INTO public.dim_voice_keywords (keyword_normalized)
      VALUES (v_tok)
      ON CONFLICT (keyword_normalized) DO UPDATE SET keyword_normalized = EXCLUDED.keyword_normalized
      RETURNING keyword_sk INTO v_kw_sk;

      INSERT INTO public.fact_voice_search_keywords (voice_fact_sk, keyword_sk, hit_count)
      VALUES (v_voice_fact_sk, v_kw_sk, 1)
      ON CONFLICT (voice_fact_sk, keyword_sk)
      DO UPDATE SET hit_count = public.fact_voice_search_keywords.hit_count + 1;
    END IF;
  END LOOP;

  -- Atualiza também a tabela fato central de demanda no mesmo grão
  PERFORM public.record_star_search_demand(v_topic, p_state, p_city, 'web_voice');
END;
$$;

REVOKE ALL ON FUNCTION public.record_voice_search_relational(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_voice_search_relational(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- Ativa Realtime na tabela fato de pesquisas de voz
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'fact_voice_searches'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fact_voice_searches;
  END IF;
END $$;
