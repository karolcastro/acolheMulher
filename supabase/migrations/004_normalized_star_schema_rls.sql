-- ============================================================================
-- AcolheMulher — Normalização 3FN + Star Schema (DW) + Segurança RLS Estrita
-- ============================================================================
-- Execute este script no SQL Editor do Supabase após 001_schema_rls.sql
-- (e 003_search_demand_stats.sql, se já executado — o script é idempotente).
--
-- Arquitetura implementada:
-- 1. NORMALIZAÇÃO 3FN (OLTP):
--    - Tabelas de domínio/dimensão: dim_categories, dim_regions, tags
--    - Tabelas associativas N:N: service_tags, ngo_categories
--    - Colunas normalizadas e geolocalização (cep, lat, lng) em services
--    - Triggers automáticos para manter integridade referencial
--
-- 2. STAR SCHEMA (OLAP / Análise Anônima Zero-PII):
--    - Tabela Fato central: fact_search_demand
--      (grão: 1 linha diária por Data x Categoria x Região x Canal)
--    - Dimensões: dim_dates, dim_categories, dim_regions, dim_access_channels
--    - View analítica: vw_star_search_demand (security_invoker = true)
--
-- 3. SEGURANÇA RLS (Row Level Security):
--    - ENABLE + FORCE ROW LEVEL SECURITY em TODAS as tabelas
--    - Privilégio mínimo: 'anon' possui apenas SELECT em dados públicos/verificados
--    - Nenhuma escrita direta permitida a 'anon' (apenas RPC SECURITY DEFINER)
--    - Zero-PII: nunca armazena CEP da usuária, IP, voz ou histórico individual
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Função utilitária de normalização textual (independente de extensão)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_geo_text(p_input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LOWER(
    TRIM(
      REGEXP_REPLACE(
        TRANSLATE(
          COALESCE(p_input, ''),
          'ÁÀÂÃÄáàâãäÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖóòôõöÚÙÛÜúùûüÇçÑñ',
          'AAAAAaaaaaEEEEeeeeIIIIiiiiOOOOOoooooUUUUuuuuCcNn'
        ),
        '\s+',
        ' ',
        'g'
      )
    )
  );
$$;

-- ----------------------------------------------------------------------------
-- 1. DIMENSÕES DO STAR SCHEMA & TABELAS DE DOMÍNIO NORMALIZADAS
-- ----------------------------------------------------------------------------

-- 1.1 Dimensão Categorias / Assuntos (dim_categories)
CREATE TABLE IF NOT EXISTS public.dim_categories (
  category_sk SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  category_key TEXT NOT NULL UNIQUE CHECK (
    category_key IN (
      'emergencia',
      'psicologico',
      'juridico',
      'saude',
      'cursos',
      'ongs_apoio',
      'social',
      'geral'
    )
  ),
  label TEXT NOT NULL,
  description TEXT NOT NULL,
  priority_order SMALLINT NOT NULL DEFAULT 10,
  is_emergency BOOLEAN NOT NULL DEFAULT FALSE
);

INSERT INTO public.dim_categories (category_key, label, description, priority_order, is_emergency)
VALUES
  ('emergencia', 'Proteção 24h e Emergência', 'Delegacias da Mulher, Casa da Mulher Brasileira, abrigos, 180 e 190', 1, TRUE),
  ('psicologico', 'Apoio Psicológico', 'Escuta acolhedora, clínicas-escola e atendimento sigiloso gratuito', 2, FALSE),
  ('juridico', 'Advogada Gratuita e Direitos', 'Defensoria Pública, medidas protetivas, guarda, pensão e divórcio', 3, FALSE),
  ('saude', 'Saúde, Exames e Parto Humanizado', 'Casas de parto humanizado, ONGs de exames gratuitos e SUS', 4, FALSE),
  ('cursos', 'Cursos Gratuitos e Renda', 'Capacitação profissional gratuita, tecnologia e geração de renda', 5, FALSE),
  ('ongs_apoio', 'ONGs que Ajudam', 'Coletivos e projetos sociais liderados por voluntárias e especialistas', 6, FALSE),
  ('social', 'Assistência Social & Acolhimento', 'CRAS, CREAS e redes de assistência social gratuitas', 7, FALSE),
  ('geral', 'Busca Geral por Região', 'Exploração geral de serviços próximos em até 30 km', 8, FALSE)
ON CONFLICT (category_key) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  priority_order = EXCLUDED.priority_order,
  is_emergency = EXCLUDED.is_emergency;

ALTER TABLE public.dim_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_categories FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dim_categories_public_read" ON public.dim_categories;
CREATE POLICY "dim_categories_public_read"
  ON public.dim_categories
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "dim_categories_admin_write" ON public.dim_categories;
CREATE POLICY "dim_categories_admin_write"
  ON public.dim_categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_profiles p
      WHERE p.id = auth.uid() AND p.is_active = TRUE AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partner_profiles p
      WHERE p.id = auth.uid() AND p.is_active = TRUE AND p.role = 'admin'
    )
  );

