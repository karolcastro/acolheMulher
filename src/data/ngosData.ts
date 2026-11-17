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
    featured: false,
    area: 'cursos_renda',
    areaLabel: 'Autonomia Financeira & Negócios',
    coverage: 'Nacional (Online e núcleos regionais)',
    accessChannel: 'Capacitações e trilhas gratuitas no site',
    summary: 'Apoia mulheres a alcançarem independência financeira por meio de cursos gratuitos de empreendedorismo, finanças pessoais e geração de renda.',
    howTheyHelp: [
      'Trilhas gratuitas de como começar um negócio do zero',
      'Educação financeira para sair da dependência econômica',
      'Rede de apoio e conexão com outras empreendedoras'
    ],
    websiteUrl: 'https://irmesocial.org.br',
    privacyNote: 'Programas gratuitos voltados para mulheres em vulnerabilidade socioeconômica.',
    relatedCategories: ['cursos']
  }
];
