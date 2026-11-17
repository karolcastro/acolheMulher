-- ============================================================================
-- AcolheMulher — Banco 100% Sem Acentos e Sem Caracteres Especiais (UTF-8 ASCII)
-- ============================================================================
-- Execute este script no SQL Editor do Supabase após 006 (idempotente).
--
-- O que este script garante em TODAS as tabelas do banco:
-- 1. ZERO acentos (á, ã, ç, é, ê, í, ó, õ, ú, etc.) em qualquer coluna textual.
-- 2. ZERO caracteres especiais (—, –, ·, (), {}, [], /, &, %, :, ;, !, ?, , , .)
--    em nomes, descrições, cidades, estados, macrorregiões, subcategorias,
--    modos de acesso, canais, tags, itens de ajuda, endereços, horários,
--    telefones, CEP, frases de voz e palavras-chave.
-- 3. Limpeza automática de 100% dos registros existentes (backfill completo).
-- 4. Triggers BEFORE INSERT OR UPDATE (trg_00_sanitize_*) em TODAS as tabelas
--    para impedir a gravação de acentos ou caracteres especiais no futuro.
-- 5. Constraints CHECK em TODAS as tabelas validando o padrão estrito ASCII.
-- 6. Mantém ENABLE + FORCE ROW LEVEL SECURITY em 100% das tabelas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Funções Utilitárias Estritas (UTF-8 -> ASCII Puro Sem Acento e Sem Símbolos)
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.sanitize_strict_ascii_text(p_input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          TRANSLATE(
            COALESCE(p_input, ''),
            'ÁÀÂÃÄÅáàâãäåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖØóòôõöøÚÙÛÜúùûüÇçÑñÝýÿªº',
            'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOOooooooUUUUuuuuCcNnYyyao'
          ),
          '[\u0300-\u036f]',
          '',
          'g'
        ),
        '[^A-Za-z0-9 ]+',
        ' ',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.sanitize_strict_ascii_key(p_input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT LOWER(public.sanitize_strict_ascii_text(p_input));
$$;

CREATE OR REPLACE FUNCTION public.sanitize_strict_ascii_array(p_arr TEXT[])
RETURNS TEXT[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    ARRAY(
      SELECT elem_clean
      FROM (
        SELECT public.sanitize_strict_ascii_text(elem) AS elem_clean
        FROM UNNEST(COALESCE(p_arr, ARRAY[]::TEXT[])) AS elem
      ) s
      WHERE elem_clean <> ''
    ),
    ARRAY[]::TEXT[]
  );
$$;

CREATE OR REPLACE FUNCTION public.is_strict_ascii_array(p_arr TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_arr IS NULL THEN TRUE
    ELSE NOT EXISTS (
      SELECT 1
      FROM UNNEST(p_arr) AS elem
      WHERE elem IS NULL OR elem = '' OR elem !~ '^[A-Za-z0-9 ]+$'
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.is_strict_key_array(p_arr TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_arr IS NULL THEN TRUE
    ELSE NOT EXISTS (
      SELECT 1
      FROM UNNEST(p_arr) AS elem
      WHERE elem IS NULL OR elem = '' OR elem !~ '^[a-z0-9_]+$'
    )
  END;
$$;

CREATE OR REPLACE FUNCTION public.sanitize_strict_digits_space(p_input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT NULLIF(
    TRIM(REGEXP_REPLACE(REGEXP_REPLACE(COALESCE(p_input, ''), '[^0-9 ]+', ' ', 'g'), '\s+', ' ', 'g')),
    ''
  );
$$;

CREATE OR REPLACE FUNCTION public.sanitize_strict_ascii_url(p_url TEXT, p_fallback TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_clean TEXT;
BEGIN
  v_clean := TRIM(
    TRANSLATE(
      COALESCE(p_url, ''),
      'ÁÀÂÃÄÅáàâãäåÉÈÊËéèêëÍÌÎÏíìîïÓÒÔÕÖØóòôõöøÚÙÛÜúùûüÇçÑñÝýÿ',
      'AAAAAAaaaaaaEEEEeeeeIIIIiiiiOOOOOOooooooUUUUuuuuCcNnYyy'
    )
  );
  v_clean := REGEXP_REPLACE(v_clean, '[^A-Za-z0-9._:/?=&-]+', '', 'g');

  IF v_clean ~ '^https?://[A-Za-z0-9._-]+([:/?=&A-Za-z0-9._-]*)$' THEN
    RETURN LEFT(v_clean, 300);
  END IF;

  RETURN p_fallback;
END;
$$;

-- Atualiza também funções legadas de normalização para usarem o padrão sem acento / sem símbolo
CREATE OR REPLACE FUNCTION public.normalize_geo_text(p_input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.sanitize_strict_ascii_key(p_input);
$$;

CREATE OR REPLACE FUNCTION public.normalize_ascii_key(p_input TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT public.sanitize_strict_ascii_key(
    REGEXP_REPLACE(COALESCE(p_input, ''), '\([^)]*\)', ' ', 'g')
  );
$$;

CREATE OR REPLACE FUNCTION public.normalize_ngo_name(p_name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        public.sanitize_strict_ascii_key(
          REGEXP_REPLACE(COALESCE(p_name, ''), '\([^)]*\)', ' ', 'g')
        ),
        '\b(de|da|do|das|dos|e|para|em|no|na|nos|nas)\b',
        ' ',
        'g'
      ),
      '\s+',
      ' ',
      'g'
    )
  );
$$;

-- Atualiza metadados de UF para nomes 100% sem acento e sem hífen (Centro Oeste)
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
    WHEN 'AP' THEN RETURN QUERY SELECT 'AP'::CHAR(2), 'Amapa', 'Norte';
    WHEN 'AM' THEN RETURN QUERY SELECT 'AM'::CHAR(2), 'Amazonas', 'Norte';
    WHEN 'PA' THEN RETURN QUERY SELECT 'PA'::CHAR(2), 'Para', 'Norte';
    WHEN 'RO' THEN RETURN QUERY SELECT 'RO'::CHAR(2), 'Rondonia', 'Norte';
    WHEN 'RR' THEN RETURN QUERY SELECT 'RR'::CHAR(2), 'Roraima', 'Norte';
    WHEN 'TO' THEN RETURN QUERY SELECT 'TO'::CHAR(2), 'Tocantins', 'Norte';
    WHEN 'AL' THEN RETURN QUERY SELECT 'AL'::CHAR(2), 'Alagoas', 'Nordeste';
    WHEN 'BA' THEN RETURN QUERY SELECT 'BA'::CHAR(2), 'Bahia', 'Nordeste';
    WHEN 'CE' THEN RETURN QUERY SELECT 'CE'::CHAR(2), 'Ceara', 'Nordeste';
    WHEN 'MA' THEN RETURN QUERY SELECT 'MA'::CHAR(2), 'Maranhao', 'Nordeste';
    WHEN 'PB' THEN RETURN QUERY SELECT 'PB'::CHAR(2), 'Paraiba', 'Nordeste';
    WHEN 'PE' THEN RETURN QUERY SELECT 'PE'::CHAR(2), 'Pernambuco', 'Nordeste';
    WHEN 'PI' THEN RETURN QUERY SELECT 'PI'::CHAR(2), 'Piaui', 'Nordeste';
    WHEN 'RN' THEN RETURN QUERY SELECT 'RN'::CHAR(2), 'Rio Grande do Norte', 'Nordeste';
    WHEN 'SE' THEN RETURN QUERY SELECT 'SE'::CHAR(2), 'Sergipe', 'Nordeste';
    WHEN 'DF' THEN RETURN QUERY SELECT 'DF'::CHAR(2), 'Distrito Federal', 'Centro Oeste';
    WHEN 'GO' THEN RETURN QUERY SELECT 'GO'::CHAR(2), 'Goias', 'Centro Oeste';
    WHEN 'MT' THEN RETURN QUERY SELECT 'MT'::CHAR(2), 'Mato Grosso', 'Centro Oeste';
    WHEN 'MS' THEN RETURN QUERY SELECT 'MS'::CHAR(2), 'Mato Grosso do Sul', 'Centro Oeste';
    WHEN 'ES' THEN RETURN QUERY SELECT 'ES'::CHAR(2), 'Espirito Santo', 'Sudeste';
    WHEN 'MG' THEN RETURN QUERY SELECT 'MG'::CHAR(2), 'Minas Gerais', 'Sudeste';
    WHEN 'RJ' THEN RETURN QUERY SELECT 'RJ'::CHAR(2), 'Rio de Janeiro', 'Sudeste';
    WHEN 'SP' THEN RETURN QUERY SELECT 'SP'::CHAR(2), 'Sao Paulo', 'Sudeste';
    WHEN 'PR' THEN RETURN QUERY SELECT 'PR'::CHAR(2), 'Parana', 'Sul';
    WHEN 'RS' THEN RETURN QUERY SELECT 'RS'::CHAR(2), 'Rio Grande do Sul', 'Sul';
    WHEN 'SC' THEN RETURN QUERY SELECT 'SC'::CHAR(2), 'Santa Catarina', 'Sul';
    ELSE RETURN QUERY SELECT 'BR'::CHAR(2), 'Brasil', 'Nacional';
  END CASE;
END;
$$;

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

  v_city := LEFT(public.sanitize_strict_ascii_text(REGEXP_REPLACE(COALESCE(p_city, ''), '[0-9]+', ' ', 'g')), 80);
  IF v_city = '' THEN
    IF v_uf = 'BR' THEN
      v_city := 'Nacional';
    ELSE
      v_city := 'Todo o estado';
    END IF;
  END IF;

  v_city_norm := public.sanitize_strict_ascii_key(v_city);

  INSERT INTO public.dim_regions (state_code, state_name, macro_region, city_name, city_normalized)
  VALUES (v_uf, v_state_name, v_macro, v_city, v_city_norm)
  ON CONFLICT (state_code, city_normalized) DO UPDATE SET
    state_name = EXCLUDED.state_name,
    macro_region = EXCLUDED.macro_region,
    city_name = EXCLUDED.city_name
  RETURNING region_sk INTO v_region_sk;

  RETURN v_region_sk;
END;
$$;

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
    'Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho',
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
  ON CONFLICT (date_sk) DO UPDATE SET
    month_name = EXCLUDED.month_name;

  RETURN v_date_sk;
END;
$$;

-- Atualiza trigger de tags ANTES dos backfills para gravar tag_slug sem hífens/acentos
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
      v_tag := public.sanitize_strict_ascii_text(v_tag);
      IF v_tag <> '' THEN
        v_slug := LOWER(v_tag);
        INSERT INTO public.tags (tag_slug, tag_label)
        VALUES (v_slug, v_tag)
        ON CONFLICT (tag_slug) DO UPDATE SET tag_label = EXCLUDED.tag_label
        RETURNING tag_id INTO v_tag_id;

        INSERT INTO public.service_tags (service_id, tag_id)
        VALUES (NEW.id, v_tag_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 1. Remove restrições antigas incompatíveis com limpeza e sanitiza dados existentes
-- ----------------------------------------------------------------------------

-- 1.1 dim_regions (permite 'Centro Oeste' sem hífen e limpa acentos)
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.dim_regions'::regclass
      AND contype = 'c'
  LOOP
    EXECUTE format('ALTER TABLE public.dim_regions DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

UPDATE public.dim_regions r
SET
  state_name = COALESCE((SELECT m.state_name FROM public.get_uf_metadata(r.state_code) m), 'Brasil'),
  macro_region = COALESCE((SELECT m.macro_region FROM public.get_uf_metadata(r.state_code) m), 'Nacional'),
  city_name = COALESCE(NULLIF(public.sanitize_strict_ascii_text(REGEXP_REPLACE(r.city_name, '[0-9]+', ' ', 'g')), ''), 'Nacional'),
  city_normalized = COALESCE(NULLIF(public.sanitize_strict_ascii_key(REGEXP_REPLACE(r.city_name, '[0-9]+', ' ', 'g')), ''), 'nacional');

-- Consolida eventuais duplicatas em dim_regions após remover acentos
DO $$
DECLARE
  dup RECORD;
BEGIN
  FOR dup IN
    SELECT
      MIN(region_sk) AS keep_sk,
      ARRAY_AGG(region_sk ORDER BY region_sk) AS all_sks
    FROM public.dim_regions
    GROUP BY state_code, city_normalized
    HAVING COUNT(*) > 1
  LOOP
    UPDATE public.fact_search_demand
    SET region_sk = dup.keep_sk
    WHERE region_sk = ANY(dup.all_sks) AND region_sk <> dup.keep_sk;

    UPDATE public.fact_voice_searches
    SET region_sk = dup.keep_sk
    WHERE region_sk = ANY(dup.all_sks) AND region_sk <> dup.keep_sk;

    UPDATE public.services
    SET region_sk = dup.keep_sk
    WHERE region_sk = ANY(dup.all_sks) AND region_sk <> dup.keep_sk;

    UPDATE public.ngos
    SET region_sk = dup.keep_sk
    WHERE region_sk = ANY(dup.all_sks) AND region_sk <> dup.keep_sk;

    DELETE FROM public.dim_regions
    WHERE region_sk = ANY(dup.all_sks) AND region_sk <> dup.keep_sk;
  END LOOP;
END $$;

-- 1.2 dim_dates
UPDATE public.dim_dates
SET month_name = public.sanitize_strict_ascii_text(month_name);

-- 1.3 dim_categories
UPDATE public.dim_categories
SET
  label = public.sanitize_strict_ascii_text(label),
  description = public.sanitize_strict_ascii_text(description);

-- 1.4 dim_access_channels
UPDATE public.dim_access_channels
SET channel_label = public.sanitize_strict_ascii_text(channel_label);

-- 1.5 dim_access_modes
UPDATE public.dim_access_modes
SET access_mode_label = public.sanitize_strict_ascii_text(access_mode_label);

-- 1.6 dim_ngo_areas
UPDATE public.dim_ngo_areas
SET
  area_label = public.sanitize_strict_ascii_text(area_label),
  area_normalized = public.sanitize_strict_ascii_key(area_normalized);

-- 1.7 dim_organizations (consolida eventuais duplicatas e limpa acentos/especiais)
DO $$
DECLARE
  dup RECORD;
BEGIN
  FOR dup IN
    SELECT
      MIN(organization_sk) AS keep_sk,
      ARRAY_AGG(organization_sk ORDER BY organization_sk) AS all_sks
    FROM public.dim_organizations
    GROUP BY COALESCE(NULLIF(public.sanitize_strict_ascii_key(organization_name), ''), 'organizacao parceira')
    HAVING COUNT(*) > 1
  LOOP
    UPDATE public.ngos
    SET organization_sk = dup.keep_sk
    WHERE organization_sk = ANY(dup.all_sks) AND organization_sk <> dup.keep_sk;

    DELETE FROM public.dim_organizations
    WHERE organization_sk = ANY(dup.all_sks) AND organization_sk <> dup.keep_sk;
  END LOOP;
END $$;

UPDATE public.dim_organizations
SET
  organization_name = COALESCE(NULLIF(public.sanitize_strict_ascii_text(organization_name), ''), 'Organizacao Parceira'),
  organization_normalized = COALESCE(NULLIF(public.sanitize_strict_ascii_key(organization_name), ''), 'organizacao parceira');

-- 1.8 dim_subcategories (consolida eventuais duplicatas e limpa acentos/especiais)
DO $$
DECLARE
  dup RECORD;
BEGIN
  FOR dup IN
    SELECT
      MIN(subcategory_sk) AS keep_sk,
      ARRAY_AGG(subcategory_sk ORDER BY subcategory_sk) AS all_sks
    FROM public.dim_subcategories
    GROUP BY COALESCE(NULLIF(public.sanitize_strict_ascii_key(subcategory_label), ''), 'servico gratuito')
    HAVING COUNT(*) > 1
  LOOP
    UPDATE public.services
    SET subcategory_sk = dup.keep_sk
    WHERE subcategory_sk = ANY(dup.all_sks) AND subcategory_sk <> dup.keep_sk;

    DELETE FROM public.dim_subcategories
    WHERE subcategory_sk = ANY(dup.all_sks) AND subcategory_sk <> dup.keep_sk;
  END LOOP;
END $$;

UPDATE public.dim_subcategories
SET
  subcategory_label = COALESCE(NULLIF(public.sanitize_strict_ascii_text(subcategory_label), ''), 'Servico Gratuito'),
  subcategory_normalized = COALESCE(NULLIF(public.sanitize_strict_ascii_key(subcategory_label), ''), 'servico gratuito');

-- 1.9 dim_voice_intents & dim_voice_keywords & fact_voice_searches
UPDATE public.dim_voice_intents
SET intent_label_normalized = COALESCE(NULLIF(public.sanitize_strict_ascii_key(intent_label_normalized), ''), 'busca por voz');

DO $$
DECLARE
  dup RECORD;
BEGIN
  FOR dup IN
    SELECT
      MIN(keyword_sk) AS keep_sk,
      ARRAY_AGG(keyword_sk ORDER BY keyword_sk) AS all_sks
    FROM public.dim_voice_keywords
    GROUP BY COALESCE(NULLIF(public.sanitize_strict_ascii_key(keyword_normalized), ''), 'apoio')
    HAVING COUNT(*) > 1
  LOOP
    INSERT INTO public.fact_voice_search_keywords (voice_fact_sk, keyword_sk, hit_count)
    SELECT fvk.voice_fact_sk, dup.keep_sk, SUM(fvk.hit_count)::INTEGER
    FROM public.fact_voice_search_keywords fvk
    WHERE fvk.keyword_sk = ANY(dup.all_sks) AND fvk.keyword_sk <> dup.keep_sk
    GROUP BY fvk.voice_fact_sk
    ON CONFLICT (voice_fact_sk, keyword_sk)
    DO UPDATE SET hit_count = public.fact_voice_search_keywords.hit_count + EXCLUDED.hit_count;

    DELETE FROM public.fact_voice_search_keywords
    WHERE keyword_sk = ANY(dup.all_sks) AND keyword_sk <> dup.keep_sk;

    DELETE FROM public.dim_voice_keywords
    WHERE keyword_sk = ANY(dup.all_sks) AND keyword_sk <> dup.keep_sk;
  END LOOP;
END $$;

UPDATE public.dim_voice_keywords
SET keyword_normalized = COALESCE(NULLIF(public.sanitize_strict_ascii_key(keyword_normalized), ''), 'apoio')
WHERE keyword_normalized !~ '^[a-z0-9 ]+$';

DO $$
DECLARE
  dup RECORD;
BEGIN
  FOR dup IN
    SELECT
      MIN(voice_fact_sk) AS keep_sk,
      ARRAY_AGG(voice_fact_sk ORDER BY voice_fact_sk) AS all_sks,
      SUM(search_count)::INTEGER AS total_count
    FROM public.fact_voice_searches
    GROUP BY date_sk, intent_sk, category_sk, region_sk, COALESCE(NULLIF(public.sanitize_strict_ascii_key(utterance_normalized), ''), 'busca por voz')
    HAVING COUNT(*) > 1
  LOOP
    UPDATE public.fact_voice_searches
    SET search_count = dup.total_count
    WHERE voice_fact_sk = dup.keep_sk;

    INSERT INTO public.fact_voice_search_keywords (voice_fact_sk, keyword_sk, hit_count)
    SELECT dup.keep_sk, fvk.keyword_sk, SUM(fvk.hit_count)::INTEGER
    FROM public.fact_voice_search_keywords fvk
    WHERE fvk.voice_fact_sk = ANY(dup.all_sks) AND fvk.voice_fact_sk <> dup.keep_sk
    GROUP BY fvk.keyword_sk
    ON CONFLICT (voice_fact_sk, keyword_sk)
    DO UPDATE SET hit_count = public.fact_voice_search_keywords.hit_count + EXCLUDED.hit_count;

    DELETE FROM public.fact_voice_searches
    WHERE voice_fact_sk = ANY(dup.all_sks) AND voice_fact_sk <> dup.keep_sk;
  END LOOP;
END $$;

UPDATE public.fact_voice_searches
SET utterance_normalized = COALESCE(NULLIF(public.sanitize_strict_ascii_key(utterance_normalized), ''), 'busca por voz')
WHERE utterance_normalized !~ '^[a-z0-9 ]+$';

-- 1.10 tags
DO $$
DECLARE
  dup RECORD;
BEGIN
  FOR dup IN
    SELECT
      MIN(tag_id) AS keep_id,
      ARRAY_AGG(tag_id ORDER BY tag_id) AS all_ids
    FROM public.tags
    GROUP BY COALESCE(NULLIF(public.sanitize_strict_ascii_key(tag_label), ''), 'apoio')
    HAVING COUNT(*) > 1
  LOOP
    INSERT INTO public.service_tags (service_id, tag_id)
    SELECT st.service_id, dup.keep_id
    FROM public.service_tags st
    WHERE st.tag_id = ANY(dup.all_ids) AND st.tag_id <> dup.keep_id
    ON CONFLICT DO NOTHING;

    DELETE FROM public.service_tags
    WHERE tag_id = ANY(dup.all_ids) AND tag_id <> dup.keep_id;

    DELETE FROM public.tags
    WHERE tag_id = ANY(dup.all_ids) AND tag_id <> dup.keep_id;
  END LOOP;
END $$;

UPDATE public.tags
SET
  tag_slug = COALESCE(NULLIF(public.sanitize_strict_ascii_key(tag_label), ''), 'apoio'),
  tag_label = COALESCE(NULLIF(public.sanitize_strict_ascii_text(tag_label), ''), 'Apoio');

-- 1.11 partner_profiles
UPDATE public.partner_profiles
SET organization_name = COALESCE(NULLIF(public.sanitize_strict_ascii_text(organization_name), ''), 'Organizacao Parceira');

-- 1.12 services (converte cep de CHAR(9) com hifen para VARCHAR(8) sem hifen usando USING antes de limpar demais colunas)
DROP VIEW IF EXISTS public.vw_services_normalized;
ALTER TABLE public.services
  ALTER COLUMN cep TYPE VARCHAR(8)
  USING (
    CASE
      WHEN LENGTH(REGEXP_REPLACE(COALESCE(cep, ''), '[^0-9]', '', 'g')) = 8
        THEN REGEXP_REPLACE(cep, '[^0-9]', '', 'g')
      ELSE NULL
    END
  );

UPDATE public.services
SET
  name = COALESCE(NULLIF(public.sanitize_strict_ascii_text(name), ''), 'Servico Publico Gratuito'),
  name_normalized = COALESCE(NULLIF(public.sanitize_strict_ascii_key(name), ''), 'servico publico gratuito'),
  subcategory = COALESCE(NULLIF(public.sanitize_strict_ascii_text(subcategory), ''), 'Atendimento Gratuito'),
  description = COALESCE(NULLIF(public.sanitize_strict_ascii_text(description), ''), 'Atendimento gratuito'),
  city = NULLIF(public.sanitize_strict_ascii_text(REGEXP_REPLACE(COALESCE(city, ''), '[0-9]+', ' ', 'g')), ''),
  neighborhood = NULLIF(public.sanitize_strict_ascii_text(neighborhood), ''),
  address = NULLIF(public.sanitize_strict_ascii_text(address), ''),
  cep = CASE
    WHEN LENGTH(REGEXP_REPLACE(COALESCE(cep, ''), '[^0-9]', '', 'g')) = 8
      THEN REGEXP_REPLACE(cep, '[^0-9]', '', 'g')
    ELSE NULL
  END,
  phone = public.sanitize_strict_digits_space(phone),
  whatsapp = NULLIF(REGEXP_REPLACE(COALESCE(whatsapp, ''), '[^0-9]', '', 'g'), ''),
  website = public.sanitize_strict_ascii_url(website, NULL),
  hours = COALESCE(NULLIF(public.sanitize_strict_ascii_text(hours), ''), 'Consultar atendimento'),
  access_mode = COALESCE(NULLIF(public.sanitize_strict_ascii_text(access_mode), ''), 'Livre Demanda Porta Aberta'),
  free_confirmation = COALESCE(NULLIF(public.sanitize_strict_ascii_text(free_confirmation), ''), '100 por cento gratuito'),
  tags = public.sanitize_strict_ascii_array(tags),
  tips_for_woman = NULLIF(public.sanitize_strict_ascii_text(tips_for_woman), '');

-- Recria vw_services_normalized e mantém compatibilidade de tipo em search_verified_services
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

DROP FUNCTION IF EXISTS public.search_verified_services(TEXT, TEXT, DOUBLE PRECISION, DOUBLE PRECISION, DOUBLE PRECISION);
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
  cep VARCHAR(8),
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

-- 1.13 ngos e ngo_help_items (deduplica antes caso duas ONGs colidam após limpeza)
DELETE FROM public.ngos a
USING public.ngos b
WHERE a.ctid < b.ctid
  AND public.normalize_ngo_name(a.name) = public.normalize_ngo_name(b.name);
UPDATE public.ngos
SET
  name = COALESCE(NULLIF(public.sanitize_strict_ascii_text(name), ''), 'ONG Parceira'),
  name_normalized = COALESCE(NULLIF(public.normalize_ngo_name(name), ''), 'ong parceira'),
  organization = COALESCE(NULLIF(public.sanitize_strict_ascii_text(organization), ''), 'Organizacao Parceira'),
  area_label = COALESCE(NULLIF(public.sanitize_strict_ascii_text(area_label), ''), 'Apoio Gratuito'),
  coverage = COALESCE(NULLIF(public.sanitize_strict_ascii_text(coverage), ''), 'Todo o Brasil'),
  city = NULLIF(public.sanitize_strict_ascii_text(REGEXP_REPLACE(COALESCE(city, ''), '[0-9]+', ' ', 'g')), ''),
  summary = COALESCE(NULLIF(public.sanitize_strict_ascii_text(summary), ''), 'Atendimento gratuito para mulheres'),
  how_they_help = CASE
    WHEN COALESCE(array_length(public.sanitize_strict_ascii_array(how_they_help), 1), 0) > 0
      THEN public.sanitize_strict_ascii_array(how_they_help)
    ELSE ARRAY['Apoio gratuito voltado para mulheres']
  END,
  access_channel = COALESCE(NULLIF(public.sanitize_strict_ascii_text(access_channel), ''), 'Atendimento gratuito online'),
  website_url = public.sanitize_strict_ascii_url(website_url, 'nao informado'),
  privacy_note = COALESCE(NULLIF(public.sanitize_strict_ascii_text(privacy_note), ''), 'Atendimento gratuito sem exposicao publica de dados');

UPDATE public.ngo_help_items
SET
  help_description = COALESCE(NULLIF(public.sanitize_strict_ascii_text(help_description), ''), 'Apoio gratuito para mulheres'),
  help_normalized = COALESCE(NULLIF(public.sanitize_strict_ascii_key(help_description), ''), 'apoio gratuito para mulheres');

-- 1.14 Espelho legado search_demand_stats (se existir da migration 003)
DO $$
BEGIN
  IF TO_REGCLASS('public.search_demand_stats') IS NOT NULL THEN
    UPDATE public.search_demand_stats
    SET
      topic_label = COALESCE(NULLIF(public.sanitize_strict_ascii_text(topic_label), ''), 'Busca Geral'),
      city = COALESCE(NULLIF(public.sanitize_strict_ascii_text(REGEXP_REPLACE(city, '[0-9]+', ' ', 'g')), ''), 'Nacional');
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 2. Triggers BEFORE INSERT OR UPDATE (trg_00_sanitize_*) em TODAS as Tabelas
--    Nome com prefixo 'trg_00_' garante execução ANTES dos triggers de dimensão
-- ----------------------------------------------------------------------------

-- 2.1 Trigger em services
CREATE OR REPLACE FUNCTION public.trg_00_sanitize_services_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cep TEXT := REGEXP_REPLACE(COALESCE(NEW.cep, ''), '[^0-9]', '', 'g');
BEGIN
  NEW.name := COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.name), ''), 'Servico Publico Gratuito');
  NEW.name_normalized := public.sanitize_strict_ascii_key(NEW.name);
  NEW.category := LOWER(REGEXP_REPLACE(COALESCE(NEW.category, 'social'), '[^a-z_]', '', 'g'));
  NEW.subcategory := COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.subcategory), ''), 'Atendimento Gratuito');
  NEW.description := COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.description), ''), 'Atendimento gratuito');
  NEW.state := NULLIF(LEFT(UPPER(REGEXP_REPLACE(COALESCE(NEW.state, ''), '[^A-Za-z]', '', 'g')), 2), '');
  NEW.city := NULLIF(public.sanitize_strict_ascii_text(REGEXP_REPLACE(COALESCE(NEW.city, ''), '[0-9]+', ' ', 'g')), '');
  NEW.neighborhood := NULLIF(public.sanitize_strict_ascii_text(NEW.neighborhood), '');
  NEW.address := NULLIF(public.sanitize_strict_ascii_text(NEW.address), '');
  NEW.cep := CASE WHEN LENGTH(v_cep) = 8 THEN v_cep ELSE NULL END;
  NEW.phone := public.sanitize_strict_digits_space(NEW.phone);
  NEW.whatsapp := NULLIF(REGEXP_REPLACE(COALESCE(NEW.whatsapp, ''), '[^0-9]', '', 'g'), '');
  NEW.website := public.sanitize_strict_ascii_url(NEW.website, NULL);
  NEW.hours := COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.hours), ''), 'Consultar atendimento');
  NEW.access_mode := COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.access_mode), ''), 'Livre Demanda Porta Aberta');
  NEW.free_confirmation := COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.free_confirmation), ''), '100 por cento gratuito');
  NEW.tags := public.sanitize_strict_ascii_array(NEW.tags);
  NEW.tips_for_woman := NULLIF(public.sanitize_strict_ascii_text(NEW.tips_for_woman), '');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_00_sanitize_services ON public.services;