-- 1.2 Dimensão Geográfica Normalizada (dim_regions — nunca grava CEP da usuária)
CREATE TABLE IF NOT EXISTS public.dim_regions (
  region_sk BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  state_code CHAR(2) NOT NULL CHECK (state_code ~ '^[A-Z]{2}$'),
  state_name TEXT NOT NULL,
  macro_region TEXT NOT NULL CHECK (
    macro_region IN ('Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul', 'Nacional')
  ),
  city_name TEXT NOT NULL,
  city_normalized TEXT NOT NULL,
  CONSTRAINT uq_dim_regions_state_city UNIQUE (state_code, city_normalized)
);

CREATE INDEX IF NOT EXISTS idx_dim_regions_state_city
  ON public.dim_regions (state_code, city_normalized);

ALTER TABLE public.dim_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_regions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dim_regions_public_read" ON public.dim_regions;
CREATE POLICY "dim_regions_public_read"
  ON public.dim_regions
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "dim_regions_admin_write" ON public.dim_regions;
CREATE POLICY "dim_regions_admin_write"
  ON public.dim_regions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_profiles p
      WHERE p.id = auth.uid() AND p.is_active = TRUE AND p.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partner_profiles p
      WHERE p.id = auth.uid() AND p.is_active = TRUE AND p.role = 'admin'
    )
  );

-- Helper interno para resolver metadados oficiais de UF -> Nome & Macrorregião
CREATE OR REPLACE FUNCTION public.get_uf_metadata(p_state TEXT)
RETURNS TABLE(state_code CHAR(2), state_name TEXT, macro_region TEXT)
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_uf TEXT := UPPER(REGEXP_REPLACE(COALESCE(p_state, ''), '[^A-Za-z]', '', 'g'));
BEGIN
  CASE v_uf
    WHEN 'AC' THEN RETURN QUERY SELECT 'AC'::CHAR(2), 'Acre', 'Norte';
    WHEN 'AP' THEN RETURN QUERY SELECT 'AP'::CHAR(2), 'Amapá', 'Norte';
    WHEN 'AM' THEN RETURN QUERY SELECT 'AM'::CHAR(2), 'Amazonas', 'Norte';
    WHEN 'PA' THEN RETURN QUERY SELECT 'PA'::CHAR(2), 'Pará', 'Norte';
    WHEN 'RO' THEN RETURN QUERY SELECT 'RO'::CHAR(2), 'Rondônia', 'Norte';
    WHEN 'RR' THEN RETURN QUERY SELECT 'RR'::CHAR(2), 'Roraima', 'Norte';
    WHEN 'TO' THEN RETURN QUERY SELECT 'TO'::CHAR(2), 'Tocantins', 'Norte';
    WHEN 'AL' THEN RETURN QUERY SELECT 'AL'::CHAR(2), 'Alagoas', 'Nordeste';
    WHEN 'BA' THEN RETURN QUERY SELECT 'BA'::CHAR(2), 'Bahia', 'Nordeste';
    WHEN 'CE' THEN RETURN QUERY SELECT 'CE'::CHAR(2), 'Ceará', 'Nordeste';
    WHEN 'MA' THEN RETURN QUERY SELECT 'MA'::CHAR(2), 'Maranhão', 'Nordeste';
    WHEN 'PB' THEN RETURN QUERY SELECT 'PB'::CHAR(2), 'Paraíba', 'Nordeste';
    WHEN 'PE' THEN RETURN QUERY SELECT 'PE'::CHAR(2), 'Pernambuco', 'Nordeste';
    WHEN 'PI' THEN RETURN QUERY SELECT 'PI'::CHAR(2), 'Piauí', 'Nordeste';
    WHEN 'RN' THEN RETURN QUERY SELECT 'RN'::CHAR(2), 'Rio Grande do Norte', 'Nordeste';
    WHEN 'SE' THEN RETURN QUERY SELECT 'SE'::CHAR(2), 'Sergipe', 'Nordeste';
    WHEN 'DF' THEN RETURN QUERY SELECT 'DF'::CHAR(2), 'Distrito Federal', 'Centro-Oeste';
    WHEN 'GO' THEN RETURN QUERY SELECT 'GO'::CHAR(2), 'Goiás', 'Centro-Oeste';
    WHEN 'MT' THEN RETURN QUERY SELECT 'MT'::CHAR(2), 'Mato Grosso', 'Centro-Oeste';
    WHEN 'MS' THEN RETURN QUERY SELECT 'MS'::CHAR(2), 'Mato Grosso do Sul', 'Centro-Oeste';
    WHEN 'ES' THEN RETURN QUERY SELECT 'ES'::CHAR(2), 'Espírito Santo', 'Sudeste';
    WHEN 'MG' THEN RETURN QUERY SELECT 'MG'::CHAR(2), 'Minas Gerais', 'Sudeste';
    WHEN 'RJ' THEN RETURN QUERY SELECT 'RJ'::CHAR(2), 'Rio de Janeiro', 'Sudeste';
    WHEN 'SP' THEN RETURN QUERY SELECT 'SP'::CHAR(2), 'São Paulo', 'Sudeste';
    WHEN 'PR' THEN RETURN QUERY SELECT 'PR'::CHAR(2), 'Paraná', 'Sul';
    WHEN 'RS' THEN RETURN QUERY SELECT 'RS'::CHAR(2), 'Rio Grande do Sul', 'Sul';
    WHEN 'SC' THEN RETURN QUERY SELECT 'SC'::CHAR(2), 'Santa Catarina', 'Sul';
    ELSE RETURN QUERY SELECT 'BR'::CHAR(2), 'Brasil', 'Nacional';
  END CASE;
