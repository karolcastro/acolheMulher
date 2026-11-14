-- ============================================================================
-- AcolheMulher — Schema PostgreSQL + Segurança RLS (Row Level Security)
-- ============================================================================
-- Princípios aplicados:
-- 1. Zero-PII: Nenhuma tabela armazena CEP buscado, IP, localização ou voz das usuárias.
-- 2. RLS Obrigatório (ENABLE + FORCE): Leitura pública apenas para registros ativos
--    e verificados; escrita bloqueada para o público anônimo ('anon').
-- 3. Auth restrito a Parceiras/ONGs: Mulheres buscando ajuda nunca precisam de login.
-- ============================================================================

-- Extensão para UUIDs se necessário
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. Perfis de Parceiras e Administradoras (ONGs autorizadas a manter o catálogo)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.partner_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'verified_ngo' CHECK (role IN ('admin', 'verified_ngo')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.partner_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_profiles FORCE ROW LEVEL SECURITY;

-- Somente a própria usuária autenticada vê seu perfil (zero acesso público)
DROP POLICY IF EXISTS "partner_profiles_select_own" ON public.partner_profiles;
CREATE POLICY "partner_profiles_select_own"
  ON public.partner_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- 2. Catálogo de Serviços Públicos, Casas de Parto, ONGs de Exames e Cursos
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.services (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('emergencia', 'juridico', 'psicologico', 'saude', 'cursos', 'social')),
  subcategory TEXT NOT NULL,
  description TEXT NOT NULL,
  is_national_online BOOLEAN NOT NULL DEFAULT FALSE,
  state CHAR(2),
  city TEXT,
  neighborhood TEXT,
  address TEXT,
  phone TEXT,
  whatsapp TEXT,
  website TEXT,
  hours TEXT NOT NULL,
  access_mode TEXT NOT NULL,
  requires_registration BOOLEAN NOT NULL DEFAULT FALSE,
  free_confirmation TEXT NOT NULL,
  tags TEXT[] NOT NULL DEFAULT '{}',
  tips_for_woman TEXT,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_services_category_state ON public.services (category, state) WHERE is_active = TRUE AND is_verified = TRUE;

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services FORCE ROW LEVEL SECURITY;

-- Leitura pública (anon + authenticated) SOMENTE para serviços verificados, ativos e sem cadastro obrigatório
DROP POLICY IF EXISTS "services_public_read_verified" ON public.services;
CREATE POLICY "services_public_read_verified"
  ON public.services
  FOR SELECT
  TO anon, authenticated
  USING (
    is_active = TRUE
    AND is_verified = TRUE
    AND requires_registration = FALSE
  );

-- Inserção permitida somente para ONGs/admins ativos no partner_profiles
DROP POLICY IF EXISTS "services_partner_insert" ON public.services;
CREATE POLICY "services_partner_insert"
  ON public.services
  FOR INSERT
  TO authenticated
  WITH CHECK (
    owner_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.partner_profiles p
      WHERE p.id = auth.uid() AND p.is_active = TRUE
    )
  );

-- Atualização permitida para a ONG dona do registro ou admin ativa
DROP POLICY IF EXISTS "services_partner_update" ON public.services;
CREATE POLICY "services_partner_update"
  ON public.services
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_profiles p
      WHERE p.id = auth.uid() AND p.is_active = TRUE
        AND (p.role = 'admin' OR services.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partner_profiles p
      WHERE p.id = auth.uid() AND p.is_active = TRUE
        AND (p.role = 'admin' OR services.owner_id = auth.uid())
    )
  );

-- Exclusão permitida somente para admins ativas
DROP POLICY IF EXISTS "services_admin_delete" ON public.services;
CREATE POLICY "services_admin_delete"
  ON public.services
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_profiles p
      WHERE p.id = auth.uid() AND p.is_active = TRUE AND p.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- 3. Catálogo de ONGs e Projetos Sociais de Apoio Gratuito
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ngos (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  organization TEXT NOT NULL,
  area TEXT NOT NULL CHECK (area IN ('saude_parto', 'psicologico_juridico', 'acolhimento_protecao', 'cursos_renda')),
  area_label TEXT NOT NULL,
  coverage TEXT NOT NULL,
  summary TEXT NOT NULL,
  how_they_help TEXT[] NOT NULL DEFAULT '{}',
  access_channel TEXT NOT NULL,
  website_url TEXT NOT NULL,
  related_categories TEXT[] NOT NULL DEFAULT '{}',
  featured BOOLEAN NOT NULL DEFAULT FALSE,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.ngos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ngos FORCE ROW LEVEL SECURITY;

-- Leitura pública apenas de ONGs ativas e verificadas
DROP POLICY IF EXISTS "ngos_public_read_verified" ON public.ngos;
CREATE POLICY "ngos_public_read_verified"
  ON public.ngos
  FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE AND is_verified = TRUE);

