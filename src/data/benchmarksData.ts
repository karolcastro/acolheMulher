import { BenchmarkProject } from '../types';

export const BENCHMARK_PROJECTS: BenchmarkProject[] = [
  {
    id: 'mapa-acolhimento',
    name: 'Mapa do Acolhimento',
    organization: 'NOSSAS (Rede de Mobilização Democrática)',
    coverage: 'Nacional (Brasil)',
    type: 'ONG / Sociedade Civil',
    howItWorks: 'Conecta mulheres que sofreram violência a psicólogas e advogadas voluntárias dispostas a atendê-las gratuitamente. O atendimento é feito online ou presencial dependendo da localidade.',
    keyFeatures: [
      'Rede de mais de 10.000 profissionais voluntárias',
      'Atendimento psicológico e jurídico individualizado',
      'Plataforma web com triagem humanizada',
      'Gratuidade garantida'
    ],
    strengths: [
      'Fortíssimo ecossistema de voluntariado qualificado',
      'Reconhecimento internacional e grande impacto social',
      'Acompanhamento de ponta a ponta dos casos'
    ],
    limitationsInVulnerableContexts: [
      'Exige preenchimento de formulário inicial com relatos e dados de contato para a triagem',
      'Pode haver fila de espera para encontrar uma voluntária compatível',
      'Não é um mecanismo de busca instantânea geolocalizada de serviços públicos de porta aberta'
    ],
    websiteUrl: 'https://www.mapadoacolhimento.org',
    relevanceToYourProject: 'Inspiração no modelo de acolhimento humanizado, mas o seu projeto resolve a barreira de espera: entrega na hora o posto físico/telefone mais perto pelo CEP.'
  },
  {
    id: 'instituto-justiceiras',
    name: 'Projeto Justiceiras',
    organization: 'Instituto Justiceiras & Instituto Bem Querer Mulher',
    coverage: 'Nacional (Brasil)',
    type: 'ONG / Sociedade Civil',
    howItWorks: 'Rede multidisciplinar que atende mulheres vítimas de violência através do WhatsApp, oferecendo orientação jurídica, apoio psicológico e assistência social com voluntárias.',
    keyFeatures: [
      'Ponto focal via WhatsApp oficial',
      'Equipe multidisciplinar (Direito, Psicologia, Medicina, Serviço Social)',
      'Orientações sobre medidas protetivas e denúncia'
    ],
    strengths: [
      'Usa o WhatsApp, app que quase toda brasileira tem no celular',
      'Atendimento por mulheres para mulheres',
      'Forte presença em redes sociais e imprensa'
    ],
    limitationsInVulnerableContexts: [
      'Deixa registro de conversa no WhatsApp (risco altíssimo se o agressor vigia as mensagens da vítima)',
      'Demanda tempo para triagem e resposta de voluntárias',
      'Depende da mulher ter pacote de dados ativo'
    ],
    websiteUrl: 'https://justiceiras.org.br',
    relevanceToYourProject: 'Demonstra a força do atendimento sem julgamentos. Seu projeto complementa ao oferecer navegação anônima web sem deixar histórico no WhatsApp.'
  },
  {
    id: 'penhas',
    name: 'App PenhaS',
    organization: 'Revista AzMina',
    coverage: 'Nacional (Brasil)',
    type: 'Plataforma Digital',
    howItWorks: 'Aplicativo voltado para o enfrentamento da violência contra a mulher. Oferece mapa de acolhimento, informações sobre a Lei Maria da Penha, botão de pânico (alerta de emergência para contatos de confiança) e chat de suporte.',
    keyFeatures: [
      'Botão de alerta sonoro ou silencioso para rede de apoio',
      'Chat anônimo para tirar dúvidas e desabafar',
      'Mapa de serviços públicos e delegacias especializadas',
      'Artigos e conteúdos educativos sobre relacionamentos abusivos'
    ],
    strengths: [
      'Interface moderna pensada para sigilo',
      'Construído por comunicadoras e especialistas em gênero (AzMina)',
      'Foco em prevenção e conscientização'
    ],
    limitationsInVulnerableContexts: [
      'Exige download na Google Play / App Store (muitas mulheres não têm espaço na memória do aparelho ou o agressor audita apps instalados)',
      'Requer instalação e configuração prévia da rede de apoio'
    ],
    websiteUrl: 'https://penhas.com.br',
    relevanceToYourProject: 'Referência direta de aplicativo mobile no Brasil. Seu projeto avança ao usar a abordagem PWA (roda direto no navegador sem instalação obrigatória).'
  },
  {
    id: 'tamojuntas',
    name: 'TamoJuntas',
    organization: 'Organização Social TamoJuntas',
    coverage: 'Nacional (com foco em Salvador e Nordeste, expandido online)',
    type: 'Iniciativa Coletiva',
    howItWorks: 'Assessoria multidisciplinar gratuita (jurídica, psicológica e assistencial) exclusivamente para mulheres em situação de vulnerabilidade e violência de gênero.',
    keyFeatures: [
      'Foco prioritário em mulheres negras, periféricas e mães solo',
      'Advogadas que acompanham audiências e inquéritos',
      'Rodas de acolhimento e oficinas de empoderamento'
    ],
    strengths: [
      'Recorte interseccional forte (raça, classe e território)',
      'Atendimento humanizado sem jargão jurídico complicado',
      'Apoio real no pós-crise'
    ],
    limitationsInVulnerableContexts: [
      'Capacidade de atendimento limitada pela quantidade de profissionais voluntárias',
      'Não possui ferramenta de busca automatizada por CEP em tempo real'
    ],
    websiteUrl: 'https://tamojuntas.org.br',
    relevanceToYourProject: 'Excelente exemplo de linguagem inclusiva, sem tecnicismos e acolhedora para o seu projeto final.'
  },
  {
    id: 'chayn-global',
    name: 'Chayn (Plataforma Global)',
    organization: 'Chayn Open Source Collective (Reino Unido / Global)',
    coverage: 'Internacional (Mais de 15 países)',
    type: 'Plataforma Digital',
    howItWorks: 'Plataforma internacional sem fins lucrativos que desenvolve guias, ferramentas e serviços digitais abertos para sobreviventes de abusos e violência doméstica.',
    keyFeatures: [
      'Pioneira em "Trauma-Informed Tech" (design pensado para não retraumatizar)',
      'Zero cadastro: guias e ferramentas 100% abertas',
      'Botão Quick Exit em todas as páginas',
      'Instruções visuais para apagar histórico e navegar com segurança'
    ],
    strengths: [
      'Padrão ouro mundial em privacidade e segurança digital para mulheres',
      'Código aberto e design minimalista e respeitoso',
      'Foco em autonomia da usuária'
    ],
    limitationsInVulnerableContexts: [
      'Pouco conteúdo adaptado à realidade específica de municípios brasileiros (CEAM, DEAM, CRAS locais)'
    ],
    websiteUrl: 'https://chayn.co',
    relevanceToYourProject: 'A maior referência metodológica de "Trauma-Informed UX". Sua proposta traz essa mesma filosofia de segurança global para o território brasileiro.'
  },
  {
    id: 'sheltersafe-canada',
    name: 'ShelterSafe',
    organization: 'Women’s Shelters Canada',
    coverage: 'Canadá (Nacional)',
    type: 'Plataforma Digital',
    howItWorks: 'Mapa interativo nacional onde qualquer mulher pode digitar seu código postal (equivalente ao CEP) ou clicar em um mapa para encontrar o abrigo mais próximo com linha direta 24h.',
    keyFeatures: [
      'Busca direta por Código Postal / CEP sem nenhum login',
      'Botão de saída rápida com tecla ESC',
      'Filtro por tipo de abrigo e acessibilidade',
      'Linha telefônica 24/7 conectada a cada ponto'
    ],
    strengths: [
      'Prova real que o modelo "Apenas CEP sem cadastro" funciona com sucesso há mais de uma década',
      'Simplicidade radical: a usuária chega ao telefone e rota em menos de 10 segundos'
    ],
    limitationsInVulnerableContexts: [
      'Focado exclusivamente em abrigos (não inclui cursos, saúde reprodutiva e atendimento jurídico de rotina)'
    ],
    websiteUrl: 'https://sheltersafe.ca',
    relevanceToYourProject: 'Prova de conceito internacional idêntica à sua premissa: rapidez, anonimato e geolocalização por código postal.'
  }
];

