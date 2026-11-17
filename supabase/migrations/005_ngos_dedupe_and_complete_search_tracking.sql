-- ============================================================================
-- AcolheMulher — Banco Completo de ONGs (Anti-Duplicidade) & Registro Total de Buscas
-- ============================================================================
-- Execute este script no SQL Editor do Supabase após 001..004 (idempotente).
--
-- O que este script garante:
-- 1. BANCO COMPLETO DE ONGs SEM DUPLICATAS:
--    - Normaliza public.ngos em 3FN (state, city, region_sk, privacy_note).
--    - Consolida IDs legados (ong-* -> ngo-*) e remove duplicatas antigas.
--    - Cria índices UNIQUE em nome normalizado e domínio+escopo normalizado.
--    - Faz seed idempotente de todas as 14 ONGs verificadas do catálogo.
--    - Cria RPC segura register_ngo_candidate (Zero-duplicidade + anti-serviço pago).
--
-- 2. REGISTRO DE TODAS AS BUSCAS NO STAR SCHEMA (fact_search_demand):
--    - Expande dim_access_channels para cobrir todos os pontos de busca
--      (CEP, voz, agente, card, subfiltro de categoria, diretório de ONGs, PWA, widget).
--    - Mantém Zero-PII estrito e FORCE ROW LEVEL SECURITY em todas as tabelas.
--    - Cria view vw_ngos_normalized (security_invoker = true).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Funções utilitárias de normalização anti-duplicidade de ONGs
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.normalize_ngo_name(p_name TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT TRIM(
    REGEXP_REPLACE(
      REGEXP_REPLACE(
        REGEXP_REPLACE(
          public.normalize_geo_text(REGEXP_REPLACE(COALESCE(p_name, ''), '\([^)]*\)', ' ', 'g')),
          '\b(de|da|do|das|dos|e|para|em|no|na|nos|nas)\b',
          ' ',
          'g'
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

CREATE OR REPLACE FUNCTION public.normalize_ngo_domain(p_url TEXT)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_clean TEXT := LOWER(TRIM(COALESCE(p_url, '')));
BEGIN
  IF v_clean = '' OR v_clean = '#' THEN
    RETURN NULL;
  END IF;

  v_clean := REGEXP_REPLACE(v_clean, '^https?://', '', 'i');
  v_clean := REGEXP_REPLACE(v_clean, '^www\.', '', 'i');
  v_clean := SPLIT_PART(v_clean, '/', 1);
  v_clean := SPLIT_PART(v_clean, '?', 1);
  v_clean := SPLIT_PART(v_clean, '#', 1);
  v_clean := SPLIT_PART(v_clean, ':', 1);
  v_clean := TRIM(v_clean);

  IF v_clean = '' OR v_clean !~ '\.' THEN
    RETURN NULL;
  END IF;

  RETURN v_clean;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Evolução 3FN e Anti-Duplicidade em public.ngos
-- ----------------------------------------------------------------------------
ALTER TABLE public.ngos
  ADD COLUMN IF NOT EXISTS state CHAR(2),
  ADD COLUMN IF NOT EXISTS city TEXT,
  ADD COLUMN IF NOT EXISTS region_sk BIGINT REFERENCES public.dim_regions(region_sk),
  ADD COLUMN IF NOT EXISTS privacy_note TEXT NOT NULL DEFAULT 'Atendimento gratuito e sem exposição pública de dados.',
  ADD COLUMN IF NOT EXISTS name_normalized TEXT,
  ADD COLUMN IF NOT EXISTS website_domain_normalized TEXT,
  ADD COLUMN IF NOT EXISTS source_type TEXT NOT NULL DEFAULT 'curated';

DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.ngos'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%source_type%'
  LOOP
    EXECUTE format('ALTER TABLE public.ngos DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.ngos
  ADD CONSTRAINT chk_ngos_source_type
  CHECK (source_type IN ('curated', 'partner_form', 'osm_discovery'));

-- Consolida IDs legados (001 -> padrão ngo-*) para evitar duplicação com o catálogo atual
DELETE FROM public.ngos WHERE id IN ('ong-americas-amigas', 'ong-casa-angela', 'ong-mapa-acolhimento');

-- Trigger de normalização automática para ONGs
CREATE OR REPLACE FUNCTION public.trg_sync_ngo_normalization_fn()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uf TEXT := UPPER(REGEXP_REPLACE(COALESCE(NEW.state, ''), '[^A-Za-z]', '', 'g'));
BEGIN
  IF LENGTH(v_uf) = 2 THEN
    NEW.state := v_uf::CHAR(2);
    NEW.region_sk := public.ensure_dim_region(NEW.state, COALESCE(NULLIF(TRIM(NEW.city), ''), 'Todo o estado'));
  ELSE
    NEW.state := NULL;
    NEW.region_sk := public.ensure_dim_region('BR', 'Nacional');
  END IF;

  NEW.name := TRIM(NEW.name);
  NEW.name_normalized := public.normalize_ngo_name(NEW.name);
  NEW.website_domain_normalized := public.normalize_ngo_domain(NEW.website_url);
  NEW.privacy_note := COALESCE(NULLIF(TRIM(NEW.privacy_note), ''), 'Atendimento gratuito e sem exposição pública de dados.');
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_ngo_normalization ON public.ngos;
CREATE TRIGGER trg_sync_ngo_normalization
  BEFORE INSERT OR UPDATE OF name, website_url, state, city, privacy_note
  ON public.ngos
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_ngo_normalization_fn();

-- Atualiza registros pré-existentes antes de criar os índices UNIQUE
UPDATE public.ngos
SET name = name;

-- Remove eventuais duplicatas antigas mantendo o registro mais recente/verificado
DELETE FROM public.ngos a
USING public.ngos b
WHERE a.ctid < b.ctid
  AND (
    a.name_normalized = b.name_normalized
    OR (
      a.website_domain_normalized IS NOT NULL
      AND a.website_domain_normalized = b.website_domain_normalized
      AND COALESCE(a.state, 'BR') = COALESCE(b.state, 'BR')
      AND public.normalize_geo_text(COALESCE(a.city, 'nacional')) = public.normalize_geo_text(COALESCE(b.city, 'nacional'))
    )
  );

-- Seed completo e idempotente de todas as 14 ONGs verificadas da plataforma
INSERT INTO public.ngos (
  id, name, organization, area, area_label, coverage, state, city,
  summary, how_they_help, access_channel, website_url, privacy_note,
  related_categories, featured, is_verified, is_active, source_type
) VALUES
  (
    'ngo-nova-mulher-sp-zn',
    'ONG Nova Mulher — Centro Psicossocial (Zona Norte SP)',
    'ONG Nova Mulher · Vila Nova Cachoeirinha',
    'psicologico_juridico',
    'Psicologia & Assistência Social',
    'São Paulo - SP (Zona Norte · Cachoeirinha e região)',
    'SP',
    'São Paulo',
    'Atendimento psicossocial gratuito com psicólogas e assistentes sociais para mulheres na Zona Norte de São Paulo (Vila Nova Cachoeirinha, Horto, Mandaqui e Lauzane).',
    ARRAY[
      'Acolhimento psicológico e escuta social gratuita para mulheres',
      'Orientação e encaminhamento para rede de proteção e direitos',
      'Oficinas de fortalecimento e geração de autonomia'
    ],
    'Atendimento presencial e WhatsApp Psicossocial: (11) 98641-0956',
    'https://ongnovamulher.org',
    'Rua Adolfo Kurt Bohem, 43 - Vila Nova Cachoeirinha, São Paulo - SP.',
    ARRAY['psicologico', 'juridico', 'emergencia', 'cursos'],
    TRUE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-fala-mulher-sp',
    'Associação Fala Mulher',
    'Associação Fala Mulher · Rede de Proteção SP',
    'psicologico_juridico',
    'Psicologia & Defesa da Mulher',
    'São Paulo e Grande SP (Centros de Defesa da Mulher)',
    'SP',
    'São Paulo',
    'Organização que administra Centros de Defesa e de Convivência da Mulher (CDCM) com atendimento psicológico, serviço social e orientação jurídica gratuitos.',
    ARRAY[
      'Acompanhamento psicológico individual e em grupo para mulheres',
      'Orientação jurídica sobre Lei Maria da Penha e direitos da família',
      'Apoio para reconstrução de projeto de vida e autonomia'
    ],
    'Atendimento multidisciplinar gratuito e canais oficiais',
    'https://falamulher.ong.br',
    'Atendimento gratuito e sigiloso sem exigir boletim de ocorrência.',
    ARRAY['psicologico', 'juridico', 'emergencia'],
    TRUE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-mapa-acolhimento',
    'Mapa do Acolhimento',
    'Rede NOSSAS · Voluntárias em todo o Brasil',
    'psicologico_juridico',
    'Psicologia & Jurídico',
    'Todo o Brasil (Online e Presencial)',
    NULL,
    NULL,
    'Conecta gratuitamente mulheres que sofrem ou sofreram violência a uma rede com mais de 10 mil psicólogas e advogadas voluntárias.',
    ARRAY[
      'Terapia psicológica gratuita e continuada',
      'Orientação e acompanhamento jurídico por advogadas',
      'Atendimento acolhedor e sem julgamentos'
    ],
    'Cadastro rápido de acolhimento online',
    'https://www.mapadoacolhimento.org',
    'Atendimento sigiloso conduzido exclusivamente por profissionais voluntárias verificadas.',
    ARRAY['psicologico', 'juridico'],
    TRUE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-justiceiras',
    'Projeto Justiceiras',
    'Instituto Justiceiras & Instituto Bem Querer Mulher',
    'acolhimento_protecao',
    'Acolhimento Multidisciplinar',
    'Todo o Brasil (Atendimento Online)',
    NULL,
    NULL,
    'Equipe multidisciplinar voluntária que orienta mulheres em situação de violência nos aspectos jurídico, psicológico, médico e de assistência social.',
    ARRAY[
      'Orientação para pedir Medidas Protetivas de Urgência',
      'Escuta psicológica e encaminhamento para rede médica',
      'Apoio social para reconstrução de autonomia'
    ],
    'WhatsApp Oficial e Formulário Web',
    'https://justiceiras.org.br',
    'Dica de segurança: se o seu celular for vigiado, prefira abrir pelo navegador anônimo ou apagar o histórico de mensagens depois.',
    ARRAY['juridico', 'psicologico', 'emergencia', 'saude'],
    TRUE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-odara-ba',
    'Odara — Instituto da Mulher Negra (Salvador e Chapada Diamantina)',
    'Instituto Odara · Rede de Mulheres na Bahia',
    'acolhimento_protecao',
    'Direitos, Saúde & Acolhimento (BA)',
    'Bahia (Salvador, Chapada Diamantina e interior baiano)',
    'BA',
    'Salvador e Chapada Diamantina',
    'Organização feminista baiana com atuação ativa em Salvador e no interior da Chapada Diamantina, promovendo saúde da mulher, justiça reprodutiva, enfrentamento à violência e redes de apoio comunitário.',
    ARRAY[
      'Acolhimento, formação de redes comunitárias e orientação de direitos para mulheres na Bahia',
      'Atuação territorial em municípios da Chapada Diamantina e comunidades rurais',
      'Defesa da saúde integral, direitos sexuais, reprodutivos e combate à violência'
    ],
    'Projetos territoriais gratuitos e contato institucional pelo site',
    'https://institutoodara.org.br',
    'Atuação social sem fins lucrativos voltada ao fortalecimento de mulheres negras, periféricas e rurais.',
    ARRAY['saude', 'psicologico', 'juridico', 'emergencia', 'cursos'],
    TRUE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-tamojuntas',
    'Organização TamoJuntas',
    'Coletivo Nacional TamoJuntas',
    'psicologico_juridico',
    'Assessoria Jurídica & Social',
    'Bahia, Nordeste e atendimento online em todo o Brasil',
    NULL,
    NULL,
    'Assessoria gratuita jurídica, psicológica e assistencial feita por mulheres, com atenção especial a mulheres negras, periféricas, interioranas e mães solo.',
    ARRAY[
      'Acompanhamento jurídico em linguagem simples e acessível',
      'Acolhimento psicológico e rodas de apoio',
      'Orientação sobre direitos de família, pensão e guarda'
    ],
    'Solicitação gratuita pelo site',
    'https://tamojuntas.org.br',
    'Atuação focada em acolhimento interseccional sem termos técnicos complicados.',
    ARRAY['juridico', 'psicologico', 'emergencia'],
    TRUE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-americas-amigas',
    'ONG Américas Amigas',
    'Américas Amigas · Saúde e Diagnóstico',
    'saude_parto',
    'Exames Gratuitos de Mama',
    'Todo o Brasil (Clínicas parceiras e carretas)',
    NULL,
    NULL,
    'ONG que doa e realiza gratuitamente exames de mamografia, ultrassom de mama e biópsias para mulheres em situação de vulnerabilidade em todo o país.',
    ARRAY[
      'Mamografias gratuitas sem fila em clínicas parceiras e unidades móveis',
      'Ultrassonografia mamária e biópsias sem custo',
      'Apoio e orientação rápida caso haja alteração no exame'
    ],
    'Solicitação de exame pelo site ou parceiros locais',
    'https://americasamigas.org.br',
    'Atendimento gratuito custeado por doações para mulheres sem plano de saúde.',
    ARRAY['saude'],
    FALSE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-instituto-protea',
    'Instituto Protea',
    'ONG Instituto Protea',
    'saude_parto',
    'Exames & Tratamento Gratuito',
    'São Paulo e redes parceiras',
    NULL,
    NULL,
    'Organização sem fins lucrativos que custeia gratuitamente consultas, exames de imagem, biópsias e tratamento de câncer de mama para mulheres de baixa renda.',
    ARRAY[
      'Exames diagnósticos rápidos sem custo para a paciente',
      'Consultas com mastologistas e cirurgias custeadas pela ONG',
      'Acompanhamento humanizado durante todo o processo'
    ],
    'Encaminhamento direto via site da ONG',
    'https://institutoprotea.org.br',
    'Voltado a mulheres sem plano de saúde privado.',
    ARRAY['saude'],
    FALSE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-casa-angela',
    'Casa Angela — Centro de Parto Humanizado',
    'Associação Comunitária Monte Azul (ONG)',
    'saude_parto',
    'Parto Humanizado Gratuito',
    'São Paulo - SP (Zona Sul · Atende via SUS e apoio social)',
    'SP',
    'São Paulo',
    'Casa de parto sem fins lucrativos que oferece pré-natal acolhedor, parto humanizado com enfermeiras obstetras, doulas e apoio no pós-parto gratuitamente.',
    ARRAY[
      'Parto normal humanizado em ambiente acolhedor e respeitoso',
      'Consultas de pré-natal e grupos de preparação gratuitos',
      'Apoio à amamentação e cuidados com o recém-nascido'
    ],
    'Grupos de acolhimento gratuitos e agendamento presencial',
    'https://casaangela.org.br',
    'Atende gratuitamente gestantes de baixo risco encaminhadas ou por inscrição nos grupos abertos.',
    ARRAY['saude'],
    FALSE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-rede-feminina-cancer',
    'Rede Feminina de Combate ao Câncer',
    'Federação Nacional das Redes Femininas',
    'saude_parto',
    'Exames Preventivos & Acolhimento',
    'Todo o Brasil (Núcleos estaduais e municipais)',
    NULL,
    NULL,
    'Rede de ONGs presente em dezenas de cidades brasileiras que realiza exames preventivos (Papanicolau/colo do útero e mama) e acolhe mulheres gratuitamente.',
    ARRAY[
      'Coleta gratuita de exame preventivo (Papanicolau)',
      'Encaminhamento rápido para mamografia e exames complementares',
      'Apoio emocional, perucas, cestas e assistência social'
    ],
    'Atendimento presencial nas sedes regionais',
    'https://redefemininanacional.org.br',
    'Procure o núcleo da Rede Feminina da sua cidade para atendimento direto sem burocracia.',
    ARRAY['saude'],
    FALSE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-penhas-azmina',
    'Instituto AzMina · Rede PenhaS',
    'Revista AzMina',
    'acolhimento_protecao',
    'Informação, Prevenção & Proteção',
    'Nacional (Aplicativo e Portal)',
    NULL,
    NULL,
    'Iniciativa que oferece informação clara sobre relacionamentos abusivos, Lei Maria da Penha, rede de apoio entre mulheres e botão de alerta.',
    ARRAY[
      'Conteúdo educativo para identificar violência psicológica e patrimonial',
      'Espaço seguro de diálogo anônimo e troca entre mulheres',
      'Mapeamento de delegacias e serviços públicos'
    ],
    'Plataforma digital e chat de apoio',
    'https://penhas.com.br',
    'Conteúdos abertos para leitura imediata sem exigência de conta.',
    ARRAY['emergencia', 'juridico'],
    TRUE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-instituto-maria-da-penha',
    'Instituto Maria da Penha (IMP)',
    'ONG Instituto Maria da Penha',
    'acolhimento_protecao',
    'Direitos & Orientação',
    'Nacional (Sede em Fortaleza e Recife)',
    NULL,
    NULL,
    'Organização fundada por Maria da Penha que disponibiliza guias gratuitos sobre os 5 tipos de violência, direitos garantidos por lei e caminhos de denúncia.',
    ARRAY[
      'Explicação detalhada sobre como funciona a Lei Maria da Penha',
      'Orientação sobre violência física, psicológica, sexual, patrimonial e moral',
      'Articulação com redes municipais de proteção'
    ],
    'Guias abertos e canais institucionais',
    'https://www.institutomariadapenha.org.br',
    'Material informativo 100% aberto, sem cadastro e gratuito.',
    ARRAY['juridico', 'emergencia'],
    FALSE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-reprograma',
    '{reprograma}',
    'Iniciativa de Impacto Social em Tecnologia',
    'cursos_renda',
    'Cursos Gratuitos em Tecnologia',
    'Todo o Brasil (Turmas Online)',
    NULL,
    NULL,
    'Organização sem fins lucrativos que oferece bolsas 100% gratuitas de formação em programação e tecnologia para mulheres cis e trans em vulnerabilidade.',
    ARRAY[
      'Cursos gratuitos de desenvolvimento web e lógica de programação',
      'Mentoria de carreira para conquistar trabalho remoto',
      'Foco em mulheres negras, trans e em transição de carreira'
    ],
    'Editais gratuitos e conteúdos abertos',
    'https://reprograma.com.br',
    '100% gratuito com foco em autonomia financeira e empregabilidade.',
    ARRAY['cursos'],
    FALSE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-rme',
    'Rede Mulher Empreendedora (Instituto RME)',
    'Instituto Rede Mulher Empreendedora',
    'cursos_renda',
    'Autonomia Financeira & Negócios',
    'Nacional (Online e núcleos regionais)',
    NULL,
    NULL,
    'Apoia mulheres a alcançarem independência financeira por meio de cursos gratuitos de empreendedorismo, finanças pessoais e geração de renda.',
    ARRAY[
      'Trilhas gratuitas de como começar um negócio do zero',
      'Educação financeira para sair da dependência econômica',
      'Rede de apoio e conexão com outras empreendedoras'
    ],
    'Capacitações e trilhas gratuitas no site',
    'https://irmesocial.org.br',
    'Programas gratuitos voltados para mulheres em vulnerabilidade socioeconômica.',
    ARRAY['cursos'],
    FALSE, TRUE, TRUE, 'curated'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  organization = EXCLUDED.organization,
  area = EXCLUDED.area,
  area_label = EXCLUDED.area_label,
  coverage = EXCLUDED.coverage,
  state = EXCLUDED.state,
  city = EXCLUDED.city,
  summary = EXCLUDED.summary,
  how_they_help = EXCLUDED.how_they_help,
  access_channel = EXCLUDED.access_channel,
  website_url = EXCLUDED.website_url,
  privacy_note = EXCLUDED.privacy_note,
  related_categories = EXCLUDED.related_categories,
  featured = EXCLUDED.featured,
  is_verified = EXCLUDED.is_verified,
  is_active = EXCLUDED.is_active,
  source_type = EXCLUDED.source_type;

-- Índices UNIQUE anti-duplicidade em public.ngos
CREATE UNIQUE INDEX IF NOT EXISTS uq_ngos_name_normalized
  ON public.ngos (name_normalized);

CREATE UNIQUE INDEX IF NOT EXISTS uq_ngos_domain_scope
  ON public.ngos (
    website_domain_normalized,
    COALESCE(state, 'BR'),
    public.normalize_geo_text(COALESCE(city, 'nacional'))
  )
  WHERE website_domain_normalized IS NOT NULL AND website_domain_normalized <> '';

CREATE INDEX IF NOT EXISTS idx_ngos_domain_lookup
  ON public.ngos (website_domain_normalized)
  WHERE website_domain_normalized IS NOT NULL;

-- View normalizada de ONGs (respeita RLS com security_invoker = true)
CREATE OR REPLACE VIEW public.vw_ngos_normalized
WITH (security_invoker = true)
AS
SELECT
  n.id,
  n.name,
  n.organization,
  n.area,
  n.area_label,
  n.coverage,
  n.state,
  n.city,
  r.state_name,
  r.macro_region,
  n.summary,
  n.how_they_help,
  n.access_channel,
  n.website_url,
  n.privacy_note,
  n.related_categories,
  n.featured,
  n.source_type,
  n.updated_at
FROM public.ngos n
LEFT JOIN public.dim_regions r ON r.region_sk = n.region_sk
WHERE n.is_active = TRUE
  AND n.is_verified = TRUE;

GRANT SELECT ON public.vw_ngos_normalized TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 3. RPC segura para cadastrar novas ONGs gratuitas sem duplicidade
-- ----------------------------------------------------------------------------
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
  p_privacy_note TEXT DEFAULT 'Atendimento gratuito voltado para mulheres.',
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
  v_name TEXT := TRIM(COALESCE(p_name, ''));
  v_org TEXT := TRIM(COALESCE(p_organization, ''));
  v_area TEXT := LOWER(TRIM(COALESCE(p_area, 'acolhimento_protecao')));
  v_area_label TEXT := TRIM(COALESCE(p_area_label, 'Apoio Gratuito para Mulheres'));
  v_coverage TEXT := TRIM(COALESCE(p_coverage, ''));
  v_state TEXT := NULLIF(UPPER(REGEXP_REPLACE(COALESCE(p_state, ''), '[^A-Za-z]', '', 'g')), '');
  v_city TEXT := NULLIF(LEFT(TRIM(REGEXP_REPLACE(COALESCE(p_city, ''), '[0-9]+', '', 'g')), 80), '');
  v_summary TEXT := TRIM(COALESCE(p_summary, ''));
  v_channel TEXT := TRIM(COALESCE(p_access_channel, ''));
  v_website TEXT := TRIM(COALESCE(p_website_url, ''));
  v_privacy TEXT := TRIM(COALESCE(p_privacy_note, ''));
  v_source TEXT := CASE WHEN p_source_type = 'osm_discovery' THEN 'osm_discovery' ELSE 'partner_form' END;
  v_name_norm TEXT;
  v_domain_norm TEXT;
  v_existing RECORD;
  v_slug TEXT;
  v_new_id TEXT;
  v_valid_categories TEXT[] := ARRAY[]::TEXT[];
  v_cat TEXT;
  v_help TEXT[] := ARRAY[]::TEXT[];
  v_h TEXT;
  v_combined_check TEXT;
  v_verified BOOLEAN;
BEGIN
  IF NOT COALESCE(p_is_free_confirmed, FALSE) THEN
    RETURN jsonb_build_object(
      'status', 'invalid',
      'message', 'Apenas ONGs e projetos 100% gratuitos podem ser cadastrados na plataforma.'
    );
  END IF;

  IF LENGTH(v_name) < 4 THEN
    RETURN jsonb_build_object(
      'status', 'invalid',
      'message', 'Informe o nome completo da ONG (mínimo 4 caracteres).'
    );
  END IF;

  IF LENGTH(v_summary) < 15 THEN
    RETURN jsonb_build_object(
      'status', 'invalid',
      'message', 'Descreva brevemente como a ONG ajuda mulheres gratuitamente (mínimo 15 caracteres).'
    );
  END IF;

  IF v_source = 'partner_form' AND v_website !~* '^https?://[^\s/$.?#].[^\s]*$' THEN
    RETURN jsonb_build_object(
      'status', 'invalid',
      'message', 'Informe um site ou link oficial válido começando com https:// ou http://'
    );
  END IF;

  v_combined_check := LOWER(v_name || ' ' || v_org || ' ' || v_summary || ' ' || v_channel);
  IF v_combined_check ~ '(mensalidade|plano de sa[uú]de|conv[eê]nio|particular|privad[oa]|unimed|hapvida|amil|bradesco sa[uú]de|sulam[eé]rica|taxa de ades[aã]o|consulta paga)' THEN
    RETURN jsonb_build_object(
      'status', 'invalid',
      'message', 'Serviços pagos, particulares ou planos de saúde não são permitidos nesta plataforma.'
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

  -- Checagem estrita anti-duplicidade (por nome normalizado OU por domínio no mesmo escopo / nacional)
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
           AND public.normalize_geo_text(COALESCE(city, 'todo o estado')) = public.normalize_geo_text(COALESCE(v_city, 'todo o estado'))
         )
       )
     )
  LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'status', 'duplicate',
      'ngo_id', v_existing.id,
      'existing_name', v_existing.name,
      'message', format('Esta ONG já está cadastrada no banco de dados (%s).', v_existing.name)
    );
  END IF;

  IF p_related_categories IS NOT NULL THEN
    FOREACH v_cat IN ARRAY p_related_categories LOOP
      v_cat := LOWER(TRIM(COALESCE(v_cat, '')));
      IF v_cat IN ('juridico', 'psicologico', 'saude', 'cursos', 'emergencia')
         AND NOT (v_cat = ANY(v_valid_categories)) THEN
        v_valid_categories := array_append(v_valid_categories, v_cat);
      END IF;
    END LOOP;
  END IF;

  IF array_length(v_valid_categories, 1) IS NULL THEN
    v_valid_categories := ARRAY['psicologico', 'juridico', 'emergencia'];
  END IF;

  IF p_how_they_help IS NOT NULL THEN
    FOREACH v_h IN ARRAY p_how_they_help LOOP
      v_h := TRIM(COALESCE(v_h, ''));
      IF v_h <> '' THEN
        v_help := array_append(v_help, LEFT(v_h, 180));
      END IF;
    END LOOP;
  END IF;

  IF array_length(v_help, 1) IS NULL THEN
    v_help := ARRAY[LEFT(v_summary, 180)];
  END IF;

  v_slug := REGEXP_REPLACE(v_name_norm, '[^a-z0-9]+', '-', 'g');
  v_slug := TRIM(BOTH '-' FROM LEFT(v_slug, 48));
  v_new_id := 'ngo-' || COALESCE(NULLIF(v_slug, ''), 'parceira') || '-' || SUBSTRING(md5(v_name_norm || COALESCE(v_domain_norm, '') || clock_timestamp()::TEXT) FROM 1 FOR 6);

  -- Cadastro de parceiras com URL válida e confirmação de gratuidade fica publicado; descobertas automáticas OSM entram em fila de verificação
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
    LEFT(COALESCE(NULLIF(v_coverage, ''), CASE WHEN v_state IS NOT NULL THEN COALESCE(v_city || ' - ', '') || v_state ELSE 'Brasil' END), 140),
    v_state,
    v_city,
    LEFT(v_summary, 600),
    v_help,
    LEFT(COALESCE(NULLIF(v_channel, ''), 'Atendimento gratuito pelo site oficial'), 160),
    CASE WHEN v_website = '' THEN '#' ELSE LEFT(v_website, 300) END,
    LEFT(COALESCE(NULLIF(v_privacy, ''), 'Atendimento gratuito e sigiloso voltado para mulheres.'), 260),
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
      WHEN v_verified THEN 'ONG cadastrada no banco de dados com sucesso e já disponível nas buscas.'
      ELSE 'ONG registrada no banco de dados para validação.'
    END
  );
EXCEPTION
  WHEN unique_violation THEN
    RETURN jsonb_build_object(
      'status', 'duplicate',
      'message', 'Esta ONG já possui cadastro ativo com o mesmo nome ou site no banco de dados.'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.register_ngo_candidate(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT, TEXT[], BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_ngo_candidate(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT[], TEXT, TEXT, TEXT, TEXT[], BOOLEAN, TEXT) TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. Expansão de Canais de Busca no Star Schema (todas as buscas da plataforma)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.dim_access_channels'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%channel_key%'
  LOOP
    EXECUTE format('ALTER TABLE public.dim_access_channels DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE public.dim_access_channels
  ADD CONSTRAINT chk_dim_access_channels_key
  CHECK (
    channel_key IN (
      'web_cep',
      'web_voice',
      'triage_agent',
      'category_card',
      'category_filter',
      'ongs_directory',
      'pwa_offline',
      'widget_ngo'
    )
  );

INSERT INTO public.dim_access_channels (channel_key, channel_label)
VALUES
  ('web_cep', 'Busca por CEP ou Cidade'),
  ('web_voice', 'Busca por Voz'),
  ('triage_agent', 'Agente de Acolhimento'),
  ('category_card', 'Card de Categoria / Menu'),
  ('category_filter', 'Subfiltro na Categoria'),
  ('ongs_directory', 'Diretório de ONGs'),
  ('pwa_offline', 'Aplicativo PWA Offline'),
  ('widget_ngo', 'Widget em Site Parceiro')
ON CONFLICT (channel_key) DO UPDATE SET
  channel_label = EXCLUDED.channel_label;

-- View consolidada de totais gerais do Star Schema (Zero-PII)
CREATE OR REPLACE VIEW public.vw_star_demand_totals
WITH (security_invoker = true)
AS
SELECT
  COALESCE(SUM(f.search_count), 0)::BIGINT AS total_searches,
  COUNT(DISTINCT f.region_sk)::BIGINT AS distinct_regions,
  COUNT(DISTINCT f.date_sk)::BIGINT AS active_days
FROM public.fact_search_demand f;

GRANT SELECT ON public.vw_star_demand_totals TO anon, authenticated;