END;
$$;

-- Helper seguro (SECURITY DEFINER) para obter/criar chave substituta region_sk sem dígitos/CEP
CREATE OR REPLACE FUNCTION public.ensure_dim_region(p_state TEXT, p_city TEXT)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uf CHAR(2);
  v_state_name TEXT;
  v_macro TEXT;
  v_city TEXT;
  v_city_norm TEXT;
  v_region_sk BIGINT;
BEGIN
  SELECT m.state_code, m.state_name, m.macro_region
    INTO v_uf, v_state_name, v_macro
  FROM public.get_uf_metadata(p_state) m;

  v_city := LEFT(TRIM(REGEXP_REPLACE(COALESCE(p_city, ''), '[0-9]+', '', 'g')), 80);
  IF v_city = '' THEN
    IF v_uf = 'BR' THEN
      v_city := 'Nacional';
    ELSE
      v_city := 'Todo o estado';
    END IF;
  END IF;

  v_city_norm := public.normalize_geo_text(v_city);

  INSERT INTO public.dim_regions (state_code, state_name, macro_region, city_name, city_normalized)
  VALUES (v_uf, v_state_name, v_macro, v_city, v_city_norm)
  ON CONFLICT (state_code, city_normalized) DO UPDATE SET
    city_name = EXCLUDED.city_name
  RETURNING region_sk INTO v_region_sk;

  RETURN v_region_sk;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_dim_region(TEXT, TEXT) FROM PUBLIC;

-- 1.3 Dimensão Temporal (dim_dates)
CREATE TABLE IF NOT EXISTS public.dim_dates (
  date_sk INTEGER PRIMARY KEY,
  full_date DATE NOT NULL UNIQUE,
  year SMALLINT NOT NULL,
  quarter SMALLINT NOT NULL CHECK (quarter BETWEEN 1 AND 4),
  month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
  month_name TEXT NOT NULL,
  day_of_month SMALLINT NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  is_weekend BOOLEAN NOT NULL
);

ALTER TABLE public.dim_dates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_dates FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dim_dates_public_read" ON public.dim_dates;
CREATE POLICY "dim_dates_public_read"
  ON public.dim_dates
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