CREATE TRIGGER trg_00_sanitize_services
  BEFORE INSERT OR UPDATE ON public.services
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_00_sanitize_services_fn();

-- 2.2 Trigger em ngos
CREATE OR REPLACE FUNCTION public.trg_00_sanitize_ngos_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_help TEXT[];
BEGIN
  NEW.name := LEFT(COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.name), ''), 'ONG Parceira'), 160);
  NEW.name_normalized := public.normalize_ngo_name(NEW.name);
  NEW.organization := LEFT(COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.organization), ''), NEW.name), 160);
  NEW.area := LOWER(REGEXP_REPLACE(COALESCE(NEW.area, 'acolhimento_protecao'), '[^a-z_]', '', 'g'));
  NEW.area_label := LEFT(COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.area_label), ''), 'Apoio Gratuito'), 80);
  NEW.coverage := LEFT(COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.coverage), ''), 'Todo o Brasil'), 140);
  NEW.state := NULLIF(LEFT(UPPER(REGEXP_REPLACE(COALESCE(NEW.state, ''), '[^A-Za-z]', '', 'g')), 2), '');
  NEW.city := NULLIF(LEFT(public.sanitize_strict_ascii_text(REGEXP_REPLACE(COALESCE(NEW.city, ''), '[0-9]+', ' ', 'g')), 80), '');
  NEW.summary := LEFT(COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.summary), ''), 'Atendimento gratuito para mulheres'), 600);
  v_help := public.sanitize_strict_ascii_array(NEW.how_they_help);
  NEW.how_they_help := CASE WHEN COALESCE(array_length(v_help, 1), 0) > 0 THEN v_help ELSE ARRAY['Apoio gratuito voltado para mulheres'] END;
  NEW.access_channel := LEFT(COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.access_channel), ''), 'Atendimento gratuito online'), 160);
  NEW.website_url := public.sanitize_strict_ascii_url(NEW.website_url, 'nao informado');
  NEW.website_domain_normalized := public.normalize_ngo_domain(NEW.website_url);
  NEW.privacy_note := LEFT(COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.privacy_note), ''), 'Atendimento gratuito sem exposicao publica de dados'), 260);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_00_sanitize_ngos ON public.ngos;