-- Escrita restrita a parceiras/admins verificadas
DROP POLICY IF EXISTS "ngos_partner_write" ON public.ngos;
CREATE POLICY "ngos_partner_write"
  ON public.ngos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.partner_profiles p
      WHERE p.id = auth.uid() AND p.is_active = TRUE
        AND (p.role = 'admin' OR ngos.owner_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.partner_profiles p
      WHERE p.id = auth.uid() AND p.is_active = TRUE
        AND (p.role = 'admin' OR ngos.owner_id = auth.uid())
    )
  );

-- ----------------------------------------------------------------------------
-- 4. Seed inicial com serviços reais, Casas de Parto Humanizado e ONGs verificadas
-- ----------------------------------------------------------------------------
INSERT INTO public.services (
  id, name, category, subcategory, description, is_national_online, state, city, neighborhood,
  address, phone, whatsapp, website, hours, access_mode, requires_registration,
  free_confirmation, tags, is_verified, is_active
) VALUES
  ('ligue-180', 'Central de Atendimento à Mulher — Ligue 180', 'emergencia', 'Plantão Nacional de Acolhimento e Denúncia',
   'Escuta qualificada, orientação jurídica e encaminhamento para a rede local 24h.', TRUE, NULL, NULL, NULL,
   NULL, '180', '556196100180', 'https://www.gov.br/mulheres/pt-br/central-de-atendimento-a-mulher-ligue-180',
   '24 horas por dia, 7 dias por semana', 'Plantão 24h', FALSE,
   'Ligação 100% gratuita, funciona mesmo sem créditos.', ARRAY['Emergência', 'Denúncia', 'WhatsApp Oficial'], TRUE, TRUE),

  ('policia-190', 'Polícia Militar — Emergência 190', 'emergencia', 'Socorro Imediato',
   'Atendimento imediato em risco iminente ou descumprimento de Medida Protetiva.', TRUE, NULL, NULL, NULL,
   NULL, '190', NULL, NULL, '24 horas ininterruptas', 'Plantão 24h', FALSE,
   'Chamada pública gratuita.', ARRAY['Emergência', 'Perigo Iminente'], TRUE, TRUE),

  ('americas-amigas-exames', 'ONG Américas Amigas — Mamografias e Exames Gratuitos', 'saude', 'ONG · Exames Gratuitos de Mama',
   'ONG que custeia gratuitamente mamografias, ultrassons de mama e biópsias para mulheres de baixa renda.', TRUE, NULL, NULL, NULL,
   NULL, NULL, NULL, 'https://americasamigas.org.br', 'Solicitação online', 'Online Imediato', FALSE,
   '100% gratuito.', ARRAY['Mamografia Gratuita', 'ONG', 'Exames'], TRUE, TRUE),

  ('sesc-saude-mulher', 'Sesc Saúde da Mulher — Carretas de Exames Gratuitos', 'saude', 'Unidade Móvel · Mamografia e Papanicolau',
   'Carretas móveis que realizam gratuitamente exames de mamografia e preventivo do colo do útero.', TRUE, NULL, NULL, NULL,
   NULL, NULL, NULL, 'https://www.sesc.com.br/atuacoes/saude/sesc-saude-mulher/', 'Calendário municipal', 'Livre Demanda (Porta Aberta)', FALSE,
   '100% gratuito.', ARRAY['Carreta de Exames', 'Mamografia', 'Papanicolau'], TRUE, TRUE),

  ('sp-casa-angela', 'Casa Angela — Centro de Parto Humanizado (ONG Monte Azul)', 'saude', 'ONG · Casa de Parto Humanizado Gratuito',
   'Organização sem fins lucrativos referência em parto humanizado gratuito, pré-natal e pós-parto.', FALSE, 'SP', 'São Paulo', 'Jardim Monte Azul',
   'Rua Dr. Luís da Fonseca Galvão, 248 - Jardim Monte Azul, São Paulo - SP', '(11) 5852-5332', NULL, 'https://casaangela.org.br',
   'Plantão 24h para partos', 'Livre Demanda (Porta Aberta)', FALSE,
   '100% gratuito via parceria ONG + SUS.', ARRAY['Parto Humanizado', 'ONG', 'Gratuito'], TRUE, TRUE),

  ('rj-casa-parto-david-capistrano', 'Casa de Parto David Capistrano Filho', 'saude', 'Casa de Parto Humanizado Gratuito',
   'Centro de parto normal humanizado em Realengo com pré-natal e pós-parto gratuitos.', FALSE, 'RJ', 'Rio de Janeiro', 'Realengo',
   'Av. Pontalina, s/n - Realengo, Rio de Janeiro - RJ', '(21) 3331-1899', NULL, NULL,
   '24 horas para partos', 'Livre Demanda (Porta Aberta)', FALSE,
   '100% gratuito.', ARRAY['Parto Humanizado', 'Realengo'], TRUE, TRUE),

  ('ba-cpn-mansao-caminho', 'Centro de Parto Normal Marieta de Souza Pereira · Mansão do Caminho', 'saude', 'Instituição Social · Parto Humanizado Gratuito',
   'Centro de parto humanizado mantido pela obra social Mansão do Caminho gratuitamente.', FALSE, 'BA', 'Salvador', 'Pau da Lima',
   'Rua Jayme Vieira Lima, 104 - Pau da Lima, Salvador - BA', '(71) 3393-1910', NULL, NULL,
   '24 horas', 'Livre Demanda (Porta Aberta)', FALSE,
   '100% gratuito.', ARRAY['Parto Humanizado', 'Salvador'], TRUE, TRUE),

  ('mg-hospital-sofia-feldman', 'Hospital Sofia Feldman — Casa de Parto e Saúde da Mulher', 'saude', 'Instituição Filantrópica · Parto Humanizado Gratuito',
   'Instituição filantrópica referência nacional em parto humanizado 100% gratuito com doulas.', FALSE, 'MG', 'Belo Horizonte', 'Tupi',
   'Rua Antônio Bandeira, 1060 - Tupi, Belo Horizonte - MG', '(31) 3408-2200', NULL, NULL,
   '24 horas', 'Livre Demanda (Porta Aberta)', FALSE,
   '100% gratuito.', ARRAY['Parto Humanizado', 'Belo Horizonte'], TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.ngos (
  id, name, organization, area, area_label, coverage, summary, how_they_help,
  access_channel, website_url, related_categories, featured, is_verified, is_active
) VALUES
  ('ong-americas-amigas', 'ONG Américas Amigas', 'Associação Américas Amigas', 'saude_parto',
   'Saúde & Exames Gratuitos', 'Todo o Brasil',
   'Custeia exames gratuitos de mamografia, ultrassom de mama e biópsia para mulheres de baixa renda.',
   ARRAY['Mamografia gratuita em clínicas parceiras', 'Ultrassom de mama e biópsias sem custo'],
   'Cadastro no site oficial', 'https://americasamigas.org.br', ARRAY['saude'], TRUE, TRUE, TRUE),

  ('ong-casa-angela', 'Casa Angela — Parto Humanizado', 'Associação Comunitária Monte Azul', 'saude_parto',
   'Parto Humanizado Gratuito', 'São Paulo - SP',
   'Centro de parto normal humanizado com pré-natal, doulas e enfermeiras obstétricas sem custo.',
   ARRAY['Pré-natal e parto normal humanizado gratuito', 'Apoio à amamentação e pós-parto'],
   'Presencial ou telefone', 'https://casaangela.org.br', ARRAY['saude'], TRUE, TRUE, TRUE),

  ('ong-mapa-acolhimento', 'Mapa do Acolhimento', 'Rede Nossas', 'psicologico_juridico',
   'Psicologia & Advogada Gratuita', 'Todo o Brasil',
   'Conecta mulheres em situação de violência a psicólogas e advogadas voluntárias gratuitas.',
   ARRAY['Psicoterapia gratuita online ou local', 'Orientação jurídica voluntária'],
   'Formulário online rápido', 'https://www.mapadoacolhimento.org', ARRAY['psicologico', 'juridico', 'emergencia'], TRUE, TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;