CREATE OR REPLACE FUNCTION public.ensure_dim_date(p_date DATE DEFAULT CURRENT_DATE)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_date DATE := COALESCE(p_date, CURRENT_DATE);
  v_date_sk INTEGER := TO_CHAR(v_date, 'YYYYMMDD')::INTEGER;
  v_month_names TEXT[] := ARRAY[
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  v_m INTEGER := EXTRACT(MONTH FROM v_date)::INTEGER;
  v_dow INTEGER := EXTRACT(DOW FROM v_date)::INTEGER;
BEGIN
  INSERT INTO public.dim_dates (
    date_sk, full_date, year, quarter, month, month_name, day_of_month, day_of_week, is_weekend
  )
  VALUES (
    v_date_sk,
    v_date,
    EXTRACT(YEAR FROM v_date)::SMALLINT,
    EXTRACT(QUARTER FROM v_date)::SMALLINT,
    v_m::SMALLINT,
    v_month_names[v_m],
    EXTRACT(DAY FROM v_date)::SMALLINT,
    v_dow::SMALLINT,
    v_dow IN (0, 6)
  )
  ON CONFLICT (date_sk) DO NOTHING;

  RETURN v_date_sk;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_dim_date(DATE) FROM PUBLIC;

-- 1.4 Dimensão Canais de Acesso (dim_access_channels)
CREATE TABLE IF NOT EXISTS public.dim_access_channels (
  channel_sk SMALLINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  channel_key TEXT NOT NULL UNIQUE CHECK (
    channel_key IN ('web_cep', 'web_voice', 'triage_agent', 'category_card', 'pwa_offline', 'widget_ngo')
  ),
  channel_label TEXT NOT NULL
);

INSERT INTO public.dim_access_channels (channel_key, channel_label)
VALUES
  ('web_cep', 'Busca por CEP ou Cidade'),
  ('web_voice', 'Busca por Voz'),
  ('triage_agent', 'Agente de Acolhimento'),
  ('category_card', 'Card de Categoria'),
  ('pwa_offline', 'Aplicativo PWA Offline'),
  ('widget_ngo', 'Widget em Site Parceiro')
ON CONFLICT (channel_key) DO UPDATE SET
  channel_label = EXCLUDED.channel_label;

ALTER TABLE public.dim_access_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dim_access_channels FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "dim_access_channels_public_read" ON public.dim_access_channels;
CREATE POLICY "dim_access_channels_public_read"
  ON public.dim_access_channels
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- ----------------------------------------------------------------------------
-- 2. NORMALIZAÇÃO 3FN DAS TABELAS OPERACIONAIS (services, ngos, tags, N:N)
-- ----------------------------------------------------------------------------

ALTER TABLE public.services
  ADD COLUMN IF NOT EXISTS category_sk SMALLINT REFERENCES public.dim_categories(category_sk),
  ADD COLUMN IF NOT EXISTS region_sk BIGINT REFERENCES public.dim_regions(region_sk),
  ADD COLUMN IF NOT EXISTS cep CHAR(9),
  ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION;

CREATE INDEX IF NOT EXISTS idx_services_region_category_active
  ON public.services (region_sk, category_sk)
  WHERE is_active = TRUE AND is_verified = TRUE AND requires_registration = FALSE;

CREATE INDEX IF NOT EXISTS idx_services_geo_coords
  ON public.services (state, lat, lng)
  WHERE is_active = TRUE AND is_verified = TRUE AND requires_registration = FALSE AND lat IS NOT NULL AND lng IS NOT NULL;

-- Tabela normalizada de Tags (1FN/3FN) + associativa N:N service_tags
CREATE TABLE IF NOT EXISTS public.tags (
  tag_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  tag_slug TEXT NOT NULL UNIQUE,
  tag_label TEXT NOT NULL
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tags_public_read" ON public.tags;
CREATE POLICY "tags_public_read"
  ON public.tags
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

DROP POLICY IF EXISTS "tags_partner_insert" ON public.tags;
CREATE POLICY "tags_partner_insert"
  ON public.tags
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partner_profiles p
      WHERE p.id = auth.uid() AND p.is_active = TRUE
    )
  );

CREATE TABLE IF NOT EXISTS public.service_tags (
  service_id TEXT NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES public.tags(tag_id) ON DELETE CASCADE,
  PRIMARY KEY (service_id, tag_id)
);

ALTER TABLE public.service_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_tags FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_tags_public_read" ON public.service_tags;
CREATE POLICY "service_tags_public_read"
  ON public.service_tags
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
      WHERE s.id = service_tags.service_id
        AND s.is_active = TRUE
        AND s.is_verified = TRUE
        AND s.requires_registration = FALSE
    )
  );

DROP POLICY IF EXISTS "service_tags_partner_write" ON public.service_tags;
CREATE POLICY "service_tags_partner_write"
  ON public.service_tags
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.services s
      JOIN public.partner_profiles p ON p.id = auth.uid()
      WHERE s.id = service_tags.service_id
        AND p.is_active = TRUE
        AND (p.role = 'admin' OR s.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.services s
      JOIN public.partner_profiles p ON p.id = auth.uid()
      WHERE s.id = service_tags.service_id
        AND p.is_active = TRUE
        AND (p.role = 'admin' OR s.owner_id = auth.uid())
    )
  );

-- Tabela associativa N:N ngo_categories (substitui dependência exclusiva de array)
CREATE TABLE IF NOT EXISTS public.ngo_categories (
  ngo_id TEXT NOT NULL REFERENCES public.ngos(id) ON DELETE CASCADE,
  category_sk SMALLINT NOT NULL REFERENCES public.dim_categories(category_sk) ON DELETE CASCADE,
  PRIMARY KEY (ngo_id, category_sk)
);