CREATE TRIGGER trg_00_sanitize_ngos
  BEFORE INSERT OR UPDATE ON public.ngos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_00_sanitize_ngos_fn();

-- 2.3 Triggers para dimensões, associativas, fatos de voz e perfis
CREATE OR REPLACE FUNCTION public.trg_00_sanitize_dimensions_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_TABLE_NAME = 'dim_categories' THEN
    NEW.label := COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.label), ''), 'Categoria');
    NEW.description := COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.description), ''), 'Atendimento gratuito');
  ELSIF TG_TABLE_NAME = 'dim_regions' THEN
    NEW.state_code := LEFT(UPPER(REGEXP_REPLACE(COALESCE(NEW.state_code, 'BR'), '[^A-Za-z]', '', 'g')), 2);
    NEW.state_name := COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.state_name), ''), 'Brasil');
    NEW.macro_region := COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.macro_region), ''), 'Nacional');
    NEW.city_name := COALESCE(NULLIF(public.sanitize_strict_ascii_text(REGEXP_REPLACE(NEW.city_name, '[0-9]+', ' ', 'g')), ''), 'Nacional');
    NEW.city_normalized := public.sanitize_strict_ascii_key(NEW.city_name);
  ELSIF TG_TABLE_NAME = 'dim_dates' THEN
    NEW.month_name := COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.month_name), ''), 'Mes');
  ELSIF TG_TABLE_NAME = 'dim_access_channels' THEN
    NEW.channel_label := COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.channel_label), ''), 'Canal');
  ELSIF TG_TABLE_NAME = 'dim_organizations' THEN
    NEW.organization_name := COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.organization_name), ''), 'Organizacao Parceira');
    NEW.organization_normalized := public.sanitize_strict_ascii_key(NEW.organization_name);
  ELSIF TG_TABLE_NAME = 'dim_ngo_areas' THEN
    NEW.area_label := COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.area_label), ''), 'Apoio');
    NEW.area_normalized := public.sanitize_strict_ascii_key(NEW.area_label);
  ELSIF TG_TABLE_NAME = 'dim_subcategories' THEN
    NEW.subcategory_label := COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.subcategory_label), ''), 'Servico Gratuito');
    NEW.subcategory_normalized := public.sanitize_strict_ascii_key(NEW.subcategory_label);
  ELSIF TG_TABLE_NAME = 'dim_access_modes' THEN
    NEW.access_mode_label := COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.access_mode_label), ''), 'Livre Demanda');
  ELSIF TG_TABLE_NAME = 'dim_voice_intents' THEN
    NEW.intent_label_normalized := COALESCE(NULLIF(public.sanitize_strict_ascii_key(NEW.intent_label_normalized), ''), 'busca por voz');
  ELSIF TG_TABLE_NAME = 'dim_voice_keywords' THEN
    NEW.keyword_normalized := COALESCE(NULLIF(public.sanitize_strict_ascii_key(NEW.keyword_normalized), ''), 'apoio');
  ELSIF TG_TABLE_NAME = 'fact_voice_searches' THEN
    NEW.utterance_normalized := COALESCE(NULLIF(public.sanitize_strict_ascii_key(NEW.utterance_normalized), ''), 'busca por voz');
  ELSIF TG_TABLE_NAME = 'tags' THEN
    NEW.tag_label := COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.tag_label), ''), 'Apoio');
    NEW.tag_slug := COALESCE(NULLIF(public.sanitize_strict_ascii_key(NEW.tag_label), ''), 'apoio');
  ELSIF TG_TABLE_NAME = 'ngo_help_items' THEN
    NEW.help_description := COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.help_description), ''), 'Apoio gratuito');
    NEW.help_normalized := COALESCE(NULLIF(public.sanitize_strict_ascii_key(NEW.help_description), ''), 'apoio gratuito');
  ELSIF TG_TABLE_NAME = 'partner_profiles' THEN
    NEW.organization_name := COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.organization_name), ''), 'Organizacao Parceira');
  ELSIF TG_TABLE_NAME = 'search_demand_stats' THEN
    NEW.topic_label := COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.topic_label), ''), 'Busca Geral');
    NEW.city := COALESCE(NULLIF(public.sanitize_strict_ascii_text(NEW.city), ''), 'Nacional');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_00_sanitize_dim_categories ON public.dim_categories;
