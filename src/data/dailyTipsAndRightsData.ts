import type { AppSection } from '../types';

export interface DailyTipItem {
  id: string;
  categoryLabel: string;
  title: string;
  message: string;
  actionLabel?: string;
  actionSection?: AppSection;
}

export type WomenRightTheme =
  | 'todos'
  | 'protecao'
  | 'familia'
  | 'saude'
  | 'trabalho'
  | 'digital';

export interface WomenRightItem {
  id: string;
  theme: Exclude<WomenRightTheme, 'todos'>;
  themeLabel: string;
  question: string;
  plainAnswer: string;
  whatYouCanDo: string[];
  legalNote: string;
  relatedSection: AppSection;
  ctaLabel: string;
}

export const DAILY_TIPS: DailyTipItem[] = [
  {
    id: 'tip-prints-seguros',
    categoryLabel: 'Proteção & Provas',
    title: 'Guarde mensagens e fotos em um lugar que só você acessa',
    message:
      'Se alguém ameaça ou humilha você pelo celular, tire print mostrando a data e o número. Envie para um e-mail secundário seu ou para alguém da sua inteira confiança e apague do celular se tiver receio de vigília.',
    actionLabel: 'Entender seus direitos',
    actionSection: 'direitos',
  },
  {
    id: 'tip-atendimento-sem-doc',
    categoryLabel: 'Atendimento Público',
    title: 'Não deixe de pedir ajuda por estar sem documento na hora',
    message:
      'Em situação de emergência, nenhum posto de saúde, UPA, hospital do SUS ou delegacia pode recusar atendimento ou proteção porque você saiu às pressas sem RG ou cartão.',
    actionLabel: 'Ver Proteção 24h',
    actionSection: 'emergencia',
  },
  {
    id: 'tip-botao-sair',
    categoryLabel: 'Segurança Digital',
    title: 'Precisa fechar esta página rápido? Aperte ESC ou toque em "Sair"',
    message:
      'O botão vermelho "Sair" no topo da tela leva você direto para o Google e o AcolheMulher não guarda o seu CEP nem o que você pesquisou no aparelho.',
  },
  {
    id: 'tip-violencia-nao-e-so-fisica',
    categoryLabel: 'Informação que Protege',
    title: 'Controlar seu dinheiro ou esconder seus documentos também é violência',
    message:
      'A lei protege você não só contra agressão física, mas também contra xingamentos, ameaças, humilhações, perseguição e quem impede você de trabalhar, estudar ou mexer no próprio dinheiro.',
    actionLabel: 'Ler direitos sem complicação',
    actionSection: 'direitos',
  },
  {
    id: 'tip-escuta-gratuita',
    categoryLabel: 'Cuidado Emocional',
    title: 'Você não precisa dar conta de tudo sozinha hoje',
    message:
      'Conversar com alguém preparado ajuda a organizar as ideias. Você pode ligar grátis para o 188 (CVV) a qualquer hora ou buscar acolhimento gratuito no CAPS e nas ONGs de psicologia.',
    actionLabel: 'Buscar apoio psicológico',
    actionSection: 'psicologico',
  },
  {
    id: 'tip-acompanhante-sus',
    categoryLabel: 'Saúde da Mulher',
    title: 'Você tem direito a levar alguém com você em consultas e no parto',
    message:
      'Pela lei, toda mulher pode escolher um acompanhante maior de idade para estar ao lado dela em exames, consultas, pré-natal e durante todo o parto — tanto no SUS quanto em clínicas.',
    actionLabel: 'Ver Saúde & Parto',
    actionSection: 'saude',
  },
  {
    id: 'tip-autonomia-cursos',
    categoryLabel: 'Autonomia & Renda',
    title: 'Um curso gratuito pode ser o primeiro passo para sua independência',
    message:
      'Existem programas e ONGs que oferecem bolsas 100% gratuitas em tecnologia, vendas, gestão e costura para mulheres — muitos pelo celular e sem exigir experiência anterior.',
    actionLabel: 'Explorar Cursos Gratuitos',
    actionSection: 'cursos',
  },
];

export const RIGHT_THEME_TABS: { id: WomenRightTheme; label: string }[] = [
  { id: 'todos', label: 'Todos os direitos' },
  { id: 'protecao', label: 'Proteção & Casa' },
  { id: 'familia', label: 'Filhos & Dinheiro' },
  { id: 'saude', label: 'Saúde & Parto' },
  { id: 'trabalho', label: 'Trabalho & Renda' },
  { id: 'digital', label: 'Celular & Internet' },
];