ALTER TABLE public.ngo_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ngo_categories FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ngo_categories_public_read" ON public.ngo_categories;
CREATE POLICY "ngo_categories_public_read"
  ON public.ngo_categories
  FOR SELECT
  TO anon, authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ngos n
      WHERE n.id = ngo_categories.ngo_id
        AND n.is_active = TRUE
        AND n.is_verified = TRUE
    )
  );

DROP POLICY IF EXISTS "ngo_categories_partner_write" ON public.ngo_categories;
CREATE POLICY "ngo_categories_partner_write"
  ON public.ngo_categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.ngos n
      JOIN public.partner_profiles p ON p.id = auth.uid()
      WHERE n.id = ngo_categories.ngo_id
        AND p.is_active = TRUE
        AND (p.role = 'admin' OR n.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ngos n
      JOIN public.partner_profiles p ON p.id = auth.uid()
      WHERE n.id = ngo_categories.ngo_id
        AND p.is_active = TRUE
        AND (p.role = 'admin' OR n.owner_id = auth.uid())
    )
  );

-- Trigger de normalização automática para services
CREATE OR REPLACE FUNCTION public.trg_sync_service_dimensions_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cat_sk SMALLINT;
  v_reg_sk BIGINT;
BEGIN
  SELECT category_sk INTO v_cat_sk
  FROM public.dim_categories
  WHERE category_key = NEW.category;

  IF v_cat_sk IS NULL THEN
    SELECT category_sk INTO v_cat_sk
    FROM public.dim_categories
    WHERE category_key = 'social';
  END IF;

  IF NEW.is_national_online THEN
    v_reg_sk := public.ensure_dim_region('BR', 'Nacional');
  ELSE
    v_reg_sk := public.ensure_dim_region(NEW.state, NEW.city);
  END IF;

  NEW.category_sk := v_cat_sk;
  NEW.region_sk := v_reg_sk;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_service_dimensions ON public.services;
CREATE TRIGGER trg_sync_service_dimensions
  BEFORE INSERT OR UPDATE OF category, is_national_online, state, city
  ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_service_dimensions_fn();

-- Trigger para sincronizar tags associativas após insert/update em services
CREATE OR REPLACE FUNCTION public.trg_sync_service_tags_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tag TEXT;
  v_slug TEXT;
  v_tag_id INTEGER;
BEGIN
  DELETE FROM public.service_tags WHERE service_id = NEW.id;

  IF NEW.tags IS NOT NULL THEN
    FOREACH v_tag IN ARRAY NEW.tags LOOP
      v_tag := TRIM(v_tag);
      IF v_tag <> '' THEN
        v_slug := REGEXP_REPLACE(public.normalize_geo_text(v_tag), '[^a-z0-9]+', '-', 'g');
        v_slug := TRIM(BOTH '-' FROM v_slug);
        IF v_slug <> '' THEN
          INSERT INTO public.tags (tag_slug, tag_label)
          VALUES (v_slug, v_tag)
          ON CONFLICT (tag_slug) DO UPDATE SET tag_label = EXCLUDED.tag_label
          RETURNING tag_id INTO v_tag_id;

          INSERT INTO public.service_tags (service_id, tag_id)
          VALUES (NEW.id, v_tag_id)
          ON CONFLICT DO NOTHING;
        END IF;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_service_tags ON public.services;
CREATE TRIGGER trg_sync_service_tags
  AFTER INSERT OR UPDATE OF tags
  ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_service_tags_fn();

-- Trigger para sincronizar ngo_categories após insert/update em ngos
CREATE OR REPLACE FUNCTION public.trg_sync_ngo_categories_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cat TEXT;
  v_cat_sk SMALLINT;
BEGIN
  DELETE FROM public.ngo_categories WHERE ngo_id = NEW.id;

  IF NEW.related_categories IS NOT NULL THEN
    FOREACH v_cat IN ARRAY NEW.related_categories LOOP
      SELECT category_sk INTO v_cat_sk
      FROM public.dim_categories
      WHERE category_key = TRIM(LOWER(v_cat));

      IF v_cat_sk IS NOT NULL THEN
        INSERT INTO public.ngo_categories (ngo_id, category_sk)
        VALUES (NEW.id, v_cat_sk)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ngo_categories ON public.ngos;
CREATE TRIGGER trg_sync_ngo_categories
  AFTER INSERT OR UPDATE OF related_categories
  ON public.ngos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_ngo_categories_fn();