CREATE TRIGGER trg_00_sanitize_dim_categories BEFORE INSERT OR UPDATE ON public.dim_categories FOR EACH ROW EXECUTE FUNCTION public.trg_00_sanitize_dimensions_fn();

DROP TRIGGER IF EXISTS trg_00_sanitize_dim_regions ON public.dim_regions;
CREATE TRIGGER trg_00_sanitize_dim_regions BEFORE INSERT OR UPDATE ON public.dim_regions FOR EACH ROW EXECUTE FUNCTION public.trg_00_sanitize_dimensions_fn();

DROP TRIGGER IF EXISTS trg_00_sanitize_dim_dates ON public.dim_dates;
CREATE TRIGGER trg_00_sanitize_dim_dates BEFORE INSERT OR UPDATE ON public.dim_dates FOR EACH ROW EXECUTE FUNCTION public.trg_00_sanitize_dimensions_fn();

DROP TRIGGER IF EXISTS trg_00_sanitize_dim_access_channels ON public.dim_access_channels;
CREATE TRIGGER trg_00_sanitize_dim_access_channels BEFORE INSERT OR UPDATE ON public.dim_access_channels FOR EACH ROW EXECUTE FUNCTION public.trg_00_sanitize_dimensions_fn();

DROP TRIGGER IF EXISTS trg_00_sanitize_dim_organizations ON public.dim_organizations;
CREATE TRIGGER trg_00_sanitize_dim_organizations BEFORE INSERT OR UPDATE ON public.dim_organizations FOR EACH ROW EXECUTE FUNCTION public.trg_00_sanitize_dimensions_fn();

