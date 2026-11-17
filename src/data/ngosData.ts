export type NgoHelpArea = 'todas' | 'psicologico_juridico' | 'acolhimento_protecao' | 'saude_parto' | 'cursos_renda';

export interface NgoItem {
  id: string;
  name: string;
  organization: string;
  featured?: boolean;
  area: Exclude<NgoHelpArea, 'todas'>;
  areaLabel: string;
  coverage: string;
  state?: string;
  city?: string;
  accessChannel: string;
  summary: string;
  howTheyHelp: string[];
  websiteUrl: string;
  privacyNote: string;
  relatedCategories: Array<'juridico' | 'psicologico' | 'saude' | 'cursos' | 'emergencia'>;
}

export const SUPPORT_NGOS: NgoItem[] = [
  {
    id: 'ngo-nova-mulher-sp-zn',
    name: 'ONG Nova Mulher — Centro Psicossocial (Zona Norte SP)',
    organization: 'ONG Nova Mulher · Vila Nova Cachoeirinha',
    featured: true,
    area: 'psicologico_juridico',
    areaLabel: 'Psicologia & Assistência Social',
    coverage: 'São Paulo - SP (Zona Norte · Cachoeirinha e região)',
    state: 'SP',
    city: 'São Paulo',
    accessChannel: 'Atendimento presencial e WhatsApp Psicossocial: (11) 98641-0956',
    summary: 'Atendimento psicossocial gratuito com psicólogas e assistentes sociais para mulheres na Zona Norte de São Paulo (Vila Nova Cachoeirinha, Horto, Mandaqui e Lauzane).',
    howTheyHelp: [
      'Acolhimento psicológico e escuta social gratuita para mulheres',
      'Orientação e encaminhamento para rede de proteção e direitos',
      'Oficinas de fortalecimento e geração de autonomia'
    ],
    websiteUrl: 'https://ongnovamulher.org',
    privacyNote: 'Rua Adolfo Kurt Bohem, 43 - Vila Nova Cachoeirinha, São Paulo - SP.',
    relatedCategories: ['psicologico', 'juridico', 'emergencia', 'cursos']
  },
  {
    id: 'ngo-fala-mulher-sp',
    name: 'Associação Fala Mulher',
    organization: 'Associação Fala Mulher · Rede de Proteção SP',
    featured: true,
    area: 'psicologico_juridico',
    areaLabel: 'Psicologia & Defesa da Mulher',
    coverage: 'São Paulo e Grande SP (Centros de Defesa da Mulher)',
    state: 'SP',
    city: 'São Paulo',
    accessChannel: 'Atendimento multidisciplinar gratuito e canais oficiais',
    summary: 'Organização que administra Centros de Defesa e de Convivência da Mulher (CDCM) com atendimento psicológico, serviço social e orientação jurídica gratuitos.',
    howTheyHelp: [
      'Acompanhamento psicológico individual e em grupo para mulheres',
      'Orientação jurídica sobre Lei Maria da Penha e direitos da família',
      'Apoio para reconstrução de projeto de vida e autonomia'
    ],
    websiteUrl: 'https://falamulher.ong.br',
    privacyNote: 'Atendimento gratuito e sigiloso sem exigir boletim de ocorrência.',
    relatedCategories: ['psicologico', 'juridico', 'emergencia']
  },
  {
    id: 'ngo-mapa-acolhimento',
    name: 'Mapa do Acolhimento',
    organization: 'Rede NOSSAS · Voluntárias em todo o Brasil',
    featured: true,
    area: 'psicologico_juridico',
    areaLabel: 'Psicologia & Jurídico',
    coverage: 'Todo o Brasil (Online e Presencial)',
    accessChannel: 'Cadastro rápido de acolhimento online',
    summary: 'Conecta gratuitamente mulheres que sofrem ou sofreram violência a uma rede com mais de 10 mil psicólogas e advogadas voluntárias.',
    howTheyHelp: [
      'Terapia psicológica gratuita e continuada',
      'Orientação e acompanhamento jurídico por advogadas',
      'Atendimento acolhedor e sem julgamentos'
    ],
    websiteUrl: 'https://www.mapadoacolhimento.org',
    privacyNote: 'Atendimento sigiloso conduzido exclusivamente por profissionais voluntárias verificadas.',
    relatedCategories: ['psicologico', 'juridico']
  },
  {
    id: 'ngo-justiceiras',
    name: 'Projeto Justiceiras',
    organization: 'Instituto Justiceiras & Instituto Bem Querer Mulher',
    featured: true,
    area: 'acolhimento_protecao',
    areaLabel: 'Acolhimento Multidisciplinar',
    coverage: 'Todo o Brasil (Atendimento Online)',
    accessChannel: 'WhatsApp Oficial e Formulário Web',
    summary: 'Equipe multidisciplinar voluntária que orienta mulheres em situação de violência nos aspectos jurídico, psicológico, médico e de assistência social.',
    howTheyHelp: [
      'Orientação para pedir Medidas Protetivas de Urgência',
      'Escuta psicológica e encaminhamento para rede médica',
      'Apoio social para reconstrução de autonomia'
    ],
    websiteUrl: 'https://justiceiras.org.br',
    privacyNote: 'Dica de segurança: se o seu celular for vigiado, prefira abrir pelo navegador anônimo ou apagar o histórico de mensagens depois.',
    relatedCategories: ['juridico', 'psicologico', 'emergencia', 'saude']
  },
  {
    id: 'ngo-casa-tina-martins-mg',
    name: 'Casa de Referência da Mulher Tina Martins (MG)',
    organization: 'Movimento de Mulheres Olga Benario · Rede Tina Martins',
    featured: true,
    area: 'acolhimento_protecao',
    areaLabel: 'Acolhimento, Proteção & Orientação (MG)',
    coverage: 'Minas Gerais (Sede em Belo Horizonte - MG e rede estadual)',
    state: 'MG',
    city: 'Belo Horizonte',
    accessChannel: 'Acolhimento presencial em MG e orientação gratuita pelos canais oficiais',
    summary: 'Casa de referência e acolhimento gerida por mulheres em Minas Gerais que oferece escuta, apoio psicológico, orientação jurídica e encaminhamento para proteção e autonomia de mulheres em situação de violência.',
    howTheyHelp: [
      'Acolhimento humanizado, escuta qualificada e orientação de proteção',
      'Encaminhamento para rede jurídica, psicológica e abrigamento em Minas Gerais',
      'Articulação com coletivos e movimentos de mulheres no interior e na capital'
    ],
    websiteUrl: 'https://casatinamartins.com',
    privacyNote: 'Espaço solidário e gratuito voltado à proteção e autonomia das mulheres em MG.',
    relatedCategories: ['emergencia', 'psicologico', 'juridico']
  },
  {
    id: 'ngo-mulheres-das-gerais-mg',
    name: 'Consórcio Mulheres das Gerais (MG)',
    organization: 'Rede de Organizações de Mulheres de Minas Gerais',
    featured: false,
    area: 'acolhimento_protecao',
    areaLabel: 'Direitos, Prevenção & Proteção (MG)',
    coverage: 'Minas Gerais (Interior e Capital · Rede Estadual)',
    state: 'MG',
    city: 'Todo o Estado de Minas Gerais',
    accessChannel: 'Articulação estadual e materiais gratuitos de orientação',
    summary: 'Consórcio de organizações e coletivos feministas de Minas Gerais focado no enfrentamento à violência contra a mulher, fortalecimento de redes no interior mineiro e orientação de acesso a direitos.',
    howTheyHelp: [
      'Conexão com coletivos e organizações de mulheres em diversas regiões de Minas Gerais',
      'Orientação gratuita sobre direitos, Lei Maria da Penha e serviços municipais',
      'Campanhas e ações de prevenção à violência doméstica e institucional'
    ],
    websiteUrl: 'https://mulheresdasgerais.com.br',
    privacyNote: 'Atuação em rede gratuita sem fins lucrativos em Minas Gerais.',
    relatedCategories: ['emergencia', 'psicologico', 'juridico']
  },
  {
    id: 'ngo-odara-ba',
    name: 'Odara — Instituto da Mulher Negra (Salvador e Chapada Diamantina)',
    organization: 'Instituto Odara · Rede de Mulheres na Bahia',
    featured: true,
    area: 'acolhimento_protecao',
    areaLabel: 'Direitos, Saúde & Acolhimento (BA)',
    coverage: 'Bahia (Salvador, Chapada Diamantina e interior baiano)',
    state: 'BA',
    city: 'Salvador e Chapada Diamantina',
    accessChannel: 'Projetos territoriais gratuitos e contato institucional pelo site',
    summary: 'Organização feminista baiana com atuação ativa em Salvador e no interior da Chapada Diamantina, promovendo saúde da mulher, justiça reprodutiva, enfrentamento à violência e redes de apoio comunitário.',
    howTheyHelp: [
      'Acolhimento, formação de redes comunitárias e orientação de direitos para mulheres na Bahia',
      'Atuação territorial em municípios da Chapada Diamantina e comunidades rurais',
      'Defesa da saúde integral, direitos sexuais, reprodutivos e combate à violência'
    ],
    websiteUrl: 'https://institutoodara.org.br',
    privacyNote: 'Atuação social sem fins lucrativos voltada ao fortalecimento de mulheres negras, periféricas e rurais.',
    relatedCategories: ['saude', 'psicologico', 'juridico', 'emergencia', 'cursos']
  },
  {
    id: 'ngo-mae-andresa-ma',
    name: 'Grupo de Mulheres Negras Mãe Andresa (São Luís - MA)',
    organization: 'GMNMA · ONG Feminista e Antirracista do Maranhão',
    featured: true,
    area: 'acolhimento_protecao',
    areaLabel: 'Acolhimento, Saúde & Direitos (MA)',
    coverage: 'São Luís - MA e Rede Estadual do Maranhão',
    state: 'MA',
    city: 'São Luís',
    accessChannel: 'Atendimento comunitário em São Luís e canais oficiais (@grupomaeandresa)',
    summary: 'Histórica organização de mulheres sediada em São Luís do Maranhão que atua no acolhimento comunitário, saúde integral da mulher, defesa de direitos, educação e enfrentamento às violências.',
    howTheyHelp: [
      'Acolhimento, escuta solidária e fortalecimento comunitário para mulheres em São Luís e no Maranhão',
      'Orientação gratuita sobre direitos, saúde integral e acesso à rede de proteção',
      'Articulação com a Rede de Mulheres Negras do Nordeste e projetos educativos gratuitos'
    ],
    websiteUrl: 'https://www.instagram.com/grupomaeandresa',
    privacyNote: 'Organização sem fins lucrativos atuante desde 1986 em defesa das mulheres no Maranhão.',
    relatedCategories: ['psicologico', 'saude', 'emergencia', 'juridico', 'cursos']
  },
  {
    id: 'ngo-tamojuntas',
    name: 'Organização TamoJuntas',
    organization: 'Coletivo Nacional TamoJuntas',
    featured: true,
    area: 'psicologico_juridico',
    areaLabel: 'Assessoria Jurídica & Social',
    coverage: 'Bahia, Nordeste e atendimento online em todo o Brasil',
    accessChannel: 'Solicitação gratuita pelo site',
    summary: 'Assessoria gratuita jurídica, psicológica e assistencial feita por mulheres, com atenção especial a mulheres negras, periféricas, interioranas e mães solo.',
    howTheyHelp: [
      'Acompanhamento jurídico em linguagem simples e acessível',
      'Acolhimento psicológico e rodas de apoio',
      'Orientação sobre direitos de família, pensão e guarda'
    ],
    websiteUrl: 'https://tamojuntas.org.br',
    privacyNote: 'Atuação focada em acolhimento interseccional sem termos técnicos complicados.',
    relatedCategories: ['juridico', 'psicologico', 'emergencia']
  },
  {
    id: 'ngo-americas-amigas',
    name: 'ONG Américas Amigas',
    organization: 'Américas Amigas · Saúde e Diagnóstico',
    featured: false,
    area: 'saude_parto',
    areaLabel: 'Exames Gratuitos de Mama',
    coverage: 'Todo o Brasil (Clínicas parceiras e carretas)',
    accessChannel: 'Solicitação de exame pelo site ou parceiros locais',
    summary: 'ONG que doa e realiza gratuitamente exames de mamografia, ultrassom de mama e biópsias para mulheres em situação de vulnerabilidade em todo o país.',
    howTheyHelp: [
      'Mamografias gratuitas sem fila em clínicas parceiras e unidades móveis',
      'Ultrassonografia mamária e biópsias sem custo',
      'Apoio e orientação rápida caso haja alteração no exame'
    ],
    websiteUrl: 'https://americasamigas.org.br',
    privacyNote: 'Atendimento gratuito custeado por doações para mulheres sem plano de saúde.',
    relatedCategories: ['saude']
  },
  {
    id: 'ngo-instituto-protea',
    name: 'Instituto Protea',
    organization: 'ONG Instituto Protea',
    featured: false,
    area: 'saude_parto',
    areaLabel: 'Exames & Tratamento Gratuito',
    coverage: 'São Paulo e redes parceiras',
    accessChannel: 'Encaminhamento direto via site da ONG',
    summary: 'Organização sem fins lucrativos que custeia gratuitamente consultas, exames de imagem, biópsias e tratamento de câncer de mama para mulheres de baixa renda.',
    howTheyHelp: [
      'Exames diagnósticos rápidos sem custo para a paciente',
      'Consultas com mastologistas e cirurgias custeadas pela ONG',
      'Acompanhamento humanizado durante todo o processo'
    ],
    websiteUrl: 'https://institutoprotea.org.br',
    privacyNote: 'Voltado a mulheres sem plano de saúde privado.',
    relatedCategories: ['saude']
  },
  {
    id: 'ngo-casa-angela',
    name: 'Casa Angela — Centro de Parto Humanizado',
    organization: 'Associação Comunitária Monte Azul (ONG)',
    featured: false,
    area: 'saude_parto',
    areaLabel: 'Parto Humanizado Gratuito',
    coverage: 'São Paulo - SP (Zona Sul · Atende via SUS e apoio social)',
    state: 'SP',
    city: 'São Paulo',
    accessChannel: 'Grupos de acolhimento gratuitos e agendamento presencial',
    summary: 'Casa de parto sem fins lucrativos que oferece pré-natal acolhedor, parto humanizado com enfermeiras obstetras, doulas e apoio no pós-parto gratuitamente.',
    howTheyHelp: [
      'Parto normal humanizado em ambiente acolhedor e respeitoso',
      'Consultas de pré-natal e grupos de preparação gratuitos',
      'Apoio à amamentação e cuidados com o recém-nascido'
    ],
    websiteUrl: 'https://casaangela.org.br',
    privacyNote: 'Atende gratuitamente gestantes de baixo risco encaminhadas ou por inscrição nos grupos abertos.',
    relatedCategories: ['saude']
  },
  {
    id: 'ngo-rede-feminina-cancer',
    name: 'Rede Feminina de Combate ao Câncer',
    organization: 'Federação Nacional das Redes Femininas',
    featured: false,
    area: 'saude_parto',
    areaLabel: 'Exames Preventivos & Acolhimento',
    coverage: 'Todo o Brasil (Núcleos estaduais e municipais)',
    accessChannel: 'Atendimento presencial nas sedes regionais',
    summary: 'Rede de ONGs presente em dezenas de cidades brasileiras que realiza exames preventivos (Papanicolau/colo do útero e mama) e acolhe mulheres gratuitamente.',
    howTheyHelp: [
      'Coleta gratuita de exame preventivo (Papanicolau)',
      'Encaminhamento rápido para mamografia e exames complementares',
      'Apoio emocional, perucas, cestas e assistência social'
    ],
    websiteUrl: 'https://redefemininanacional.org.br',
    privacyNote: 'Procure o núcleo da Rede Feminina da sua cidade para atendimento direto sem burocracia.',
    relatedCategories: ['saude']
  },
  {
    id: 'ngo-penhas-azmina',
    name: 'Instituto AzMina · Rede PenhaS',
    organization: 'Revista AzMina',
    featured: true,
    area: 'acolhimento_protecao',
    areaLabel: 'Informação, Prevenção & Proteção',
    coverage: 'Nacional (Aplicativo e Portal)',
    accessChannel: 'Plataforma digital e chat de apoio',
    summary: 'Iniciativa que oferece informação clara sobre relacionamentos abusivos, Lei Maria da Penha, rede de apoio entre mulheres e botão de alerta.',
    howTheyHelp: [
      'Conteúdo educativo para identificar violência psicológica e patrimonial',
      'Espaço seguro de diálogo anônimo e troca entre mulheres',
      'Mapeamento de delegacias e serviços públicos'
    ],
    websiteUrl: 'https://penhas.com.br',
    privacyNote: 'Conteúdos abertos para leitura imediata sem exigência de conta.',
    relatedCategories: ['emergencia', 'juridico']
  },
  {
    id: 'ngo-instituto-maria-da-penha',
    name: 'Instituto Maria da Penha (IMP)',
    organization: 'ONG Instituto Maria da Penha',
    featured: false,
    area: 'acolhimento_protecao',
    areaLabel: 'Direitos & Orientação',
    coverage: 'Nacional (Sede em Fortaleza e Recife)',
    accessChannel: 'Guias abertos e canais institucionais',
    summary: 'Organização fundada por Maria da Penha que disponibiliza guias gratuitos sobre os 5 tipos de violência, direitos garantidos por lei e caminhos de denúncia.',
    howTheyHelp: [
      'Explicação detalhada sobre como funciona a Lei Maria da Penha',
      'Orientação sobre violência física, psicológica, sexual, patrimonial e moral',
      'Articulação com redes municipais de proteção'
    ],
    websiteUrl: 'https://www.institutomariadapenha.org.br',
    privacyNote: 'Material informativo 100% aberto, sem cadastro e gratuito.',
    relatedCategories: ['juridico', 'emergencia']
  },
  {
    id: 'ngo-reprograma',
    name: '{reprograma}',
    organization: 'Iniciativa de Impacto Social em Tecnologia',
    featured: false,
    area: 'cursos_renda',
    areaLabel: 'Cursos Gratuitos em Tecnologia',
    coverage: 'Todo o Brasil (Turmas Online)',
    accessChannel: 'Editais gratuitos e conteúdos abertos',
    summary: 'Organização sem fins lucrativos que oferece bolsas 100% gratuitas de formação em programação e tecnologia para mulheres cis e trans em vulnerabilidade.',
    howTheyHelp: [
      'Cursos gratuitos de desenvolvimento web e lógica de programação',
      'Mentoria de carreira para conquistar trabalho remoto',
      'Foco em mulheres negras, trans e em transição de carreira'
    ],
    websiteUrl: 'https://reprograma.com.br',
    privacyNote: '100% gratuito com foco em autonomia financeira e empregabilidade.',
    relatedCategories: ['cursos']
  },
  {
    id: 'ngo-rme',
    name: 'Rede Mulher Empreendedora (Instituto RME)',
    organization: 'Instituto Rede Mulher Empreendedora',
    featured: true,
    area: 'cursos_renda',
    areaLabel: 'Autonomia Financeira, Negócios & IA',
    coverage: 'Todo o Brasil (Online · Programas Ela Pode, Ela Modo IA e núcleos regionais)',
    accessChannel: 'Capacitações e trilhas gratuitas no site oficial',
    summary: 'Principal rede brasileira de apoio ao empreendedorismo feminino, oferecendo cursos gratuitos de gestão, finanças pessoais, vendas e Inteligência Artificial aplicada a pequenos negócios (Ela Pode e Ela Modo IA).',
    howTheyHelp: [
      'Trilhas gratuitas de como começar um negócio do zero e formalizar MEI',
      'Capacitação gratuita em Inteligência Artificial e segurança digital (Ela Modo IA)',
      'Educação financeira e rede de mentoras para sair da dependência econômica'
    ],
    websiteUrl: 'https://rme.net.br',
    privacyNote: 'Programas gratuitos voltados para mulheres em vulnerabilidade socioeconômica.',
    relatedCategories: ['cursos']
  },
  {
    id: 'ngo-programaria',
    name: 'PrograMaria',
    organization: 'PrograMaria · Impacto Social em Tecnologia',
    featured: true,
    area: 'cursos_renda',
    areaLabel: 'Programação, Dados & Tecnologia',
    coverage: 'Todo o Brasil (Online) e eventos presenciais em São Paulo - SP',
    state: 'SP',
    city: 'São Paulo',
    accessChannel: 'Editais gratuitos de bolsas e eventos no site oficial',
    summary: 'Organização de impacto social que oferece bolsas de estudo 100% gratuitas e cursos de introdução à programação, desenvolvimento web, análise de dados e Inteligência Artificial para mulheres.',
    howTheyHelp: [
      'Bolsas integrais em programação web, front-end, back-end e ciência de dados',
      'Trilhas e workshops gratuitos de tecnologia e IA voltados a mulheres',
      'Comunidade nacional de apoio e conexão com oportunidades no setor de TI'
    ],
    websiteUrl: 'https://www.programaria.org',
    privacyNote: 'Programas e editais gratuitos voltados à inclusão e permanência de mulheres na tecnologia.',
    relatedCategories: ['cursos']
  },
  {
    id: 'ngo-ai-girls',
    name: 'AI Girls (IA Girls Brasil)',
    organization: 'Comunidade AI Girls BR',
    featured: true,
    area: 'cursos_renda',
    areaLabel: 'Inteligência Artificial & Ciência de Dados',
    coverage: 'Todo o Brasil (Online · Comunidade Nacional)',
    accessChannel: 'Workshops, meetups e grupos de estudo gratuitos',
    summary: 'Comunidade brasileira criada por mulheres para fortalecer o protagonismo feminino em Inteligência Artificial e Ciência de Dados com workshops práticos, mentorias e grupos gratuitos.',
    howTheyHelp: [
      'Workshops, meetups e grupos de estudo gratuitos em Inteligência Artificial',
      'Mentorias e apoio para mulheres iniciarem carreira em Ciência de Dados',
      'Materiais abertos e incentivo à participação feminina como palestrantes'
    ],
    websiteUrl: 'https://aigirlsbr.github.io',
    privacyNote: 'Iniciativa comunitária gratuita e sem fins lucrativos voltada a mulheres em IA.',
    relatedCategories: ['cursos']
  },
  {
    id: 'ngo-womakerscode',
    name: 'WoMakersCode (Mais Mulheres Tech)',
    organization: 'ONG WoMakersCode',
    featured: true,
    area: 'cursos_renda',
    areaLabel: 'Bootcamps, Cloud, Dados & IA',
    coverage: 'Todo o Brasil (Online e encontros presenciais em SP, RJ, MG, BA, PE, PR, RS e DF)',
    accessChannel: 'Plataforma Mais Mulheres Tech e bootcamps gratuitos',
    summary: 'Uma das maiores ONGs e comunidades da América Latina voltada à inclusão de mulheres na tecnologia, oferecendo bootcamps gratuitos em IA, Cloud, Dados, DevOps e programação.',
    howTheyHelp: [
      'Bootcamps 100% gratuitos em Inteligência Artificial, Cloud, Python e Dados',
      'Mentorias técnicas e preparação para certificações na plataforma Mais Mulheres Tech',
      'Capítulos e encontros presenciais e online em diversas capitais brasileiras'
    ],
    websiteUrl: 'https://womakerscode.org',
    privacyNote: 'Organização sem fins lucrativos com capacitações gratuitas por inscrição nos editais.',
    relatedCategories: ['cursos']
  },
  {
    id: 'ngo-tech-girls',
    name: 'Projeto Tech Girls',
    organization: 'ONG Tech Girls · Inclusão Digital',
    featured: true,
    area: 'cursos_renda',
    areaLabel: 'TI, Hardware & Inclusão Digital (PR, SC, SP)',
    coverage: 'Curitiba - PR (Presencial), Joinville - SC, São Paulo - SP e Online',
    state: 'PR',
    city: 'Curitiba',
    accessChannel: 'Turmas presenciais e inscrição gratuita pelo site oficial',
    summary: 'Projeto social criado em Curitiba que capacita mulheres em vulnerabilidade social em tecnologia, manutenção de hardware, software, empreendedorismo digital e reaproveitamento de lixo eletrônico.',
    howTheyHelp: [
      'Cursos presenciais gratuitos de TI, programação e manutenção de computadores',
      'Formação em empreendedorismo digital e economia circular com eletrônicos',
      'Apoio voltado a donas de casa e mulheres em transição de carreira'
    ],
    websiteUrl: 'https://techgirls.com.br',
    privacyNote: 'Projeto social sem fins lucrativos focado na autonomia digital e profissional de mulheres.',
    relatedCategories: ['cursos']
  },
  {
    id: 'ngo-minas-programam',
    name: 'Instituto Minas Programam',
    organization: 'Instituto Minas Programam',
    featured: false,
    area: 'cursos_renda',
    areaLabel: 'Programação para Mulheres Negras e Indígenas',
    coverage: 'Todo o Brasil (Online ao vivo e ações presenciais em São Paulo - SP)',
    state: 'SP',
    city: 'São Paulo',
    accessChannel: 'Editais gratuitos de formação pelo site oficial',
    summary: 'Instituto que combate desigualdades de gênero e raça na computação oferecendo cursos gratuitos de lógica de programação, HTML, CSS, JavaScript e fundamentos tech para mulheres negras e indígenas.',
    howTheyHelp: [
      'Cursos introdutórios gratuitos de programação com aulas ao vivo',
      'Trilhas de aprofundamento e rede acolhedora de apoio entre alunas',
      'Foco prioritário em mulheres negras, indígenas e em vulnerabilidade'
    ],
    websiteUrl: 'https://minasprogramam.com',
    privacyNote: 'Formação 100% gratuita sem exigência de conhecimento prévio em programação.',
    relatedCategories: ['cursos']
  },
  {
    id: 'ngo-pretalab',
    name: 'PretaLab (Olabi)',
    organization: 'Olabi · Iniciativa PretaLab',
    featured: false,
    area: 'cursos_renda',
    areaLabel: 'Tech, Dados & IA para Mulheres Negras e Indígenas',
    coverage: 'Todo o Brasil (Online · Sede no Rio de Janeiro - RJ)',
    state: 'RJ',
    city: 'Rio de Janeiro',
    accessChannel: 'Ciclos formativos gratuitos online pelo site',
    summary: 'Plataforma que conecta mulheres negras e indígenas ao mercado de tecnologia por meio de ciclos formativos gratuitos em programação, análise de dados (Python, SQL) e Inteligência Artificial.',
    howTheyHelp: [
      'Ciclos formativos gratuitos em front-end, programação, dados e IA',
      'Mentoria de soft skills, autogestão e preparação para entrevistas',
      'Conexão direta com vagas e redes de tecnologia e inovação'
    ],
    websiteUrl: 'https://www.pretalab.com',
    privacyNote: 'Iniciativa gratuita focada no protagonismo e empregabilidade de mulheres negras e indígenas.',
    relatedCategories: ['cursos']
  },
  {
    id: 'ngo-elas-programam',
    name: 'Elas Programam',
    organization: 'Comunidade Elas Programam',
    featured: false,
    area: 'cursos_renda',
    areaLabel: 'Bolsas Tech & Transição de Carreira',
    coverage: 'Todo o Brasil (Online)',
    accessChannel: 'Portal de bolsas e comunidade online gratuita',
    summary: 'Plataforma e comunidade feminina dedicada a conectar mulheres a bolsas integrais, bootcamps gratuitos de programação, Inteligência Artificial e oportunidades de carreira em tecnologia.',
    howTheyHelp: [
      'Divulgação e articulação de bolsas 100% gratuitas em tecnologia e IA',
      'Eventos online, mentorias de carreira e troca entre mulheres de todo o Brasil',
      'Apoio para ingresso inicial e transição de carreira para o setor digital'
    ],
    websiteUrl: 'https://www.elasprogramam.com.br',
    privacyNote: 'Acesso gratuito a conteúdos, comunidades e chamadas de bolsas.',
    relatedCategories: ['cursos']
  },
  {
    id: 'ngo-pyladies-brasil',
    name: 'PyLadies Brasil',
    organization: 'Comunidade PyLadies Brasil',
    featured: false,
    area: 'cursos_renda',
    areaLabel: 'Oficinas de Python (Presencial & Online)',
    coverage: 'Presencial em capitais (SP, RJ, MG, BA, PE, CE, PR, RS, DF, AM, PA) e Online',
    accessChannel: 'Capítulos regionais presenciais e eventos gratuitos',
    summary: 'Comunidade com capítulos ativos em dezenas de cidades brasileiras que realiza oficinas práticas gratuitas de programação Python, ciência de dados e mentoria em espaço seguro para mulheres.',
    howTheyHelp: [
      'Oficinas gratuitas de Python do nível iniciante ao intermediário',
      'Encontros presenciais em universidades e espaços comunitários pelo país',
      'Grupos de estudo acolhedores organizados por mulheres desenvolvedoras'
    ],
    websiteUrl: 'https://brasil.pyladies.com',
    privacyNote: 'Atividades gratuitas e abertas conduzidas por capítulos voluntários regionais.',
    relatedCategories: ['cursos']
  },
  {
    id: 'ngo-infopreta',
    name: 'InfoPreta',
    organization: 'InfoPreta · Tecnologia e Inclusão Digital',
    featured: false,
    area: 'cursos_renda',
    areaLabel: 'TI, Manutenção & Inclusão Digital (SP)',
    coverage: 'São Paulo - SP (Presencial e ações online)',
    state: 'SP',
    city: 'São Paulo',
    accessChannel: 'Oficinas sociais e projetos pelo site oficial',
    summary: 'Negócio de impacto social liderado por mulheres negras em São Paulo que realiza oficinas gratuitas de tecnologia, manutenção de computadores e inclusão digital com doação de equipamentos.',
    howTheyHelp: [
      'Oficinas de manutenção de computadores, hardware e suporte técnico',
      'Projetos de inclusão digital para mulheres negras e periféricas',
      'Orientação técnica para autonomia profissional na área de TI'
    ],
    websiteUrl: 'https://www.infopreta.com.br',
    privacyNote: 'Projetos sociais gratuitos em parceria com comunidades de São Paulo.',
    relatedCategories: ['cursos']
  },
  {
    id: 'ngo-cruzando-historias',
    name: 'Cruzando Histórias',
    organization: 'Associação Cruzando Histórias',
    featured: false,
    area: 'cursos_renda',
    areaLabel: 'Empregabilidade, Currículo & Acolhimento',
    coverage: 'Todo o Brasil (Online e presencial em São Paulo - SP)',
    state: 'SP',
    city: 'São Paulo',
    accessChannel: 'Inscrições gratuitas no programa Impulsione sua Carreira',
    summary: 'ONG dedicada à recolocação profissional e acolhimento de mulheres desempregadas ou em vulnerabilidade, com cursos gratuitos de currículo, LinkedIn, uso de IA para buscar vagas e apoio psicológico.',
    howTheyHelp: [
      'Programa gratuito Impulsione sua Carreira com oficinas práticas de emprego',
      'Preparação para entrevistas, montagem de currículo e LinkedIn sem custo',
      'Apoio psicológico gratuito e orientação de carreira (EscutAção)'
    ],
    websiteUrl: 'https://www.cruzandohistorias.org',
    privacyNote: 'Atendimento 100% gratuito focado em mulheres em busca de recolocação.',
    relatedCategories: ['cursos', 'psicologico']
  },
  {
    id: 'ngo-mulher-em-construcao',
    name: 'Instituto Mulher em Construção (IMEC)',
    organization: 'ONG Instituto Mulher em Construção',
    featured: false,
    area: 'cursos_renda',
    areaLabel: 'Ofícios & Construção Civil (RS Presencial)',
    coverage: 'Canoas, Porto Alegre - RS e ações itinerantes presenciais',
    state: 'RS',
    city: 'Canoas',
    accessChannel: 'Oficinas presenciais gratuitas e inscrição pelo site',
    summary: 'ONG gaúcha pioneira que capacita gratuitamente mulheres de baixa renda em oficinas presenciais de construção civil (elétrica, hidráulica, pintura e pequenos reparos) para geração rápida de renda.',
    howTheyHelp: [
      'Cursos presenciais gratuitos de hidráulica, elétrica, pintura e alvenaria',
      'Formação prática para trabalho autônomo e independência financeira',
      'Acompanhamento social e apoio à inserção profissional'
    ],
    websiteUrl: 'https://www.mulheremconstrucao.org.br',
    privacyNote: 'Oficinas gratuitas voltadas para mulheres em vulnerabilidade socioeconômica.',
    relatedCategories: ['cursos']
  },
  {
    id: 'ngo-instituto-dona-de-si',
    name: 'Instituto Dona de Si',
    organization: 'Instituto Dona de Si',
    featured: false,
    area: 'cursos_renda',
    areaLabel: 'Empreendedorismo & Aceleração (RJ e Online)',
    coverage: 'Rio de Janeiro - RJ (Presencial) e Todo o Brasil (Online)',
    state: 'RJ',
    city: 'Rio de Janeiro',
    accessChannel: 'Editais gratuitos de formação e aceleração no site',
    summary: 'Instituto fundado no Rio de Janeiro que promove capacitação gratuita em empreendedorismo feminino, gestão, vendas e aceleração de talentos para mulheres alcançarem autonomia financeira.',
    howTheyHelp: [
      'Jornadas gratuitas de capacitação e aceleração de negócios femininos',
      'Mentorias de autoconhecimento, vendas e planejamento financeiro',
      'Atividades presenciais no Rio de Janeiro e turmas online para todo o Brasil'
    ],
    websiteUrl: 'https://institutodonadesi.com.br',
    privacyNote: 'Programas gratuitos mantidos por parcerias sociais sem cobrança às participantes.',
    relatedCategories: ['cursos']
  },
  {
    id: 'ngo-alianca-empreendedora',
    name: 'Aliança Empreendedora',
    organization: 'Aliança Empreendedora · Negócios de Baixa Renda',
    featured: false,
    area: 'cursos_renda',
    areaLabel: 'Microempreendedorismo & Vendas (PR e Brasil)',
    coverage: 'Curitiba - PR (Sede Presencial) e Todo o Brasil (Online)',
    state: 'PR',
    city: 'Curitiba',
    accessChannel: 'Cursos gratuitos online e projetos presenciais locais',
    summary: 'Organização social com sede em Curitiba e atuação nacional que capacita gratuitamente microempreendedoras em vendas, precificação, finanças e formalização de pequenos negócios.',
    howTheyHelp: [
      'Cursos rápidos e gratuitos de gestão, vendas e precificação online',
      'Projetos presenciais em comunidades com parceiros regionais',
      'Trilhas voltadas a mulheres com negócios informais ou MEI'
    ],
    websiteUrl: 'https://aliancaempreendedora.org.br',
    privacyNote: 'Conteúdos e capacitações gratuitas voltadas à inclusão produtiva.',
    relatedCategories: ['cursos']
  },
  {
    id: 'ngo-humana-elas-maris-ba',
    name: 'Projeto Elas MARIS · Humana Brasil (BA)',
    organization: 'Humana Brasil · Desenvolvimento Social',
    featured: false,
    area: 'cursos_renda',
    areaLabel: 'Costura, Marketing Digital & Renda (BA Presencial)',
    coverage: 'Salvador e Lauro de Freitas - BA (Presencial)',
    state: 'BA',
    city: 'Salvador',
    accessChannel: 'Turmas presenciais comunitárias e contato pelo site',
    summary: 'Iniciativa social na Bahia com cursos presenciais gratuitos de corte e costura, marketing digital e gestão para impulsionar o empreendedorismo feminino em comunidades de Salvador e Lauro de Freitas.',
    howTheyHelp: [
      'Cursos presenciais gratuitos de corte, costura e economia criativa',
      'Oficinas de marketing digital e vendas para geração de renda local',
      'Fortalecimento de redes comunitárias femininas na Região Metropolitana de Salvador'
    ],
    websiteUrl: 'https://humanabrasil.org',
    privacyNote: 'Projeto social gratuito voltado a mulheres em vulnerabilidade social na Bahia.',
    relatedCategories: ['cursos']
  },
  {
    id: 'ngo-instituto-alianca-pe',
    name: 'Escola Social do Varejo · Instituto Aliança (PE)',
    organization: 'Instituto Aliança',
    featured: false,
    area: 'cursos_renda',
    areaLabel: 'Qualificação Profissional & Varejo (PE Presencial)',
    coverage: 'Recife - PE, Salvador - BA, Fortaleza - CE e São Paulo - SP (Presencial e Híbrido)',
    state: 'PE',
    city: 'Recife',
    accessChannel: 'Inscrições gratuitas e editais regionais pelo site',
    summary: 'Organização sem fins lucrativos com atuação destacada no Nordeste oferecendo qualificação profissional gratuita para o varejo, vendas, habilidades digitais e inserção no mercado de trabalho.',
    howTheyHelp: [
      'Formação presencial e híbrida gratuita voltada à empregabilidade',
      'Oficinas de atendimento, vendas, competências digitais e socioemocionais',
      'Ponte direta e gratuita com vagas em redes varejistas parceiras'
    ],
    websiteUrl: 'https://institutoalianca.org.br',
    privacyNote: 'Capacitação gratuita voltada à inclusão produtiva de mulheres e jovens.',
    relatedCategories: ['cursos']
  },
  {
    id: 'ngo-casa-marina-mg',
    name: 'Casa Marina · Instituto Marina e Flávio Guimarães (MG)',
    organization: 'Instituto Marina e Flávio Guimarães',
    featured: false,
    area: 'cursos_renda',
    areaLabel: 'Cultura Digital & Moda (MG Presencial)',
    coverage: 'Belo Horizonte - MG (Região Central · Presencial)',
    state: 'MG',
    city: 'Belo Horizonte',
    accessChannel: 'Inscrições presenciais gratuitas em Belo Horizonte',
    summary: 'Espaço social em Belo Horizonte com cursos práticos presenciais e gratuitos voltados a mulheres em vulnerabilidade social, abrangendo cultura digital, smartphone para negócios e design de moda.',
    howTheyHelp: [
      'Oficinas presenciais gratuitas de cultura digital e ferramentas de celular',
      'Cursos práticos de costura, design de moda e economia criativa',
      'Acolhimento presencial gratuito no centro de Belo Horizonte'
    ],
    websiteUrl: 'https://institutomfg.com.br',
    privacyNote: 'Atendimento presencial 100% gratuito focado em autonomia feminina em Minas Gerais.',
    relatedCategories: ['cursos']
  },
  {
    id: 'ngo-das-pretas-es',
    name: 'Instituto Das Pretas (ES e Online)',
    organization: 'Instituto Das Pretas · Tecnologia Social',
    featured: false,
    area: 'cursos_renda',
    areaLabel: 'Inovação Social & EAD (ES e Brasil)',
    coverage: 'Vitória - ES (Presencial) e EAD Online em todo o Brasil',
    state: 'ES',
    city: 'Vitória',
    accessChannel: 'Plataforma EAD e oficinas presenciais pelo site',
    summary: 'Organização capixaba afro-centrada de tecnologia social que oferece oficinas presenciais em Vitória e cursos gratuitos em plataforma própria para geração de renda e protagonismo de mulheres.',
    howTheyHelp: [
      'Plataforma gratuita de ensino à distância e capacitação produtiva',
      'Oficinas presenciais de inovação social e economia criativa no Espírito Santo',
      'Apoio ao fortalecimento econômico de mulheres negras e periféricas'
    ],
    websiteUrl: 'https://daspretas.com.br',
    privacyNote: 'Iniciativa sem fins lucrativos voltada à formação e inclusão produtiva.',
    relatedCategories: ['cursos']
  },
  {
    id: 'ngo-casa-preta-amazonia-pa',
    name: 'Casa Preta Amazônia (Belém - PA e Norte)',
    organization: 'Casa Preta Amazônia',
    featured: false,
    area: 'cursos_renda',
    areaLabel: 'Formação Digital & Renda (PA Presencial e Online)',
    coverage: 'Belém - PA (Presencial) e Plataforma Online na Amazônia e Brasil',
    state: 'PA',
    city: 'Belém',
    accessChannel: 'Oficinas presenciais em Belém e ambiente virtual de cursos',
    summary: 'Organização amazônida sediada em Belém do Pará que promove formações presenciais e cursos online gratuitos de protagonismo digital, cultura e geração de renda para mulheres negras e amazônidas.',
    howTheyHelp: [
      'Formações presenciais gratuitas em Belém e oficinas comunitárias',
      'Cursos gratuitos em plataforma online para autonomia digital e cultural',
      'Rede comunitária de fortalecimento feminino na Região Norte'
    ],
    websiteUrl: 'https://casapretaamazonia.org',
    privacyNote: 'Projeto social gratuito de base comunitária na Amazônia.',
    relatedCategories: ['cursos']
  }
];
