-- ============================================================================
-- AcolheMulher — Expansao do Banco de ONGs de Cursos Gratuitos para Mulheres
-- ============================================================================
-- Execute este script no SQL Editor do Supabase apos 007 (100% idempotente).
--
-- Padrao garantido (compativel com as CHECK constraints da migration 007):
-- 1. ZERO acentos e ZERO caracteres especiais em todas as colunas textuais.
-- 2. Triggers trg_00_sanitize_ngos + trg_sync_ngo_3fn + trg_sync_ngo_normalization
--    mantem dim_organizations, dim_regions, dim_ngo_areas e ngo_help_items
--    automaticamente sincronizadas no Star Schema 3FN.
-- 3. Mantem ENABLE + FORCE ROW LEVEL SECURITY e previne duplicatas por nome e
--    dominio+escopo.
-- ============================================================================

INSERT INTO public.ngos (
  id,
  name,
  organization,
  area,
  area_label,
  coverage,
  state,
  city,
  summary,
  how_they_help,
  access_channel,
  website_url,
  privacy_note,
  related_categories,
  featured,
  is_verified,
  is_active,
  source_type
) VALUES
  (
    'ngo-rme',
    'Rede Mulher Empreendedora Instituto RME',
    'Instituto Rede Mulher Empreendedora',
    'cursos_renda',
    'Autonomia Financeira Negocios e IA',
    'Todo o Brasil Online Programas Ela Pode Ela Modo IA e nucleos regionais',
    NULL,
    NULL,
    'Principal rede brasileira de apoio ao empreendedorismo feminino oferecendo cursos gratuitos de gestao financas pessoais vendas e Inteligencia Artificial aplicada a pequenos negocios',
    ARRAY[
      'Trilhas gratuitas de como comecar um negocio do zero e formalizar MEI',
      'Capacitacao gratuita em Inteligencia Artificial e seguranca digital Ela Modo IA',
      'Educacao financeira e rede de mentoras para sair da dependencia economica'
    ],
    'Capacitacoes e trilhas gratuitas no site oficial',
    'https://rme.net.br',
    'Programas gratuitos voltados para mulheres em vulnerabilidade socioeconomica',
    ARRAY['cursos'],
    TRUE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-programaria',
    'PrograMaria',
    'PrograMaria Impacto Social em Tecnologia',
    'cursos_renda',
    'Programacao Dados e Tecnologia',
    'Todo o Brasil Online e eventos presenciais em Sao Paulo SP',
    'SP',
    'Sao Paulo',
    'Organizacao de impacto social que oferece bolsas de estudo 100 por cento gratuitas e cursos de introducao a programacao desenvolvimento web analise de dados e Inteligencia Artificial para mulheres',
    ARRAY[
      'Bolsas integrais em programacao web front end back end e ciencia de dados',
      'Trilhas e workshops gratuitos de tecnologia e IA voltados a mulheres',
      'Comunidade nacional de apoio e conexao com oportunidades no setor de TI'
    ],
    'Editais gratuitos de bolsas e eventos no site oficial',
    'https://www.programaria.org',
    'Programas e editais gratuitos voltados a inclusao e permanencia de mulheres na tecnologia',
    ARRAY['cursos'],
    TRUE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-ai-girls',
    'AI Girls IA Girls Brasil',
    'Comunidade AI Girls BR',
    'cursos_renda',
    'Inteligencia Artificial e Ciencia de Dados',
    'Todo o Brasil Online Comunidade Nacional',
    NULL,
    NULL,
    'Comunidade brasileira criada por mulheres para fortalecer o protagonismo feminino em Inteligencia Artificial e Ciencia de Dados com workshops praticos mentorias e grupos gratuitos',
    ARRAY[
      'Workshops meetups e grupos de estudo gratuitos em Inteligencia Artificial',
      'Mentorias e apoio para mulheres iniciarem carreira em Ciencia de Dados',
      'Materiais abertos e incentivo a participacao feminina como palestrantes'
    ],
    'Workshops meetups e grupos de estudo gratuitos',
    'https://aigirlsbr.github.io',
    'Iniciativa comunitaria gratuita e sem fins lucrativos voltada a mulheres em IA',
    ARRAY['cursos'],
    TRUE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-womakerscode',
    'WoMakersCode Mais Mulheres Tech',
    'ONG WoMakersCode',
    'cursos_renda',
    'Bootcamps Cloud Dados e IA',
    'Todo o Brasil Online e encontros presenciais em SP RJ MG BA PE PR RS e DF',
    NULL,
    NULL,
    'Uma das maiores ONGs e comunidades da America Latina voltada a inclusao de mulheres na tecnologia oferecendo bootcamps gratuitos em IA Cloud Dados DevOps e programacao',
    ARRAY[
      'Bootcamps 100 por cento gratuitos em Inteligencia Artificial Cloud Python e Dados',
      'Mentorias tecnicas e preparacao para certificacoes na plataforma Mais Mulheres Tech',
      'Capitulos e encontros presenciais e online em diversas capitais brasileiras'
    ],
    'Plataforma Mais Mulheres Tech e bootcamps gratuitos',
    'https://womakerscode.org',
    'Organizacao sem fins lucrativos com capacitacoes gratuitas por inscricao nos editais',
    ARRAY['cursos'],
    TRUE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-tech-girls',
    'Projeto Tech Girls',
    'ONG Tech Girls Inclusao Digital',
    'cursos_renda',
    'TI Hardware e Inclusao Digital PR SC SP',
    'Curitiba PR Presencial Joinville SC Sao Paulo SP e Online',
    'PR',
    'Curitiba',
    'Projeto social criado em Curitiba que capacita mulheres em vulnerabilidade social em tecnologia manutencao de hardware software empreendedorismo digital e reaproveitamento de lixo eletronico',
    ARRAY[
      'Cursos presenciais gratuitos de TI programacao e manutencao de computadores',
      'Formacao em empreendedorismo digital e economia circular com eletronicos',
      'Apoio voltado a donas de casa e mulheres em transicao de carreira'
    ],
    'Turmas presenciais e inscricao gratuita pelo site oficial',
    'https://techgirls.com.br',
    'Projeto social sem fins lucrativos focado na autonomia digital e profissional de mulheres',
    ARRAY['cursos'],
    TRUE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-minas-programam',
    'Instituto Minas Programam',
    'Instituto Minas Programam',
    'cursos_renda',
    'Programacao para Mulheres Negras e Indigenas',
    'Todo o Brasil Online ao vivo e acoes presenciais em Sao Paulo SP',
    'SP',
    'Sao Paulo',
    'Instituto que combate desigualdades de genero e raca na computacao oferecendo cursos gratuitos de logica de programacao HTML CSS JavaScript e fundamentos tech para mulheres negras e indigenas',
    ARRAY[
      'Cursos introdutorios gratuitos de programacao com aulas ao vivo',
      'Trilhas de aprofundamento e rede acolhedora de apoio entre alunas',
      'Foco prioritario em mulheres negras indigenas e em vulnerabilidade'
    ],
    'Editais gratuitos de formacao pelo site oficial',
    'https://minasprogramam.com',
    'Formacao 100 por cento gratuita sem exigencia de conhecimento previo em programacao',
    ARRAY['cursos'],
    FALSE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-pretalab',
    'PretaLab Olabi',
    'Olabi Iniciativa PretaLab',
    'cursos_renda',
    'Tech Dados e IA para Mulheres Negras e Indigenas',
    'Todo o Brasil Online Sede no Rio de Janeiro RJ',
    'RJ',
    'Rio de Janeiro',
    'Plataforma que conecta mulheres negras e indigenas ao mercado de tecnologia por meio de ciclos formativos gratuitos em programacao analise de dados Python SQL e Inteligencia Artificial',
    ARRAY[
      'Ciclos formativos gratuitos em front end programacao dados e IA',
      'Mentoria de soft skills autogestao e preparacao para entrevistas',
      'Conexao direta com vagas e redes de tecnologia e inovacao'
    ],
    'Ciclos formativos gratuitos online pelo site',
    'https://www.pretalab.com',
    'Iniciativa gratuita focada no protagonismo e empregabilidade de mulheres negras e indigenas',
    ARRAY['cursos'],
    FALSE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-elas-programam',
    'Elas Programam',
    'Comunidade Elas Programam',
    'cursos_renda',
    'Bolsas Tech e Transicao de Carreira',
    'Todo o Brasil Online',
    NULL,
    NULL,
    'Plataforma e comunidade feminina dedicada a conectar mulheres a bolsas integrais bootcamps gratuitos de programacao Inteligencia Artificial e oportunidades de carreira em tecnologia',
    ARRAY[
      'Divulgacao e articulacao de bolsas 100 por cento gratuitas em tecnologia e IA',
      'Eventos online mentorias de carreira e troca entre mulheres de todo o Brasil',
      'Apoio para ingresso inicial e transicao de carreira para o setor digital'
    ],
    'Portal de bolsas e comunidade online gratuita',
    'https://www.elasprogramam.com.br',
    'Acesso gratuito a conteudos comunidades e chamadas de bolsas',
    ARRAY['cursos'],
    FALSE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-pyladies-brasil',
    'PyLadies Brasil',
    'Comunidade PyLadies Brasil',
    'cursos_renda',
    'Oficinas de Python Presencial e Online',
    'Presencial em capitais SP RJ MG BA PE CE PR RS DF AM PA e Online',
    NULL,
    NULL,
    'Comunidade com capitulos ativos em dezenas de cidades brasileiras que realiza oficinas praticas gratuitas de programacao Python ciencia de dados e mentoria em espaco seguro para mulheres',
    ARRAY[
      'Oficinas gratuitas de Python do nivel iniciante ao intermediario',
      'Encontros presenciais em universidades e espacos comunitarios pelo pais',
      'Grupos de estudo acolhedores organizados por mulheres desenvolvedoras'
    ],
    'Capitulos regionais presenciais e eventos gratuitos',
    'https://brasil.pyladies.com',
    'Atividades gratuitas e abertas conduzidas por capitulos voluntarios regionais',
    ARRAY['cursos'],
    FALSE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-infopreta',
    'InfoPreta',
    'InfoPreta Tecnologia e Inclusao Digital',
    'cursos_renda',
    'TI Manutencao e Inclusao Digital SP',
    'Sao Paulo SP Presencial e acoes online',
    'SP',
    'Sao Paulo',
    'Negocio de impacto social liderado por mulheres negras em Sao Paulo que realiza oficinas gratuitas de tecnologia manutencao de computadores e inclusao digital com doacao de equipamentos',
    ARRAY[
      'Oficinas de manutencao de computadores hardware e suporte tecnico',
      'Projetos de inclusao digital para mulheres negras e perifericas',
      'Orientacao tecnica para autonomia profissional na area de TI'
    ],
    'Oficinas sociais e projetos pelo site oficial',
    'https://www.infopreta.com.br',
    'Projetos sociais gratuitos em parceria com comunidades de Sao Paulo',
    ARRAY['cursos'],
    FALSE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-cruzando-historias',
    'Cruzando Historias',
    'Associacao Cruzando Historias',
    'cursos_renda',
    'Empregabilidade Curriculo e Acolhimento',
    'Todo o Brasil Online e presencial em Sao Paulo SP',
    'SP',
    'Sao Paulo',
    'ONG dedicada a recolocacao profissional e acolhimento de mulheres desempregadas ou em vulnerabilidade com cursos gratuitos de curriculo LinkedIn uso de IA para buscar vagas e apoio psicologico',
    ARRAY[
      'Programa gratuito Impulsione sua Carreira com oficinas praticas de emprego',
      'Preparacao para entrevistas montagem de curriculo e LinkedIn sem custo',
      'Apoio psicologico gratuito e orientacao de carreira EscutAcao'
    ],
    'Inscricoes gratuitas no programa Impulsione sua Carreira',
    'https://www.cruzandohistorias.org',
    'Atendimento 100 por cento gratuito focado em mulheres em busca de recolocacao',
    ARRAY['cursos', 'psicologico'],
    FALSE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-mulher-em-construcao',
    'Instituto Mulher em Construcao IMEC',
    'ONG Instituto Mulher em Construcao',
    'cursos_renda',
    'Oficios e Construcao Civil RS Presencial',
    'Canoas Porto Alegre RS e acoes itinerantes presenciais',
    'RS',
    'Canoas',
    'ONG gaucha pioneira que capacita gratuitamente mulheres de baixa renda em oficinas presenciais de construcao civil eletrica hidraulica pintura e pequenos reparos para geracao rapida de renda',
    ARRAY[
      'Cursos presenciais gratuitos de hidraulica eletrica pintura e alvenaria',
      'Formacao pratica para trabalho autonomo e independencia financeira',
      'Acompanhamento social e apoio a insercao profissional'
    ],
    'Oficinas presenciais gratuitas e inscricao pelo site',
    'https://www.mulheremconstrucao.org.br',
    'Oficinas gratuitas voltadas para mulheres em vulnerabilidade socioeconomica',
    ARRAY['cursos'],
    FALSE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-instituto-dona-de-si',
    'Instituto Dona de Si',
    'Instituto Dona de Si',
    'cursos_renda',
    'Empreendedorismo e Aceleracao RJ e Online',
    'Rio de Janeiro RJ Presencial e Todo o Brasil Online',
    'RJ',
    'Rio de Janeiro',
    'Instituto fundado no Rio de Janeiro que promove capacitacao gratuita em empreendedorismo feminino gestao vendas e aceleracao de talentos para mulheres alcancarem autonomia financeira',
    ARRAY[
      'Jornadas gratuitas de capacitacao e aceleracao de negocios femininos',
      'Mentorias de autoconhecimento vendas e planejamento financeiro',
      'Atividades presenciais no Rio de Janeiro e turmas online para todo o Brasil'
    ],
    'Editais gratuitos de formacao e aceleracao no site',
    'https://institutodonadesi.com.br',
    'Programas gratuitos mantidos por parcerias sociais sem cobranca as participantes',
    ARRAY['cursos'],
    FALSE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-alianca-empreendedora',
    'Alianca Empreendedora',
    'Alianca Empreendedora Negocios de Baixa Renda',
    'cursos_renda',
    'Microempreendedorismo e Vendas PR e Brasil',
    'Curitiba PR Sede Presencial e Todo o Brasil Online',
    'PR',
    'Curitiba',
    'Organizacao social com sede em Curitiba e atuacao nacional que capacita gratuitamente microempreendedoras em vendas precificacao financas e formalizacao de pequenos negocios',
    ARRAY[
      'Cursos rapidos e gratuitos de gestao vendas e precificacao online',
      'Projetos presenciais em comunidades com parceiros regionais',
      'Trilhas voltadas a mulheres com negocios informais ou MEI'
    ],
    'Cursos gratuitos online e projetos presenciais locais',
    'https://aliancaempreendedora.org.br',
    'Conteudos e capacitacoes gratuitas voltadas a inclusao produtiva',
    ARRAY['cursos'],
    FALSE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-humana-elas-maris-ba',
    'Projeto Elas MARIS Humana Brasil BA',
    'Humana Brasil Desenvolvimento Social',
    'cursos_renda',
    'Costura Marketing Digital e Renda BA Presencial',
    'Salvador e Lauro de Freitas BA Presencial',
    'BA',
    'Salvador',
    'Iniciativa social na Bahia com cursos presenciais gratuitos de corte e costura marketing digital e gestao para impulsionar o empreendedorismo feminino em comunidades de Salvador e Lauro de Freitas',
    ARRAY[
      'Cursos presenciais gratuitos de corte costura e economia criativa',
      'Oficinas de marketing digital e vendas para geracao de renda local',
      'Fortalecimento de redes comunitarias femininas na Regiao Metropolitana de Salvador'
    ],
    'Turmas presenciais comunitarias e contato pelo site',
    'https://humanabrasil.org',
    'Projeto social gratuito voltado a mulheres em vulnerabilidade social na Bahia',
    ARRAY['cursos'],
    FALSE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-instituto-alianca-pe',
    'Escola Social do Varejo Instituto Alianca PE',
    'Instituto Alianca',
    'cursos_renda',
    'Qualificacao Profissional e Varejo PE Presencial',
    'Recife PE Salvador BA Fortaleza CE e Sao Paulo SP Presencial e Hibrido',
    'PE',
    'Recife',
    'Organizacao sem fins lucrativos com atuacao destacada no Nordeste oferecendo qualificacao profissional gratuita para o varejo vendas habilidades digitais e insercao no mercado de trabalho',
    ARRAY[
      'Formacao presencial e hibrida gratuita voltada a empregabilidade',
      'Oficinas de atendimento vendas competencias digitais e socioemocionais',
      'Ponte direta e gratuita com vagas em redes varejistas parceiras'
    ],
    'Inscricoes gratuitas e editais regionais pelo site',
    'https://institutoalianca.org.br',
    'Capacitacao gratuita voltada a inclusao produtiva de mulheres e jovens',
    ARRAY['cursos'],
    FALSE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-casa-marina-mg',
    'Casa Marina Instituto Marina e Flavio Guimaraes MG',
    'Instituto Marina e Flavio Guimaraes',
    'cursos_renda',
    'Cultura Digital e Moda MG Presencial',
    'Belo Horizonte MG Regiao Central Presencial',
    'MG',
    'Belo Horizonte',
    'Espaco social em Belo Horizonte com cursos praticos presenciais e gratuitos voltados a mulheres em vulnerabilidade social abrangendo cultura digital smartphone para negocios e design de moda',
    ARRAY[
      'Oficinas presenciais gratuitas de cultura digital e ferramentas de celular',
      'Cursos praticos de costura design de moda e economia criativa',
      'Acolhimento presencial gratuito no centro de Belo Horizonte'
    ],
    'Inscricoes presenciais gratuitas em Belo Horizonte',
    'https://institutomfg.com.br',
    'Atendimento presencial 100 por cento gratuito focado em autonomia feminina em Minas Gerais',
    ARRAY['cursos'],
    FALSE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-das-pretas-es',
    'Instituto Das Pretas ES e Online',
    'Instituto Das Pretas Tecnologia Social',
    'cursos_renda',
    'Inovacao Social e EAD ES e Brasil',
    'Vitoria ES Presencial e EAD Online em todo o Brasil',
    'ES',
    'Vitoria',
    'Organizacao capixaba afro centrada de tecnologia social que oferece oficinas presenciais em Vitoria e cursos gratuitos em plataforma propria para geracao de renda e protagonismo de mulheres',
    ARRAY[
      'Plataforma gratuita de ensino a distancia e capacitacao produtiva',
      'Oficinas presenciais de inovacao social e economia criativa no Espirito Santo',
      'Apoio ao fortalecimento economico de mulheres negras e perifericas'
    ],
    'Plataforma EAD e oficinas presenciais pelo site',
    'https://daspretas.com.br',
    'Iniciativa sem fins lucrativos voltada a formacao e inclusao produtiva',
    ARRAY['cursos'],
    FALSE, TRUE, TRUE, 'curated'
  ),
  (
    'ngo-casa-preta-amazonia-pa',
    'Casa Preta Amazonia Belem PA e Norte',
    'Casa Preta Amazonia',
    'cursos_renda',
    'Formacao Digital e Renda PA Presencial e Online',
    'Belem PA Presencial e Plataforma Online na Amazonia e Brasil',
    'PA',
    'Belem',
    'Organizacao amazonida sediada em Belem do Para que promove formacoes presenciais e cursos online gratuitos de protagonismo digital cultura e geracao de renda para mulheres negras e amazonidas',
    ARRAY[
      'Formacoes presenciais gratuitas em Belem e oficinas comunitarias',
      'Cursos gratuitos em plataforma online para autonomia digital e cultural',
      'Rede comunitaria de fortalecimento feminino na Regiao Norte'
    ],
    'Oficinas presenciais em Belem e ambiente virtual de cursos',
    'https://casapretaamazonia.org',
    'Projeto social gratuito de base comunitaria na Amazonia',
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

-- Garante associacao 3FN em public.ngo_categories para todas as ONGs ativas
INSERT INTO public.ngo_categories (ngo_id, category_key)
SELECT n.id, c.cat_key
FROM public.ngos n
CROSS JOIN LATERAL UNNEST(n.related_categories) AS c(cat_key)
WHERE EXISTS (
  SELECT 1 FROM public.dim_categories dc WHERE dc.category_key = c.cat_key
)
ON CONFLICT DO NOTHING;
