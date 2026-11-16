-- ============================================================================
-- AcolheMulher — Ativar Supabase Realtime para ONGs e Serviços em Tempo Real
-- ============================================================================
-- Execute este script no SQL Editor do Supabase caso já tenha executado o
-- arquivo 001_schema_rls.sql anteriormente.
-- Ele adiciona as tabelas públicas verificadas à publicação 'supabase_realtime'
-- de forma idempotente (não gera erro se já estiverem adicionadas).
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'services'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.services;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'ngos'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ngos;
  END IF;
END $$;