DROP TRIGGER IF EXISTS trg_00_sanitize_dim_ngo_areas ON public.dim_ngo_areas;
CREATE TRIGGER trg_00_sanitize_dim_ngo_areas BEFORE INSERT OR UPDATE ON public.dim_ngo_areas FOR EACH ROW EXECUTE FUNCTION public.trg_00_sanitize_dimensions_fn();

DROP TRIGGER IF EXISTS trg_00_sanitize_dim_subcategories ON public.dim_subcategories;
CREATE TRIGGER trg_00_sanitize_dim_subcategories BEFORE INSERT OR UPDATE ON public.dim_subcategories FOR EACH ROW EXECUTE FUNCTION public.trg_00_sanitize_dimensions_fn();

DROP TRIGGER IF EXISTS trg_00_sanitize_dim_access_modes ON public.dim_access_modes;
CREATE TRIGGER trg_00_sanitize_dim_access_modes BEFORE INSERT OR UPDATE ON public.dim_access_modes FOR EACH ROW EXECUTE FUNCTION public.trg_00_sanitize_dimensions_fn();

DROP TRIGGER IF EXISTS trg_00_sanitize_dim_voice_intents ON public.dim_voice_intents;
CREATE TRIGGER trg_00_sanitize_dim_voice_intents BEFORE INSERT OR UPDATE ON public.dim_voice_intents FOR EACH ROW EXECUTE FUNCTION public.trg_00_sanitize_dimensions_fn();

DROP TRIGGER IF EXISTS trg_00_sanitize_dim_voice_keywords ON public.dim_voice_keywords;
CREATE TRIGGER trg_00_sanitize_dim_voice_keywords BEFORE INSERT OR UPDATE ON public.dim_voice_keywords FOR EACH ROW EXECUTE FUNCTION public.trg_00_sanitize_dimensions_fn();

DROP TRIGGER IF EXISTS trg_00_sanitize_fact_voice_searches ON public.fact_voice_searches;
CREATE TRIGGER trg_00_sanitize_fact_voice_searches BEFORE INSERT OR UPDATE ON public.fact_voice_searches FOR EACH ROW EXECUTE FUNCTION public.trg_00_sanitize_dimensions_fn();