export const GOV_ANALYSIS_POINTS = [
  {
    title: 'Fragmentação Federativa (O Labirinto das 3 Esferas)',
    description: 'Serviços de segurança (DEAM/Polícia) são estaduais; assistência social (CRAS/CREAS) e saúde básica (UBS) são municipais; benefícios e o Ligue 180 são federais. Cada um tem seu próprio portal, com endereços web diferentes, layouts confusos e nenhuma interoperabilidade.'
  },
  {
    title: 'A Barreira do Gov.br e Contas Nível Prata/Ouro',
    description: 'Muitos portais públicos exigem autenticação Gov.br com validação bancária ou biometria facial para liberar um simples agendamento. Para mulheres em vulnerabilidade extrema (sem conta em banco, sem pacote de internet ou sem acesso à própria documentação retida pelo agressor), isso representa uma porta fechada.'
  },
  {
    title: 'Risco Crítico de Rastreabilidade Digital',
    description: 'Se a mulher precisa logar com CPF ou deixar e-mail, essa notificação pode chegar no aparelho vigiado pelo parceiro agressor. Uma plataforma segura não pode exigir identificação prévia para entregar endereços e telefones de ajuda.'
  },
  {
    title: 'Linguagem Bucocrática vs. Linguagem de Acolhimento',
    description: 'Sites oficiais usam termos como "Peticionamento eletrônico", "Despacho na Vara Especial", "Inscrição no CadÚnico". Falta uma interface acolhedora, explicativa e em linguagem cidadã.'
  },
  {
    title: 'Desatualização de Telefones e Endereços Públicos',
    description: 'Planilhas em PDF escondidas em páginas municipais com telefones que não atendem. A centralização com curadoria comunitária é urgente.'
  }
];

