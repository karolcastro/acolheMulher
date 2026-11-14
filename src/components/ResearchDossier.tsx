import React, { useState } from 'react';
import { BENCHMARK_PROJECTS, GOV_ANALYSIS_POINTS, PROJECT_PROMOTION_STRATEGY } from '../data/benchmarksData';
import { ExternalLink, Check, Copy, FileText, Target, Shield, BookOpen, Lightbulb, Users, HelpCircle } from 'lucide-react';

export const ResearchDossier: React.FC = () => {
  const [subTab, setSubTab] = useState<'benchmarks' | 'governo' | 'promocao' | 'roteiro'>('benchmarks');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const academicSummaryText = `
PROJETO FINAL DE CURSO: PLATAFORMA "ACOLHE MULHER"
TEMA: Democratização do acesso à rede de proteção e capacitação feminina via geolocalização por CEP e design livre de fricção e vigilância.

1. PROBLEMA DE PESQUISA:
A fragmentação federativa das políticas públicas no Brasil (onde delegacias são estaduais, CRAS/CREAS são municipais e o Ligue 180 é federal) aliada à imposição de logins governamentais (Gov.br) e formulários extensos cria uma barreira intransponível para mulheres em vulnerabilidade social ou doméstica. Muitas dividem celulares com o agressor, não lembram senhas ou receiam deixar rastros digitais.

2. JUSTIFICATIVA E INOVAÇÃO SOCIAL:
Diferente dos portais institucionais que exigem cadastramento e navegação complexa, o projeto propõe um modelo radicalmente simples e seguro:
- Zero Cadastro: Nenhuma coleta de CPF, e-mail, senha ou nome.
- Geolocalização Apenas por CEP: A usuária descobre em menos de 10 segundos os equipamentos públicos e ONGs no seu raio territorial.
- Padrão Trauma-Informed Tech: Botão de saída rápida (Quick Exit), tela de camuflagem e navegação não rastreável.
- Modelo Híbrido Web + PWA: Roda direto no navegador e pode ser instalado sem deixar rastro de download em lojas de apps.
- Widget Open-Source Embutível: Qualquer ONG ou portal de notícias pode colar o buscador de serviços no seu site com uma linha de código.

3. BENCHMARKS ANALISADOS:
- Nacionais: Mapa do Acolhimento, Instituto Justiceiras, App PenhaS (AzMina), TamoJuntas.
- Internacionais: Chayn (UK/Global - pioneira em Trauma-Informed Tech) e ShelterSafe (Canadá - pioneira em busca por código postal).

4. DIFERENCIAIS COMPETITIVOS:
- Imediatismo: sem fila de triagem para obter endereços e telefones de porta aberta.
- Interoperabilidade: unificação dos serviços da União, Estados e Municípios em uma interface única.
- Ecossistema Distribuído: o widget permite que a plataforma esteja presente em centenas de ONGs simultaneamente.
  `.trim();

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(id);
    setTimeout(() => setCopiedSection(null), 2500);
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      
      {/* Clean Header */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-rose-700 text-xs font-bold uppercase tracking-wider mb-1">
              <FileText className="w-3.5 h-3.5" />
              <span>Material para Trabalho Acadêmico & TCC</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 leading-tight">
              Pesquisa, Benchmarks & Justificativa do Projeto
            </h1>
          </div>

          <button
            onClick={() => handleCopy(academicSummaryText, 'academic-summary')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl transition-all shadow-xs shrink-0"
          >
            {copiedSection === 'academic-summary' ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar Resumo ABNT</span>
              </>
            )}
          </button>
        </div>

        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-3xl">
          Use estas 4 seções para responder às perguntas da sua banca sobre projetos já existentes, as falhas dos portais públicos e como promover o projeto no mercado social.
        </p>

        {/* Clean Sub-tabs */}
        <div className="flex items-center gap-1.5 pt-2 border-t border-stone-100 overflow-x-auto scrollbar-none">
          <button
            onClick={() => setSubTab('benchmarks')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              subTab === 'benchmarks'
                ? 'bg-rose-50 text-rose-800 font-bold border border-rose-200'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            1. Projetos Reais (Benchmarks)
          </button>

          <button
            onClick={() => setSubTab('governo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              subTab === 'governo'
                ? 'bg-rose-50 text-rose-800 font-bold border border-rose-200'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            2. Por que o Governo Falha?
          </button>

          <button
            onClick={() => setSubTab('promocao')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              subTab === 'promocao'
                ? 'bg-rose-50 text-rose-800 font-bold border border-rose-200'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            3. Como Promover e Divulgar
          </button>

          <button
            onClick={() => setSubTab('roteiro')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all shrink-0 ${
              subTab === 'roteiro'
                ? 'bg-rose-50 text-rose-800 font-bold border border-rose-200'
                : 'text-stone-600 hover:bg-stone-100'
            }`}
          >
            4. Roteiro de Defesa (Pitch)
          </button>
        </div>
      </div>

      {/* Sub-tab 1: Benchmarks */}
      {subTab === 'benchmarks' && (
        <div className="space-y-4">
          <div className="text-xs text-stone-600 font-medium">
            Mapeamento dos 6 principais projetos brasileiros e internacionais com links oficiais:
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BENCHMARK_PROJECTS.map((proj) => (
              <div
                key={proj.id}
                className="bg-white rounded-xl border border-stone-200 p-5 shadow-xs space-y-3 flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-100 uppercase">
                      {proj.coverage}
                    </span>
                    <span className="text-stone-600">{proj.type}</span>
                  </div>

                  <h3 className="text-base font-bold text-stone-900 leading-snug">
                    {proj.name}
                  </h3>
                  <div className="text-[11px] text-stone-700">{proj.organization}</div>

                  <p className="text-xs text-stone-600 leading-relaxed">
                    {proj.howItWorks}
                  </p>

                  <div className="text-xs bg-rose-50/70 p-2.5 rounded-lg border border-rose-100 text-rose-950 leading-relaxed">
                    <strong>Seu diferencial:</strong> {proj.relevanceToYourProject}
                  </div>
                </div>

                <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs">
                  <span className="text-stone-600 font-mono text-[11px]">Fonte Oficial</span>
                  <a
                    href={proj.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-semibold text-rose-700 hover:underline"
                  >
                    <span>Abrir site</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-tab 2: Government Failure Diagnostics */}
      {subTab === 'governo' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8 shadow-xs space-y-4">
          <h2 className="text-lg font-bold text-stone-900">
            Diagnóstico: As 5 barreiras dos portais governamentais
          </h2>
          <p className="text-xs text-stone-600">
            Argumentos para comprovar à banca por que a criação desta plataforma é socialmente indispensável:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {GOV_ANALYSIS_POINTS.map((point, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-1.5">
                <div className="text-xs font-bold text-stone-800 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-stone-200 text-stone-700 flex items-center justify-center text-[10px]">
                    0{idx + 1}
                  </span>
                  <span>{point.title}</span>
                </div>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {point.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-tab 3: Promotion & Marketing */}
      {subTab === 'promocao' && (
        <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8 shadow-xs space-y-4">
          <h2 className="text-lg font-bold text-stone-900">
            Como promover e levar a plataforma até as mulheres?
          </h2>
          <p className="text-xs text-stone-600">
            Estratégias de baixo custo e alta eficiência no território brasileiro:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            {PROJECT_PROMOTION_STRATEGY.map((strat, idx) => (
              <div key={idx} className="p-5 rounded-xl bg-stone-50 border border-stone-200 space-y-2">
                <h3 className="font-bold text-stone-900 text-xs flex items-center gap-2">
                  <Target className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{strat.pillar}</span>
                </h3>
                <ul className="space-y-1.5 text-xs text-stone-600">
                  {strat.actions.map((act, aIdx) => (
                    <li key={aIdx} className="flex items-start gap-1.5 leading-relaxed">
                      <span className="text-rose-600 font-bold">•</span>
                      <span>{act}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-tab 4: Pitch Defense */}
      {subTab === 'roteiro' && (
        <div className="bg-stone-900 text-white rounded-2xl p-6 md:p-8 shadow-md space-y-6">
          <div>
            <div className="text-xs font-bold text-rose-300 uppercase tracking-wider mb-1">
              Roteiro para a Apresentação Oral
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-white">
              Os 4 Pontos para Encantar a Banca do seu Curso
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-stone-800 border border-stone-700 space-y-1.5">
              <div className="font-bold text-rose-300 text-xs">1. Barreira Zero de Entrada</div>
              <p className="text-xs text-stone-300 leading-relaxed">
                Nenhum login com Gov.br, CPF ou senha. A mulher descobre o posto mais próximo em menos de 10 segundos apenas digitando o CEP.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-800 border border-stone-700 space-y-1.5">
              <div className="font-bold text-rose-300 text-xs">2. Trauma-Informed Tech & Segurança</div>
              <p className="text-xs text-stone-300 leading-relaxed">
                Design seguro que protege mulheres sob vigilância doméstica: botão Sair Rápido (ESC) e tela de camuflagem de culinária.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-800 border border-stone-700 space-y-1.5">
              <div className="font-bold text-rose-300 text-xs">3. Unificação Federativa</div>
              <p className="text-xs text-stone-300 leading-relaxed">
                União (180), Estado (DEAM/Defensoria) e Município (CRAS/UBS) reunidos sem burocracia ou termos técnicos complicados.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-stone-800 border border-stone-700 space-y-1.5">
              <div className="font-bold text-rose-300 text-xs">4. Inovação Social com Widget para ONGs</div>
              <p className="text-xs text-stone-300 leading-relaxed">
                Distribuição viral: qualquer ONG ou blog pode embutir o buscador com 1 linha de código, multiplicando o alcance sem custo.
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