DROP TRIGGER IF EXISTS trg_00_sanitize_tags ON public.tags;
CREATE TRIGGER trg_00_sanitize_tags BEFORE INSERT OR UPDATE ON public.tags FOR EACH ROW EXECUTE FUNCTION public.trg_00_sanitize_dimensions_fn();

DROP TRIGGER IF EXISTS trg_00_sanitize_ngo_help_items ON public.ngo_help_items;
CREATE TRIGGER trg_00_sanitize_ngo_help_items BEFORE INSERT OR UPDATE ON public.ngo_help_items FOR EACH ROW EXECUTE FUNCTION public.trg_00_sanitize_dimensions_fn();

DROP TRIGGER IF EXISTS trg_00_sanitize_partner_profiles ON public.partner_profiles;
CREATE TRIGGER trg_00_sanitize_partner_profiles BEFORE INSERT OR UPDATE ON public.partner_profiles FOR EACH ROW EXECUTE FUNCTION public.trg_00_sanitize_dimensions_fn();

DO $$
BEGIN
  IF TO_REGCLASS('public.search_demand_stats') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS trg_00_sanitize_search_demand_stats ON public.search_demand_stats;
    CREATE TRIGGER trg_00_sanitize_search_demand_stats BEFORE INSERT OR UPDATE ON public.search_demand_stats FOR EACH ROW EXECUTE FUNCTION public.trg_00_sanitize_dimensions_fn();
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Atualiza trigger de tags e RPC register_ngo_candidate para gravar ASCII estrito
-- ----------------------------------------------------------------------------
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
      v_tag := public.sanitize_strict_ascii_text(v_tag);
      IF v_tag <> '' THEN
        v_slug := LOWER(v_tag);
        INSERT INTO public.tags (tag_slug, tag_label)
        VALUES (v_slug, v_tag)
        ON CONFLICT (tag_slug) DO UPDATE SET tag_label = EXCLUDED.tag_label
        RETURNING tag_id INTO v_tag_id;

        INSERT INTO public.service_tags (service_id, tag_id)
        VALUES (NEW.id, v_tag_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_ngo_candidate(
  p_name TEXT,
  p_organization TEXT,
  p_area TEXT,
  p_area_label TEXT,
  p_coverage TEXT,
  p_state TEXT DEFAULT NULL,
  p_city TEXT DEFAULT NULL,
  p_summary TEXT DEFAULT '',
  p_how_they_help TEXT[] DEFAULT '{}',
  p_access_channel TEXT DEFAULT 'Atendimento gratuito pelo site',
  p_website_url TEXT DEFAULT '',
  p_privacy_note TEXT DEFAULT 'Atendimento gratuito voltado para mulheres',
  p_related_categories TEXT[] DEFAULT '{}',
  p_is_free_confirmed BOOLEAN DEFAULT FALSE,
  p_source_type TEXT DEFAULT 'partner_form'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT := public.sanitize_strict_ascii_text(p_name);
  v_org TEXT := public.sanitize_strict_ascii_text(p_organization);
  v_area TEXT := LOWER(REGEXP_REPLACE(COALESCE(p_area, 'acolhimento_protecao'), '[^a-z_]', '', 'g'));
  v_area_label TEXT := COALESCE(NULLIF(public.sanitize_strict_ascii_text(p_area_label), ''), 'Apoio Gratuito para Mulheres');
  v_coverage TEXT := public.sanitize_strict_ascii_text(p_coverage);
  v_state TEXT := NULLIF(UPPER(REGEXP_REPLACE(COALESCE(p_state, ''), '[^A-Za-z]', '', 'g')), '');
  v_city TEXT := NULLIF(LEFT(public.sanitize_strict_ascii_text(REGEXP_REPLACE(COALESCE(p_city, ''), '[0-9]+', ' ', 'g')), 80), '');
  v_summary TEXT := public.sanitize_strict_ascii_text(p_summary);
  v_channel TEXT := public.sanitize_strict_ascii_text(p_access_channel);
  v_website TEXT := public.sanitize_strict_ascii_url(p_website_url, '');
  v_privacy TEXT := public.sanitize_strict_ascii_text(p_privacy_note);
  v_source TEXT := CASE WHEN p_source_type = 'osm_discovery' THEN 'osm_discovery' ELSE 'partner_form' END;
  v_name_norm TEXT;
  v_domain_norm TEXT;
  v_existing RECORD;
  v_slug TEXT;
  v_new_id TEXT;
  v_valid_categories TEXT[] := ARRAY[]::TEXT[];
  v_cat TEXT;
  v_help TEXT[] := public.sanitize_strict_ascii_array(p_how_they_help);
  v_combined_check TEXT;
  v_verified BOOLEAN;
BEGIN
  IF NOT COALESCE(p_is_free_confirmed, FALSE) THEN
    RETURN jsonb_build_object(
      'status', 'invalid',
      'message', 'Apenas ONGs e projetos 100 por cento gratuitos podem ser cadastrados na plataforma.'
    );
  END IF;

  IF LENGTH(v_name) < 4 THEN
    RETURN jsonb_build_object(
      'status', 'invalid',
      'message', 'Informe o nome completo da ONG com minimo de 4 caracteres alfanumericos.'
    );
  END IF;

  IF LENGTH(v_summary) < 15 THEN
    RETURN jsonb_build_object(
      'status', 'invalid',
      'message', 'Descreva brevemente como a ONG ajuda mulheres gratuitamente.'
    );
  END IF;

  IF v_source = 'partner_form' AND (v_website IS NULL OR v_website = '') THEN
    RETURN jsonb_build_object(
      'status', 'invalid',
      'message', 'Informe um site oficial valido com https:// ou http:// sem acentos.'
    );
  END IF;

  v_combined_check := LOWER(v_name || ' ' || v_org || ' ' || v_summary || ' ' || v_channel);
  IF v_combined_check ~ '(mensalidade|plano de saude|convenio|particular|privado|privada|unimed|hapvida|amil|bradesco saude|sulamerica|taxa de adesao|consulta paga)' THEN
    RETURN jsonb_build_object(
      'status', 'invalid',
      'message', 'Servicos pagos, particulares ou planos de saude nao sao permitidos nesta plataforma.'
    );
  END IF;

  IF v_area NOT IN ('saude_parto', 'psicologico_juridico', 'acolhimento_protecao', 'cursos_renda') THEN
    v_area := 'acolhimento_protecao';
  END IF;

  IF v_state IS NOT NULL AND LENGTH(v_state) <> 2 THEN
    v_state := NULL;
  END IF;

  v_name_norm := public.normalize_ngo_name(v_name);
  v_domain_norm := public.normalize_ngo_domain(v_website);

  SELECT id, name INTO v_existing
  FROM public.ngos
  WHERE name_normalized = v_name_norm
     OR (
       v_domain_norm IS NOT NULL
       AND website_domain_normalized = v_domain_norm
       AND (
         state IS NULL
         OR v_state IS NULL
         OR (
           state = v_state
           AND public.sanitize_strict_ascii_key(COALESCE(city, 'todo o estado')) = public.sanitize_strict_ascii_key(COALESCE(v_city, 'todo o estado'))
         )
       )
     )
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'duplicate',
      'ngo_id', v_existing.id,
      'existing_name', v_existing.name,
      'message', format('Esta ONG ja esta cadastrada no banco de dados (%s).', v_existing.name)
    );
  END IF;

  IF p_related_categories IS NOT NULL THEN
    FOREACH v_cat IN ARRAY p_related_categories LOOP
      v_cat := LOWER(REGEXP_REPLACE(COALESCE(v_cat, ''), '[^a-z_]', '', 'g'));
      IF v_cat IN ('juridico', 'psicologico', 'saude', 'cursos', 'emergencia')
         AND NOT (v_cat = ANY(v_valid_categories)) THEN
        v_valid_categories := array_append(v_valid_categories, v_cat);
      END IF;
    END LOOP;
  END IF;

  IF array_length(v_valid_categories, 1) IS NULL THEN
    v_valid_categories := ARRAY['psicologico', 'juridico', 'emergencia'];
  END IF;

  IF array_length(v_help, 1) IS NULL THEN
    v_help := ARRAY[LEFT(v_summary, 180)];
  END IF;

  v_slug := REGEXP_REPLACE(v_name_norm, '[^a-z0-9]+', '-', 'g');
  v_slug := TRIM(BOTH '-' FROM LEFT(v_slug, 48));
  v_new_id := 'ngo-' || COALESCE(NULLIF(v_slug, ''), 'parceira') || '-' || SUBSTRING(md5(v_name_norm || COALESCE(v_domain_norm, '') || clock_timestamp()::TEXT) FROM 1 FOR 6);
  v_verified := (v_source = 'partner_form');

  INSERT INTO public.ngos (
    id, name, organization, area, area_label, coverage, state, city,
    summary, how_they_help, access_channel, website_url, privacy_note,
    related_categories, featured, is_verified, is_active, source_type
  )
  VALUES (
    v_new_id,
    LEFT(v_name, 160),
    LEFT(COALESCE(NULLIF(v_org, ''), v_name), 160),
    v_area,
    LEFT(v_area_label, 80),
    LEFT(COALESCE(NULLIF(v_coverage, ''), CASE WHEN v_state IS NOT NULL THEN COALESCE(v_city || ' ', '') || v_state ELSE 'Brasil' END), 140),
    v_state,
    v_city,
    LEFT(v_summary, 600),
    v_help,
    LEFT(COALESCE(NULLIF(v_channel, ''), 'Atendimento gratuito pelo site oficial'), 160),
    COALESCE(NULLIF(v_website, ''), 'nao informado'),
    LEFT(COALESCE(NULLIF(v_privacy, ''), 'Atendimento gratuito e sigiloso voltado para mulheres'), 260),
    v_valid_categories,
    FALSE,
    v_verified,
    TRUE,
    v_source
  );

  RETURN jsonb_build_object(
    'status', 'inserted',
    'ngo_id', v_new_id,
    'is_verified', v_verified,
    'message', CASE
      WHEN v_verified THEN 'ONG cadastrada no banco de dados sem acentos ou caracteres especiais.'
      ELSE 'ONG registrada no banco de dados para validacao.'
    END
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'status', 'duplicate',
      'message', 'Esta ONG ja possui cadastro ativo no banco de dados.'
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. Constraints CHECK Estritas em TODAS as Tabelas (Impossibilita Acentos e Especiais)
-- ----------------------------------------------------------------------------

-- dim_categories
ALTER TABLE public.dim_categories
  DROP CONSTRAINT IF EXISTS chk_dim_cat_label_ascii,
  DROP CONSTRAINT IF EXISTS chk_dim_cat_desc_ascii;
ALTER TABLE public.dim_categories
  ADD CONSTRAINT chk_dim_cat_label_ascii CHECK (label ~ '^[A-Za-z0-9 ]+$'),
  ADD CONSTRAINT chk_dim_cat_desc_ascii CHECK (description ~ '^[A-Za-z0-9 ]+$');

-- dim_regions
ALTER TABLE public.dim_regions
  ADD CONSTRAINT chk_dim_regions_state_code_ascii CHECK (state_code ~ '^[A-Z]{2}$'),
  ADD CONSTRAINT chk_dim_regions_state_name_ascii CHECK (state_name ~ '^[A-Za-z ]+$'),
  ADD CONSTRAINT chk_dim_regions_macro_ascii CHECK (macro_region IN ('Norte', 'Nordeste', 'Centro Oeste', 'Sudeste', 'Sul', 'Nacional')),
  ADD CONSTRAINT chk_dim_regions_city_name_ascii CHECK (city_name ~ '^[A-Za-z0-9 ]+$'),
  ADD CONSTRAINT chk_dim_regions_city_norm_ascii CHECK (city_normalized ~ '^[a-z0-9 ]+$');

-- dim_dates
ALTER TABLE public.dim_dates
  DROP CONSTRAINT IF EXISTS chk_dim_dates_month_ascii;
ALTER TABLE public.dim_dates
  ADD CONSTRAINT chk_dim_dates_month_ascii CHECK (month_name ~ '^[A-Za-z]+$');

-- dim_access_channels
ALTER TABLE public.dim_access_channels
  DROP CONSTRAINT IF EXISTS chk_dim_channels_label_ascii;
ALTER TABLE public.dim_access_channels
  ADD CONSTRAINT chk_dim_channels_label_ascii CHECK (channel_label ~ '^[A-Za-z0-9 ]+$');

-- dim_organizations
ALTER TABLE public.dim_organizations
  DROP CONSTRAINT IF EXISTS chk_dim_orgs_norm_ascii,
  DROP CONSTRAINT IF EXISTS chk_dim_orgs_name_ascii;
ALTER TABLE public.dim_organizations
  ADD CONSTRAINT chk_dim_orgs_norm_ascii CHECK (organization_normalized ~ '^[a-z0-9 ]+$'),
  ADD CONSTRAINT chk_dim_orgs_name_ascii CHECK (organization_name ~ '^[A-Za-z0-9 ]+$');

-- dim_ngo_areas
ALTER TABLE public.dim_ngo_areas
  DROP CONSTRAINT IF EXISTS chk_dim_ngo_areas_label_ascii,
  DROP CONSTRAINT IF EXISTS chk_dim_ngo_areas_norm_ascii;
ALTER TABLE public.dim_ngo_areas
  ADD CONSTRAINT chk_dim_ngo_areas_label_ascii CHECK (area_label ~ '^[A-Za-z0-9 ]+$'),
  ADD CONSTRAINT chk_dim_ngo_areas_norm_ascii CHECK (area_normalized ~ '^[a-z0-9 ]+$');

-- dim_subcategories
ALTER TABLE public.dim_subcategories
  DROP CONSTRAINT IF EXISTS chk_dim_subcat_norm_ascii,
  DROP CONSTRAINT IF EXISTS chk_dim_subcat_label_ascii;
ALTER TABLE public.dim_subcategories
  ADD CONSTRAINT chk_dim_subcat_norm_ascii CHECK (subcategory_normalized ~ '^[a-z0-9 ]+$'),
  ADD CONSTRAINT chk_dim_subcat_label_ascii CHECK (subcategory_label ~ '^[A-Za-z0-9 ]+$');

-- dim_access_modes
ALTER TABLE public.dim_access_modes
  DROP CONSTRAINT IF EXISTS chk_dim_access_modes_label_ascii;
ALTER TABLE public.dim_access_modes
  ADD CONSTRAINT chk_dim_access_modes_label_ascii CHECK (access_mode_label ~ '^[A-Za-z0-9 ]+$');

-- dim_voice_intents & dim_voice_keywords & fact_voice_searches
ALTER TABLE public.dim_voice_intents
  DROP CONSTRAINT IF EXISTS chk_dim_voice_intents_ascii;
ALTER TABLE public.dim_voice_intents
  ADD CONSTRAINT chk_dim_voice_intents_ascii CHECK (intent_label_normalized ~ '^[a-z0-9 ]+$');

ALTER TABLE public.dim_voice_keywords
  DROP CONSTRAINT IF EXISTS chk_dim_voice_kw_ascii;
ALTER TABLE public.dim_voice_keywords
  ADD CONSTRAINT chk_dim_voice_kw_ascii CHECK (keyword_normalized ~ '^[a-z0-9 ]+$');

ALTER TABLE public.fact_voice_searches
  DROP CONSTRAINT IF EXISTS chk_fact_voice_utt_ascii;
ALTER TABLE public.fact_voice_searches
  ADD CONSTRAINT chk_fact_voice_utt_ascii CHECK (utterance_normalized ~ '^[a-z0-9 ]+$');

-- tags
ALTER TABLE public.tags
  DROP CONSTRAINT IF EXISTS chk_tags_slug_ascii,
  DROP CONSTRAINT IF EXISTS chk_tags_label_ascii;
ALTER TABLE public.tags
  ADD CONSTRAINT chk_tags_slug_ascii CHECK (tag_slug ~ '^[a-z0-9 ]+$'),
  ADD CONSTRAINT chk_tags_label_ascii CHECK (tag_label ~ '^[A-Za-z0-9 ]+$');

-- partner_profiles
ALTER TABLE public.partner_profiles
  DROP CONSTRAINT IF EXISTS chk_partner_org_ascii;
ALTER TABLE public.partner_profiles
  ADD CONSTRAINT chk_partner_org_ascii CHECK (organization_name ~ '^[A-Za-z0-9 ]+$');

-- ngo_help_items
ALTER TABLE public.ngo_help_items
  DROP CONSTRAINT IF EXISTS chk_ngo_help_desc_ascii,
  DROP CONSTRAINT IF EXISTS chk_ngo_help_norm_ascii;
ALTER TABLE public.ngo_help_items
  ADD CONSTRAINT chk_ngo_help_desc_ascii CHECK (help_description ~ '^[A-Za-z0-9 ]+$'),
  ADD CONSTRAINT chk_ngo_help_norm_ascii CHECK (help_normalized ~ '^[a-z0-9 ]+$');

-- services
ALTER TABLE public.services
  DROP CONSTRAINT IF EXISTS chk_services_name_ascii,
  DROP CONSTRAINT IF EXISTS chk_services_name_norm_ascii,
  DROP CONSTRAINT IF EXISTS chk_services_subcat_ascii,
  DROP CONSTRAINT IF EXISTS chk_services_desc_ascii,
  DROP CONSTRAINT IF EXISTS chk_services_city_ascii,
  DROP CONSTRAINT IF EXISTS chk_services_neigh_ascii,
  DROP CONSTRAINT IF EXISTS chk_services_addr_ascii,
  DROP CONSTRAINT IF EXISTS chk_services_cep_digits,
  DROP CONSTRAINT IF EXISTS chk_services_phone_ascii,
  DROP CONSTRAINT IF EXISTS chk_services_wa_digits,
  DROP CONSTRAINT IF EXISTS chk_services_website_ascii,
  DROP CONSTRAINT IF EXISTS chk_services_hours_ascii,
  DROP CONSTRAINT IF EXISTS chk_services_mode_ascii,
  DROP CONSTRAINT IF EXISTS chk_services_free_ascii,
  DROP CONSTRAINT IF EXISTS chk_services_tags_ascii,
  DROP CONSTRAINT IF EXISTS chk_services_tips_ascii;

ALTER TABLE public.services
  ADD CONSTRAINT chk_services_name_ascii CHECK (name ~ '^[A-Za-z0-9 ]+$'),
  ADD CONSTRAINT chk_services_name_norm_ascii CHECK (name_normalized IS NULL OR name_normalized ~ '^[a-z0-9 ]+$'),
  ADD CONSTRAINT chk_services_subcat_ascii CHECK (subcategory ~ '^[A-Za-z0-9 ]+$'),
  ADD CONSTRAINT chk_services_desc_ascii CHECK (description ~ '^[A-Za-z0-9 ]+$'),
  ADD CONSTRAINT chk_services_city_ascii CHECK (city IS NULL OR city ~ '^[A-Za-z0-9 ]+$'),
  ADD CONSTRAINT chk_services_neigh_ascii CHECK (neighborhood IS NULL OR neighborhood ~ '^[A-Za-z0-9 ]+$'),
  ADD CONSTRAINT chk_services_addr_ascii CHECK (address IS NULL OR address ~ '^[A-Za-z0-9 ]+$'),
  ADD CONSTRAINT chk_services_cep_digits CHECK (cep IS NULL OR cep ~ '^[0-9]{8}$'),
  ADD CONSTRAINT chk_services_phone_ascii CHECK (phone IS NULL OR phone ~ '^[0-9 ]+$'),
  ADD CONSTRAINT chk_services_wa_digits CHECK (whatsapp IS NULL OR whatsapp ~ '^[0-9]+$'),
  ADD CONSTRAINT chk_services_website_ascii CHECK (website IS NULL OR website ~ '^https?://[A-Za-z0-9._:/?=&-]+$'),
  ADD CONSTRAINT chk_services_hours_ascii CHECK (hours ~ '^[A-Za-z0-9 ]+$'),
  ADD CONSTRAINT chk_services_mode_ascii CHECK (access_mode ~ '^[A-Za-z0-9 ]+$'),
  ADD CONSTRAINT chk_services_free_ascii CHECK (free_confirmation ~ '^[A-Za-z0-9 ]+$'),
  ADD CONSTRAINT chk_services_tags_ascii CHECK (public.is_strict_ascii_array(tags)),
  ADD CONSTRAINT chk_services_tips_ascii CHECK (tips_for_woman IS NULL OR tips_for_woman ~ '^[A-Za-z0-9 ]+$');

-- ngos
ALTER TABLE public.ngos
  DROP CONSTRAINT IF EXISTS chk_ngos_name_ascii,
  DROP CONSTRAINT IF EXISTS chk_ngos_name_norm_ascii,
  DROP CONSTRAINT IF EXISTS chk_ngos_org_ascii,
  DROP CONSTRAINT IF EXISTS chk_ngos_area_label_ascii,
  DROP CONSTRAINT IF EXISTS chk_ngos_coverage_ascii,
  DROP CONSTRAINT IF EXISTS chk_ngos_city_ascii,
  DROP CONSTRAINT IF EXISTS chk_ngos_summary_ascii,
  DROP CONSTRAINT IF EXISTS chk_ngos_help_ascii,
  DROP CONSTRAINT IF EXISTS chk_ngos_channel_ascii,
  DROP CONSTRAINT IF EXISTS chk_ngos_website_ascii,
  DROP CONSTRAINT IF EXISTS chk_ngos_relcat_ascii,
  DROP CONSTRAINT IF EXISTS chk_ngos_privacy_ascii;

ALTER TABLE public.ngos
  ADD CONSTRAINT chk_ngos_name_ascii CHECK (name ~ '^[A-Za-z0-9 ]+$'),
  ADD CONSTRAINT chk_ngos_name_norm_ascii CHECK (name_normalized IS NULL OR name_normalized ~ '^[a-z0-9 ]+$'),
  ADD CONSTRAINT chk_ngos_org_ascii CHECK (organization ~ '^[A-Za-z0-9 ]+$'),
  ADD CONSTRAINT chk_ngos_area_label_ascii CHECK (area_label ~ '^[A-Za-z0-9 ]+$'),
  ADD CONSTRAINT chk_ngos_coverage_ascii CHECK (coverage ~ '^[A-Za-z0-9 ]+$'),
  ADD CONSTRAINT chk_ngos_city_ascii CHECK (city IS NULL OR city ~ '^[A-Za-z0-9 ]+$'),
  ADD CONSTRAINT chk_ngos_summary_ascii CHECK (summary ~ '^[A-Za-z0-9 ]+$'),
  ADD CONSTRAINT chk_ngos_help_ascii CHECK (public.is_strict_ascii_array(how_they_help)),
  ADD CONSTRAINT chk_ngos_channel_ascii CHECK (access_channel ~ '^[A-Za-z0-9 ]+$'),
  ADD CONSTRAINT chk_ngos_website_ascii CHECK (website_url = 'nao informado' OR website_url ~ '^https?://[A-Za-z0-9._:/?=&-]+$'),
  ADD CONSTRAINT chk_ngos_relcat_ascii CHECK (public.is_strict_key_array(related_categories)),
  ADD CONSTRAINT chk_ngos_privacy_ascii CHECK (privacy_note ~ '^[A-Za-z0-9 ]+$');

-- search_demand_stats (se existir da migration 003)
DO $$
BEGIN
  IF TO_REGCLASS('public.search_demand_stats') IS NOT NULL THEN
    ALTER TABLE public.search_demand_stats
      DROP CONSTRAINT IF EXISTS chk_search_demand_topic_ascii,
      DROP CONSTRAINT IF EXISTS chk_search_demand_city_ascii;
    ALTER TABLE public.search_demand_stats
      ADD CONSTRAINT chk_search_demand_topic_ascii CHECK (topic_label ~ '^[A-Za-z0-9 ]+$'),
      ADD CONSTRAINT chk_search_demand_city_ascii CHECK (city ~ '^[A-Za-z0-9 ]+$');
  END IF;
END $$;