export const PROJECT_PROMOTION_STRATEGY = [
  {
    pillar: '1. Parcerias de Distribuição Orgânica (Ganha-Ganha)',
    actions: [
      'Disponibilizar o "Widget AcolheMulher" para que ONGs, coletivos feministas, jornais locais e blogs coloquem a caixinha de busca de CEP em seus próprios sites.',
      'Oferecer a plataforma como ferramenta de apoio aos Centros Acadêmicos e Clínicas de Psicologia/Direito de Universidades.',
      'Apresentar em conferências municipais de políticas para mulheres e conselhos tutelares.'
    ]
  },
  {
    pillar: '2. Presença Física no Território ("Pontos Seguros")',
    actions: [
      'Adesivos e cartazes com QR Code em banheiros femininos de universidades, estações de trem/metrô, postos de saúde e farmácias (espaços onde o agressor não entra).',
      'Cartões de bolso discretos com tamanho de cartão de visita contendo apenas o link curto e um código de barras simulado (para não chamar atenção).'
    ]
  },
  {
    pillar: '3. Arquitetura PWA (Plataforma + App ao mesmo tempo)',
    actions: [
      'O site funciona perfeitamente no celular e permite "Adicionar à Tela de Início" como um app nativo.',
      'Vantagem crucial: não passa pela loja de aplicativos (não deixa histórico no Google Play do celular da família), pesa menos de 2 MB e funciona até mesmo em conexões 3G lentas.'
    ]
  },
  {
    pillar: '4. Campanha de Alimentação Colaborativa dos Dados',
    actions: [
      'Criar a funcionalidade "Sugerir um Serviço Gratuito" para que assistentes sociais, advogadas populares e psicólogas locais cadastrem iniciativas de seus bairros.',
      'Parceria com projetos de extensão universitária para manter a base verificada semestralmente.'
    ]
  }
];
