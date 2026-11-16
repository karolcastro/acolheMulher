-- ============================================================================
-- AcolheMulher — Estatísticas Anônimas e Agregadas de Assuntos e Regiões
-- ============================================================================
-- Princípios de Privacidade (Zero-PII):
-- 1. Armazena APENAS contadores diários agregados por (data, assunto, UF, cidade).
-- 2. NUNCA grava CEP completo, endereço, bairro, IP, voz, horário individual
--    ou qualquer identificador da mulher que realizou a busca.
-- 3. Escrita direta (INSERT/UPDATE/DELETE) bloqueada via RLS para 'anon';
--    incremento feito exclusivamente via função RPC validada (SECURITY DEFINER).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.search_demand_stats (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  demand_date DATE NOT NULL DEFAULT CURRENT_DATE,
  topic_key TEXT NOT NULL CHECK (
    topic_key IN (
      'emergencia',
      'psicologico',
      'juridico',
      'saude',
      'cursos',
      'ongs_apoio',
      'geral'
    )
  ),
  topic_label TEXT NOT NULL,
  state CHAR(2) NOT NULL DEFAULT 'BR',
  city TEXT NOT NULL DEFAULT 'Nacional',
  search_count INTEGER NOT NULL DEFAULT 1 CHECK (search_count > 0),
  CONSTRAINT uq_search_demand_daily UNIQUE (demand_date, topic_key, state, city)
);

CREATE INDEX IF NOT EXISTS idx_search_demand_recent
  ON public.search_demand_stats (demand_date DESC, search_count DESC);

CREATE INDEX IF NOT EXISTS idx_search_demand_region
  ON public.search_demand_stats (state, city, demand_date DESC);

ALTER TABLE public.search_demand_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_demand_stats FORCE ROW LEVEL SECURITY;

-- Leitura pública apenas dos totais agregados diários (zero dados pessoais)
DROP POLICY IF EXISTS "search_demand_public_read" ON public.search_demand_stats;
CREATE POLICY "search_demand_public_read"
  ON public.search_demand_stats
  FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- Função RPC segura para registrar 1 busca agregada sem expor texto livre ou CEP
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
DECLARE
  v_topic_key TEXT;
  v_topic_label TEXT;
  v_state CHAR(2);
  v_city TEXT;
BEGIN
  v_topic_key := LOWER(TRIM(COALESCE(p_topic_key, 'geral')));

  CASE v_topic_key
    WHEN 'emergencia' THEN v_topic_label := 'Proteção 24h e Emergência';
    WHEN 'psicologico' THEN v_topic_label := 'Apoio Psicológico';
    WHEN 'juridico' THEN v_topic_label := 'Advogada Gratuita e Direitos';
    WHEN 'saude' THEN v_topic_label := 'Saúde, Exames e Parto Humanizado';
    WHEN 'cursos' THEN v_topic_label := 'Cursos Gratuitos e Renda';
    WHEN 'ongs_apoio' THEN v_topic_label := 'ONGs que Ajudam';
    ELSE
      v_topic_key := 'geral';
      v_topic_label := 'Busca Geral por Região';
  END CASE;

  -- Mantém apenas 2 letras maiúsculas de UF (ou 'BR' se nacional/não informada)
  v_state := UPPER(REGEXP_REPLACE(COALESCE(p_state, ''), '[^A-Za-z]', '', 'g'));
  IF LENGTH(v_state) <> 2 THEN
    v_state := 'BR';
  END IF;

  -- Remove qualquer dígito/CEP do nome da cidade para garantir anonimato absoluto
  v_city := LEFT(TRIM(REGEXP_REPLACE(COALESCE(p_city, ''), '[0-9]+', '', 'g')), 80);
  IF v_city = '' THEN
    IF v_state = 'BR' THEN
      v_city := 'Nacional';
    ELSE
      v_city := 'Todo o estado';
    END IF;
  END IF;

  INSERT INTO public.search_demand_stats (
    demand_date,
    topic_key,
    topic_label,
    state,
    city,
    search_count
  )
  VALUES (
    CURRENT_DATE,
    v_topic_key,
    v_topic_label,
    v_state,
    v_city,
    1
  )
  ON CONFLICT (demand_date, topic_key, state, city)
  DO UPDATE SET
    search_count = public.search_demand_stats.search_count + 1,
    topic_label = EXCLUDED.topic_label;
END;
$$;

REVOKE ALL ON FUNCTION public.record_anonymous_search_demand(TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_anonymous_search_demand(TEXT, TEXT, TEXT) TO anon, authenticated;

-- Ativa Realtime de forma idempotente caso queira acompanhar atualizações ao vivo
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'search_demand_stats'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.search_demand_stats;
  END IF;
END $$;