export const WOMEN_RIGHTS_SIMPLE: WomenRightItem[] = [
  {
    id: 'right-medida-protetiva',
    theme: 'protecao',
    themeLabel: 'Proteção & Casa',
    question: 'Posso pedir para a Justiça manter o agressor longe de mim na hora?',
    plainAnswer:
      'Sim. A medida protetiva é uma ordem rápida da Justiça para obrigar o agressor a sair de casa, não se aproximar de você, dos seus filhos e do seu trabalho, e parar de mandar mensagens. Você não paga nada por isso e não precisa de advogado particular para pedir.',
    whatYouCanDo: [
      'Peça a medida protetiva diretamente na delegacia ao fazer o boletim de ocorrência (presencial ou Delegacia Online).',
      'Você também pode pedir ajuda gratuita na Defensoria Pública ou Casa da Mulher Brasileira.',
      'Se a pessoa descumprir a distância definida pelo juiz, ligue 190 na hora: descumprir medida protetiva é crime e dá prisão.',
    ],
    legalNote: 'Garantido pela Lei Maria da Penha (sem custo e sem precisar de processo anterior).',
    relatedSection: 'emergencia',
    ctaLabel: 'Ver delegacias e proteção 24h',
  },
  {
    id: 'right-sair-de-casa',
    theme: 'protecao',
    themeLabel: 'Proteção & Casa',
    question: 'Ele disse que se eu sair de casa eu perco tudo e os filhos. Isso é verdade?',
    plainAnswer:
      'Não é verdade. Sair de casa para proteger a sua vida ou a dos seus filhos nunca tira o seu direito sobre a casa, os móveis nem sobre a guarda das crianças. O juiz entende que você saiu por segurança, não por abandono.',
    whatYouCanDo: [
      'Se precisar sair às pressas, priorize sua segurança e a das crianças.',
      'Se puder, leve seus documentos e os das crianças (RG, CPF, certidão) e avise alguém de confiança para onde foi.',
      'Depois, procure a Defensoria Pública de graça para pedir a divisão de bens, a guarda ou até o retorno ao lar com o afastamento do agressor.',
    ],
    legalNote: 'Sair por risco ou violência não conta como abandono de lar nem tira guarda.',
    relatedSection: 'juridico',
    ctaLabel: 'Encontrar advogada gratuita',
  },
  {
    id: 'right-delegacia-sem-deam',
    theme: 'protecao',
    themeLabel: 'Proteção & Casa',
    question: 'Na minha cidade não tem Delegacia da Mulher. Posso denunciar mesmo assim?',
    plainAnswer:
      'Sim. Qualquer delegacia comum da Polícia Civil tem obrigação de atender você, registrar a ocorrência e pedir a medida protetiva ao juiz. Você também tem direito de ser atendida em um local reservado, sem ser exposta ou julgada.',
    whatYouCanDo: [
      'Procure a delegacia mais próxima ou faça o registro pela Delegacia Virtual do seu estado.',
      'Se sofrer mau atendimento ou alguém disser para você "voltar outro dia", ligue 180 para denunciar o mau atendimento e peça apoio à Defensoria.',
    ],
    legalNote: 'Atendimento obrigatório em todas as delegacias do Brasil, com sala reservada sempre que possível.',
    relatedSection: 'emergencia',
    ctaLabel: 'Localizar atendimento na minha região',
  },
  {
    id: 'right-pensao-guarda',
    theme: 'familia',
    themeLabel: 'Filhos & Dinheiro',
    question: 'Não tenho dinheiro para pagar advogada. Como peço pensão, guarda ou divórcio?',
    plainAnswer:
      'Você tem direito a uma advogada ou defensora pública 100% de graça pela Defensoria Pública do seu estado (ou núcleos de faculdades de Direito). Ela faz tudo na Justiça: pedido de pensão para os filhos, guarda, visitas e divórcio.',
    whatYouCanDo: [
      'Procure a Defensoria Pública pelo CEP aqui no site (muitos estados atendem pelo WhatsApp ou online).',
      'Não é preciso estar separada no papel há muito tempo para pedir pensão para as crianças.',
      'Guarde comprovantes simples de gastos com filhos (escola, mercado, remédio) se tiver, mas não deixe de ir por falta de papéis.',
    ],
    legalNote: 'Assistência jurídica integral e gratuita para quem não tem condições de pagar.',
    relatedSection: 'juridico',
    ctaLabel: 'Ver Defensoria Pública grátis',
  },
  {
    id: 'right-controle-dinheiro',
    theme: 'familia',
    themeLabel: 'Filhos & Dinheiro',
    question: 'Ele esconde meus documentos, fica com meu cartão ou quebra minhas coisas. Isso é crime?',
    plainAnswer:
      'Sim. Controlar o seu dinheiro, proibir você de trabalhar, esconder seus documentos, apagar dados do seu trabalho ou quebrar seus objetos é violência patrimonial. Mesmo sem marcas no corpo, você tem direito à proteção da lei.',
    whatYouCanDo: [
      'Você pode registrar boletim de ocorrência e pedir a devolução imediata dos seus documentos e bens pela Justiça.',
      'Se precisar tirar segunda via de documentos de graça, procure o CRAS da sua cidade.',
      'Conheça também os cursos e bolsas gratuitos para conquistar sua própria fonte de renda.',
    ],
    legalNote: 'Violência patrimonial e psicológica são previstas na Lei Maria da Penha.',
    relatedSection: 'cursos',
    ctaLabel: 'Ver cursos gratuitos e renda',
  },
  {
    id: 'right-acompanhante-sus',
    theme: 'saude',
    themeLabel: 'Saúde & Parto',
    question: 'O hospital ou posto pode me proibir de entrar com acompanhante no parto ou exame?',
    plainAnswer:
      'Não pode. Toda mulher tem direito garantido por lei de escolher uma pessoa maior de idade (mãe, amiga, companheiro, irmã ou doula) para ficar com ela durante todo o pré-natal, trabalho de parto, parto, pós-parto, além de consultas e exames que exijam sedação ou intimidade.',
    whatYouCanDo: [
      'Informe na recepção quem você escolheu como acompanhante — não precisa ser marido nem parente de sangue.',
      'Em exames ou consultas ginecológicas, você tem direito a acompanhante ou a uma profissional de saúde mulher junto na sala.',
      'Se o hospital recusar sem motivo médico grave, ligue grátis para a Ouvidoria do SUS no 136 ou para a Defensoria.',
    ],
    legalNote: 'Garantido pela Lei do Acompanhante e atualizações válidas para SUS e rede particular.',
    relatedSection: 'saude',
    ctaLabel: 'Ver Saúde da Mulher e Parto',
  },
  {
    id: 'right-saude-violencia-sigilo',
    theme: 'saude',
    themeLabel: 'Saúde & Parto',
    question: 'Se eu for ao posto de saúde ou hospital por causa de agressão, sou obrigada a fazer boletim antes?',
    plainAnswer:
      'Não. Você recebe atendimento médico, curativos, exames, remédios de emergência e acolhimento psicológico na hora pelo SUS, sem precisar passar primeiro na delegacia. Em casos de violência sexual, o atendimento é urgente e sigiloso.',
    whatYouCanDo: [
      'Vá à UBS, UPA ou hospital público mais próximo e diga que precisa de acolhimento — o atendimento é gratuito.',
      'Você pode pedir encaminhamento para psicóloga e assistente social da própria rede pública.',
    ],
    legalNote: 'Atendimento integral de saúde garantido antes mesmo de qualquer registro policial.',
    relatedSection: 'saude',
    ctaLabel: 'Encontrar UBS e hospitais próximos',
  },
  {
    id: 'right-trabalho-estabilidade',
    theme: 'trabalho',
    themeLabel: 'Trabalho & Renda',
    question: 'Posso perder o emprego se precisar me afastar por violência doméstica ou por estar grávida?',
    plainAnswer:
      'A lei protege seu emprego nas duas situações. Quem está grávida com carteira assinada não pode ser demitida sem justa causa desde o início da gravidez até 5 meses após o bebê nascer. E quem sofre violência doméstica pode conseguir afastamento do trabalho por até 6 meses mantendo o vínculo.',
    whatYouCanDo: [
      'Se sofrer violência doméstica e precisar mudar de cidade ou se afastar para ficar segura, fale com a Defensoria para pedir ao juiz a proteção do seu emprego.',
      'Se for demitida grávida sem justa causa, procure o Ministério do Trabalho ou a Defensoria Pública gratuita para exigir seus direitos.',
    ],
    legalNote: 'Manutenção do emprego por até 6 meses na Lei Maria da Penha e estabilidade da gestante.',
    relatedSection: 'juridico',
    ctaLabel: 'Buscar orientação jurídica gratuita',
  },
  {
    id: 'right-internet-fotos-perseguicao',
    theme: 'digital',
    themeLabel: 'Celular & Internet',
    question: 'Estão me perseguindo pelo celular ou ameaçando vazar fotos íntimas. O que a lei garante?',
    plainAnswer:
      'Mandar mensagens sem parar, vigiar suas redes sociais, instalar rastreador no seu celular ou ameaçar/divulgar fotos e vídeos íntimos sem sua autorização é crime no Brasil — mesmo quando a pessoa foi seu namorado ou marido e mesmo que você tenha enviado a foto antes.',
    whatYouCanDo: [
      'Não pague nem ceda a chantagens. Guarde prints da conversa, do perfil e do link onde a imagem apareceu.',
      'Registre boletim de ocorrência (muitos estados têm Delegacia de Crimes Cibernéticos ou Delegacia da Mulher online).',
      'Você também pode pedir gratuitamente pela Defensoria a remoção urgente das imagens da internet.',
    ],
    legalNote: 'Divulgação sem consentimento e perseguição (stalking) são crimes previstos no Código Penal.',
    relatedSection: 'emergencia',
    ctaLabel: 'Ver canais de proteção 24h',
  },
];

export function getDailyTipIndex(date: Date = new Date()): number {
  const startOfYear = new Date(date.getFullYear(), 0, 0);
  const diffMs = date.getTime() - startOfYear.getTime();
  const dayOfYear = Math.floor(diffMs / 86_400_000);
  return ((dayOfYear % DAILY_TIPS.length) + DAILY_TIPS.length) % DAILY_TIPS.length;
}