-- Backfill seguro dos registros já existentes em services e ngos
UPDATE public.services SET
  category = category,
  tags = tags,
  cep = COALESCE(cep, CASE id
    WHEN 'sp-casa-angela' THEN '04914-050'
    WHEN 'rj-casa-parto-david-capistrano' THEN '21741-400'
    WHEN 'ba-cpn-mansao-caminho' THEN '41235-000'
    WHEN 'mg-hospital-sofia-feldman' THEN '31844-130'
    ELSE cep
  END),
  lat = COALESCE(lat, CASE id
    WHEN 'sp-casa-angela' THEN -23.6795
    WHEN 'rj-casa-parto-david-capistrano' THEN -22.8781
    WHEN 'ba-cpn-mansao-caminho' THEN -12.9277
    WHEN 'mg-hospital-sofia-feldman' THEN -19.8407
    ELSE lat
  END),
  lng = COALESCE(lng, CASE id
    WHEN 'sp-casa-angela' THEN -46.7521
    WHEN 'rj-casa-parto-david-capistrano' THEN -43.4317
    WHEN 'ba-cpn-mansao-caminho' THEN -38.4316
    WHEN 'mg-hospital-sofia-feldman' THEN -43.9163
    ELSE lng
  END);

UPDATE public.ngos SET related_categories = related_categories;

-- ----------------------------------------------------------------------------
-- 3. STAR SCHEMA CENTRAL: TABELA FATO fact_search_demand + VIEW ANALÍTICA
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.fact_search_demand (
  fact_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  date_sk INTEGER NOT NULL REFERENCES public.dim_dates(date_sk),
  category_sk SMALLINT NOT NULL REFERENCES public.dim_categories(category_sk),
  region_sk BIGINT NOT NULL REFERENCES public.dim_regions(region_sk),
  channel_sk SMALLINT NOT NULL REFERENCES public.dim_access_channels(channel_sk),
  search_count INTEGER NOT NULL DEFAULT 1 CHECK (search_count > 0),
  CONSTRAINT uq_fact_search_demand_grain UNIQUE (date_sk, category_sk, region_sk, channel_sk)
);

CREATE INDEX IF NOT EXISTS idx_fact_search_demand_date
  ON public.fact_search_demand (date_sk DESC, search_count DESC);

CREATE INDEX IF NOT EXISTS idx_fact_search_demand_region_cat
  ON public.fact_search_demand (region_sk, category_sk, date_sk DESC);

ALTER TABLE public.fact_search_demand ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fact_search_demand FORCE ROW LEVEL SECURITY;

-- Leitura pública apenas dos totais agregados (Zero-PII); escrita direta bloqueada!
DROP POLICY IF EXISTS "fact_search_demand_public_read" ON public.fact_search_demand;
CREATE POLICY "fact_search_demand_public_read"
  ON public.fact_search_demand
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- View Star Schema com security_invoker = true (respeita RLS integralmente)
CREATE OR REPLACE VIEW public.vw_star_search_demand
WITH (security_invoker = true)
AS
SELECT
  f.fact_id,
  d.date_sk,
  d.full_date AS demand_date,
  d.year,
  d.quarter,
  d.month,
  d.month_name,
  c.category_key AS topic_key,
  c.label AS topic_label,
  r.state_code,
  r.state_name,
  r.macro_region,
  r.city_name,
  ch.channel_key,
  ch.channel_label,
  f.search_count
FROM public.fact_search_demand f
JOIN public.dim_dates d ON d.date_sk = f.date_sk
JOIN public.dim_categories c ON c.category_sk = f.category_sk
JOIN public.dim_regions r ON r.region_sk = f.region_sk
JOIN public.dim_access_channels ch ON ch.channel_sk = f.channel_sk;

GRANT SELECT ON public.vw_star_search_demand TO anon, authenticated;

-- View normalizada de serviços verificados com security_invoker = true
CREATE OR REPLACE VIEW public.vw_services_normalized
WITH (security_invoker = true)
AS
SELECT
  s.id,
  s.name,
  c.category_key AS category,
  c.label AS category_label,
  s.subcategory,
  s.description,
  s.is_national_online,
  r.state_code AS state,
  r.state_name,
  r.macro_region,
  r.city_name AS city,
  s.neighborhood,
  s.address,
  s.cep,
  s.lat,
  s.lng,
  s.phone,
  s.whatsapp,
  s.website,
  s.hours,
  s.access_mode,
  s.requires_registration,
  s.free_confirmation,
  s.tags,
  s.tips_for_woman
FROM public.services s
JOIN public.dim_categories c ON c.category_sk = s.category_sk
JOIN public.dim_regions r ON r.region_sk = s.region_sk
WHERE s.is_active = TRUE
  AND s.is_verified = TRUE
  AND s.requires_registration = FALSE;

