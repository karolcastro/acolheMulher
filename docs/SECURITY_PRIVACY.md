# Privacidade e segurança — AcolheMulher

## 1. Princípio de acesso sem cadastro

O fluxo principal de consulta do AcolheMulher não exige que a mulher crie conta, faça login ou informe nome, CPF, e-mail ou telefone pessoal para pesquisar serviços. A chave pública anon do Supabase é usada para operações permitidas pelas políticas RLS; ela não é uma identidade ou cadastro da usuária.

A área de parceiros tem operações distintas, como proposta de cadastro de uma ONG. Não confundir esse fluxo administrativo/de parceiro com o acesso da usuária final.

## 2. Dados e persistência

### Consultas e métricas

O módulo `src/utils/demandAnalytics.ts` envia eventos agregados ao Supabase quando configurado. A região é reduzida a UF e cidade, e o assunto/canal é categorizado. A implementação declara não enviar CEP completo, IP, coordenadas ou identificadores do navegador para as tabelas de demanda.

### Busca por voz

Antes do registro analítico, a transcrição é normalizada e os dígitos são removidos. A migration 006, contudo, mantém uma representação textual normalizada da fala em `fact_voice_searches.utterance_normalized`, além de intenção, categoria, região, canal e contadores. Portanto, a formulação correta é “transcrição normalizada sem dígitos/CEP”, não “nenhum texto da busca é armazenado”.

A transcrição por Gemini recebe áudio em Base64 no endpoint de servidor e encaminha esse conteúdo à API Gemini. O código inspecionado não grava o áudio em tabela própria. O tratamento e a retenção do lado do provedor seguem os termos e configurações do provedor, não sendo controlados pelo banco do projeto.

### Catálogo e organizações

O banco armazena informações de serviços e organizações parceiras, como nome da instituição, categoria, localização, canais de contato, descrição, situação e dados de verificação. Esses dados não são dados cadastrais da usuária final.

## 3. Segurança técnica implementada no repositório

- Chaves privadas não devem ser incluídas no bundle do frontend; a chave Gemini é lida no servidor.
- O cliente Supabase não persiste sessão de autenticação no navegador (`persistSession: false`).
- As migrations configuram RLS e policies por tabela; operações de analytics e cadastro de ONG usam RPCs específicas.
- O backend Python possui sanitização de entrada, rate limiter efêmero, cabeçalhos anti-cache, proteção SSRF e guarda de token para funções MCP/parceiro.
- O backend Python configura CORS por `ACOLHE_ALLOWED_ORIGIN`.
- O arquivo `vercel.json` define cabeçalhos como HSTS, `X-Content-Type-Options`, `Referrer-Policy` e `Permissions-Policy`.

Essas medidas no código não substituem revisão de configuração em produção, auditoria de RLS, proteção de segredos, observabilidade segura e testes de segurança.

## 4. Saída rápida e camuflagem: limites importantes

A saída rápida da interface limpa `localStorage` e `sessionStorage` da origem e navega para outra página. Ela não consegue garantir a remoção de:
- histórico e dados do navegador;
- registros de DNS, rede, operadora, proxy ou provedor;
- histórico sincronizado com outros dispositivos;
- capturas de tela, gravações ou monitoramento do dispositivo;
- registros de ferramentas de segurança ou do próprio sistema operacional.

O modo camuflagem altera o conteúdo exibido na interface; não elimina vestígios técnicos nem impede que alguém que monitore o dispositivo veja atividade anterior. Não descreva esses recursos como “apagamento de histórico” ou “anonimato absoluto”.

## 5. Funcionamento offline

O service worker utiliza Workbox para precache de arquivos do build e cache de fontes. O modal offline disponibiliza instruções e números essenciais. As consultas a ViaCEP, CNES, Gemini e Supabase precisam de conexão; não há garantia de que o catálogo dinâmico ou todas as informações locais estejam disponíveis sem internet.

## 6. Recomendações operacionais

1. Nunca publicar `GEMINI_API_KEY`, `service_role`, senha de banco ou token privado no frontend ou no Git.
2. Usar apenas chave pública anon no cliente e validar RLS/grants no projeto Supabase real.
3. Aplicar as migrations na ordem e testar as RPCs com permissões mínimas.
4. Revisar conteúdo e disponibilidade dos serviços periodicamente com as instituições responsáveis.
5. Não coletar dados sensíveis ou relatos detalhados de violência sem necessidade clara e governança adequada.
6. Explicar à usuária os limites da saída rápida, camuflagem, voz e uso offline.

Este documento descreve o comportamento encontrado no código versionado e não constitui certificação de segurança, garantia de sigilo absoluto ou parecer jurídico.