GRANT SELECT ON public.vw_services_normalized TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. RPCs SEGURAS PARA BUSCA POR PROXIMIDADE (<= 30 KM) E REGISTRO STAR SCHEMA
-- ----------------------------------------------------------------------------

-- 4.1 Gravar busca anônima no Star Schema (atualiza fact_search_demand + tabela legada 003 se existir)
CREATE OR REPLACE FUNCTION public.record_star_search_demand(
  p_topic_key TEXT DEFAULT 'geral',
  p_state TEXT DEFAULT 'BR',
  p_city TEXT DEFAULT 'Nacional',
  p_channel_key TEXT DEFAULT 'web_cep'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_topic_key TEXT := LOWER(TRIM(COALESCE(p_topic_key, 'geral')));
  v_channel_key TEXT := LOWER(TRIM(COALESCE(p_channel_key, 'web_cep')));
  v_date_sk INTEGER;
  v_cat_sk SMALLINT;
  v_reg_sk BIGINT;
  v_ch_sk SMALLINT;
  v_state CHAR(2);
  v_city TEXT;
BEGIN
  IF v_topic_key = 'social' THEN
    v_topic_key := 'ongs_apoio';
  END IF;

  SELECT category_sk INTO v_cat_sk
  FROM public.dim_categories
  WHERE category_key = v_topic_key;

  IF v_cat_sk IS NULL THEN
    v_topic_key := 'geral';
    SELECT category_sk INTO v_cat_sk
    FROM public.dim_categories
    WHERE category_key = 'geral';
  END IF;

  SELECT channel_sk INTO v_ch_sk
  FROM public.dim_access_channels
  WHERE channel_key = v_channel_key;

  IF v_ch_sk IS NULL THEN
    SELECT channel_sk INTO v_ch_sk
    FROM public.dim_access_channels
    WHERE channel_key = 'web_cep';
  END IF;

  v_date_sk := public.ensure_dim_date(CURRENT_DATE);
  v_reg_sk := public.ensure_dim_region(p_state, p_city);

  INSERT INTO public.fact_search_demand (
    date_sk, category_sk, region_sk, channel_sk, search_count
  )
  VALUES (
    v_date_sk, v_cat_sk, v_reg_sk, v_ch_sk, 1
  )
  ON CONFLICT (date_sk, category_sk, region_sk, channel_sk)
  DO UPDATE SET
    search_count = public.fact_search_demand.search_count + 1;

  -- Mantém espelho em search_demand_stats caso a tabela 003 já exista
  IF TO_REGCLASS('public.search_demand_stats') IS NOT NULL THEN
    SELECT r.state_code, r.city_name INTO v_state, v_city
    FROM public.dim_regions r
    WHERE r.region_sk = v_reg_sk;

    INSERT INTO public.search_demand_stats (
      demand_date, topic_key, topic_label, state, city, search_count
    )
    SELECT
      CURRENT_DATE,
      c.category_key,
      c.label,
      v_state,
      v_city,
      1
    FROM public.dim_categories c
    WHERE c.category_sk = v_cat_sk
    ON CONFLICT (demand_date, topic_key, state, city)
    DO UPDATE SET
      search_count = public.search_demand_stats.search_count + 1;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.record_star_search_demand(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_star_search_demand(TEXT, TEXT, TEXT, TEXT) TO anon, authenticated;

-- Atualiza também a assinatura antiga (3 parâmetros) para delegar ao Star Schema
CREATE OR REPLACE FUNCTION public.record_anonymous_search_demand(
  p_topic_key TEXT DEFAULT 'geral',
  p_state TEXT DEFAULT 'BR',
  p_city TEXT DEFAULT 'Nacional'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.record_star_search_demand(p_topic_key, p_state, p_city, 'web_cep');
END;
$$;

REVOKE ALL ON FUNCTION public.record_anonymous_search_demand(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_anonymous_search_demand(TEXT, TEXT, TEXT) TO anon, authenticated;

-- 4.2 Busca normalizada por estado + raio <= 30 km (Haversine) + canais nacionais 24h
CREATE OR REPLACE FUNCTION public.search_verified_services(
  p_category_key TEXT DEFAULT NULL,
  p_state TEXT DEFAULT NULL,
  p_lat DOUBLE PRECISION DEFAULT NULL,
  p_lng DOUBLE PRECISION DEFAULT NULL,
  p_max_km DOUBLE PRECISION DEFAULT 30
)
RETURNS TABLE(
  id TEXT,
  name TEXT,
  category TEXT,
  subcategory TEXT,
  description TEXT,
  is_national_online BOOLEAN,
  state CHAR(2),
  city TEXT,
  neighborhood TEXT,
  address TEXT,
  cep CHAR(9),
  phone TEXT,
  whatsapp TEXT,
  website TEXT,
  hours TEXT,
  access_mode TEXT,
  free_confirmation TEXT,
  tags TEXT[],
  tips_for_woman TEXT,
  distance_km DOUBLE PRECISION
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
  WITH base AS (
    SELECT
      s.id,
      s.name,
      c.category_key AS category,
      s.subcategory,
      s.description,
      s.is_national_online,
      r.state_code AS state,
      r.city_name AS city,
      s.neighborhood,
      s.address,
      s.cep,
      s.phone,
      s.whatsapp,
      s.website,
      s.hours,
      s.access_mode,
      s.free_confirmation,
      s.tags,
      s.tips_for_woman,
      CASE
        WHEN s.is_national_online THEN NULL::DOUBLE PRECISION
        WHEN p_lat IS NOT NULL AND p_lng IS NOT NULL AND s.lat IS NOT NULL AND s.lng IS NOT NULL THEN
          6371.0 * 2.0 * ASIN(
            LEAST(
              1.0,
              SQRT(
                POWER(SIN(RADIANS(s.lat - p_lat) / 2.0), 2) +
                COS(RADIANS(p_lat)) * COS(RADIANS(s.lat)) *
                POWER(SIN(RADIANS(s.lng - p_lng) / 2.0), 2)
              )
            )
          )
        ELSE NULL::DOUBLE PRECISION
      END AS computed_km
    FROM public.services s
    JOIN public.dim_categories c ON c.category_sk = s.category_sk
    JOIN public.dim_regions r ON r.region_sk = s.region_sk
    WHERE s.is_active = TRUE
      AND s.is_verified = TRUE
      AND s.requires_registration = FALSE
      AND (
        p_category_key IS NULL
        OR TRIM(p_category_key) = ''
        OR c.category_key = LOWER(TRIM(p_category_key))
      )
      AND (
        p_state IS NULL
        OR TRIM(p_state) = ''
        OR s.is_national_online = TRUE
        OR r.state_code = UPPER(TRIM(p_state))
      )
  )
  SELECT
    b.id,
    b.name,
    b.category,
    b.subcategory,
    b.description,
    b.is_national_online,
    b.state,
    b.city,
    b.neighborhood,
    b.address,
    b.cep,
    b.phone,
    b.whatsapp,
    b.website,
    b.hours,
    b.access_mode,
    b.free_confirmation,
    b.tags,
    b.tips_for_woman,
    ROUND(b.computed_km::NUMERIC, 1)::DOUBLE PRECISION AS distance_km
  FROM base b
  WHERE b.is_national_online = TRUE
     OR b.computed_km IS NULL
     OR b.computed_km <= COALESCE(p_max_km, 30)
  ORDER BY
    b.is_national_online ASC,
    b.computed_km ASC NULLS LAST,
    b.name ASC;
$$;

REVOKE ALL ON FUNCTION public.search_verified_services(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_verified_services(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION) TO anon, authenticated;

-- Migra eventuais registros legados de search_demand_stats para o Star Schema
DO $$
DECLARE
  rec RECORD;
  v_date_sk INTEGER;
  v_cat_sk SMALLINT;
  v_reg_sk BIGINT;
  v_ch_sk SMALLINT;
BEGIN
  IF TO_REGCLASS('public.search_demand_stats') IS NOT NULL THEN
    SELECT channel_sk INTO v_ch_sk
    FROM public.dim_access_channels
    WHERE channel_key = 'web_cep';

    FOR rec IN SELECT demand_date, topic_key, state, city, search_count FROM public.search_demand_stats LOOP
      v_date_sk := public.ensure_dim_date(rec.demand_date);
      SELECT category_sk INTO v_cat_sk FROM public.dim_categories WHERE category_key = rec.topic_key;
      IF v_cat_sk IS NOT NULL AND v_ch_sk IS NOT NULL THEN
        v_reg_sk := public.ensure_dim_region(rec.state, rec.city);
        INSERT INTO public.fact_search_demand (date_sk, category_sk, region_sk, channel_sk, search_count)
        VALUES (v_date_sk, v_cat_sk, v_reg_sk, v_ch_sk, rec.search_count)
        ON CONFLICT (date_sk, category_sk, region_sk, channel_sk)
        DO UPDATE SET search_count = GREATEST(public.fact_search_demand.search_count, EXCLUDED.search_count);
      END IF;
    END LOOP;
  END IF;
END $$;

-- Ativa Realtime na tabela fato do Star Schema de forma idempotente
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'fact_search_demand'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.fact_search_demand;
  END IF;
END $$;
