import React, { useState, useEffect, useCallback } from 'react';
import { useCatalog } from '../context/CatalogContext';
import { fetchRecentDemandStats, type DemandStatRow } from '../utils/demandAnalytics';
import { Github, ExternalLink, Download, GitPullRequest, Code, Check, Sparkles, Layers, ShieldCheck, Database, BarChart3, RefreshCw, MapPin } from 'lucide-react';

export const GitHubIntegrationView: React.FC = () => {
  const { nationalServices, regionalServices, ngos, isLiveConnected, isSupabaseConfigured } = useCatalog();
  const [repoData, setRepoData] = useState<any>(null);
  const [copiedTemplate, setCopiedTemplate] = useState(false);
  const [demandStats, setDemandStats] = useState<DemandStatRow[]>([]);
  const [demandError, setDemandError] = useState<string | null>(null);
  const [loadingDemand, setLoadingDemand] = useState(false);

  const loadDemandStats = useCallback(async () => {
    if (!isSupabaseConfigured) return;
    setLoadingDemand(true);
    const { rows, error } = await fetchRecentDemandStats(18);
    setDemandStats(rows);
    setDemandError(error);
    setLoadingDemand(false);
  }, [isSupabaseConfigured]);

  useEffect(() => {
    void loadDemandStats();
  }, [loadDemandStats]);

  useEffect(() => {
    const fetchRepo = async () => {
      try {
        const res = await fetch('https://api.github.com/repos/karolcastro/acolheMulher');
        if (res.ok) {
          const data = await res.json();
          setRepoData(data);
        }
      } catch (err) {
        console.error('Erro ao conectar ao GitHub:', err);
      }
    };
    fetchRepo();
  }, []);

  const handleDownloadJSON = () => {
    const fullDatabase = {
      projeto: 'AcolheMulher',
      autora: 'Karol Castro',
      repositorio: 'https://github.com/karolcastro/acolheMulher',
      versao: '1.0.0',
      data_exportacao: new Date().toISOString(),
      total_servicos: nationalServices.length + regionalServices.length,
      total_ongs: ngos.length,
      servicos_nacionais: nationalServices,
      servicos_regionais: regionalServices,
      ongs: ngos
    };

    const blob = new Blob([JSON.stringify(fullDatabase, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'acolhemulher_base_servicos_gratuitos.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const contributionTemplate = `### [Novo Serviço Gratuito] Cadastro de Equipamento

**Nome do Serviço / Posto:** 
**Categoria:** [Jurídico / Psicológico / Saúde / Cursos / Emergência]
**Subcategoria:** (Ex: Delegacia da Mulher, Clínica Escola de Psicologia, UBS)
**UF:** 
**Cidade:** 
**Bairro:** 
**Endereço Completo:** 
**CEP:** 
**Telefone:** 
**WhatsApp:** 
**Horário de Funcionamento:** 
**Exige agendamento prévio ou livre demanda?** 
**Confirmação de Gratuidade:** 
**Dica de Segurança ou Acolhimento:** 
`;

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(contributionTemplate);
    setCopiedTemplate(true);
    setTimeout(() => setCopiedTemplate(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">

      {/* Top Banner / GitHub Identity */}
      <div className="bg-gradient-to-br from-[#0F172A] via-[#2E1065] to-[#500724] text-white rounded-3xl p-6 md:p-10 space-y-6 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-white/15">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white text-slate-950 flex items-center justify-center shrink-0">
              <Github className="w-8 h-8" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-pink-300 font-medium">
                <span>Projeto Aberto no GitHub</span>
                <span className="text-white/30" aria-hidden="true">·</span>
                <span>Formação {`{reprograma}`}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-display font-bold text-white mt-0.5">
                acolheMulher
              </h1>
              <div className="text-xs text-slate-300 font-mono mt-1">
                github.com/karolcastro/acolheMulher
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/karolcastro/acolheMulher"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm whitespace-nowrap"
            >
              <Github className="w-4 h-4 shrink-0" />
              <span>Ver Repositório Oficial</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>
          </div>
        </div>

        {/* Live Repository Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-white/10 p-4 rounded-2xl border border-white/15 space-y-1 backdrop-blur-sm">
            <span className="text-slate-300 text-[11px] block">Autora & Desenvolvedora</span>
            <div className="font-bold text-white text-sm flex items-center gap-2">
              <img
                src={repoData?.owner?.avatar_url || 'https://avatars.githubusercontent.com/u/49079797?v=4'}
                alt="Karol Castro"
                referrerPolicy="no-referrer"
                className="w-5 h-5 rounded-full"
              />
              <span>Karol Castro</span>
            </div>
            <a
              href="https://github.com/karolcastro"
              target="_blank"
              rel="noopener noreferrer"
              className="text-pink-300 hover:underline text-[11px] block"
            >
              @karolcastro no GitHub
            </a>
          </div>

          <div className="bg-white/10 p-4 rounded-2xl border border-white/15 space-y-1 backdrop-blur-sm">
            <span className="text-slate-300 text-[11px] block">Licença & Modelo de Acesso</span>
            <div className="font-bold text-pink-300 text-sm">Código Aberto (Open Source)</div>
            <span className="text-slate-200 text-[11px] block">Livre de fins lucrativos · Acesso por CEP</span>
          </div>

          <div className="bg-white/10 p-4 rounded-2xl border border-white/15 space-y-1 backdrop-blur-sm">
            <span className="text-slate-300 text-[11px] block">Arquitetura Integrada</span>
            <div className="font-bold text-blue-300 text-sm">React 19 + TypeScript + PWA</div>
            <span className="text-slate-200 text-[11px] block">Widget iFrame + API ViaCEP</span>
          </div>
        </div>
      </div>

      {/* Open Data & Community Contribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-pink-50 text-pink-700 flex items-center justify-center font-bold">
              <Download className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-display font-bold text-slate-900">
              Download da Base Aberta (JSON)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Disponibilizamos todos os dados públicos e verificados de postos de saúde, DEAMs, Defensorias e cursos gratuitos para que outras pesquisadoras e desenvolvedoras possam utilizar livremente.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 font-mono">
              {nationalServices.length + regionalServices.length} serviços · {ngos.length} ONGs
            </span>
            <button
              type="button"
              onClick={handleDownloadJSON}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-blue-900 hover:bg-blue-950 text-white rounded-xl transition-colors whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>Baixar Dados (.json)</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-display font-bold text-slate-900">
              Sugerir Novo Serviço no GitHub
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Trabalha em um CRAS, faculdade ou ONG e quer cadastrar um serviço gratuito do seu bairro? Copie o modelo padronizado e abra uma Issue no repositório.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleCopyTemplate}
              className="min-h-[40px] inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-purple-900 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
            >
              {copiedTemplate ? <Check className="w-3.5 h-3.5 text-blue-700" /> : <Code className="w-3.5 h-3.5" />}
              <span>{copiedTemplate ? 'Modelo Copiado!' : 'Copiar Modelo'}</span>
            </button>

            <a
              href="https://github.com/karolcastro/acolheMulher/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[40px] inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold bg-gradient-to-r from-pink-600 to-purple-700 hover:from-pink-700 hover:to-purple-800 text-white rounded-xl transition-all whitespace-nowrap"
            >
              <span>Abrir no GitHub</span>
              <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>
          </div>
        </div>
      </div>

      {/* Python Clean Architecture + Security + MCP Server */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 md:p-8 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-display font-bold text-slate-900">
            <Layers className="w-4 h-4 text-pink-700 shrink-0" />
            <span>Backend Python · Clean Architecture + Segurança + MCP</span>
          </div>
          <span className="text-xs font-medium text-blue-800 inline-flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5" />
            <span>
              {isLiveConnected
                ? 'Supabase Realtime ativo'
                : isSupabaseConfigured
                ? 'Supabase conectado (modo offline-first)'
                : 'Catálogo offline-first ativo · 17 testes Python aprovados'}
            </span>
          </span>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          O backend em Python segue separação estrita em camadas (<strong>Domain</strong>, <strong>Application</strong>, <strong>Infrastructure</strong>, <strong>Presentation</strong>, <strong>Security</strong> e <strong>MCP</strong>), com proteção Zero-PII (sem armazenamento de CEP, voz ou IP), anti-SSRF para ViaCEP, rate limiting com HMAC efêmero, cabeçalhos OWASP e protocolo <strong>Model Context Protocol (JSON-RPC 2.0)</strong> para agentes.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
              <span>Servidor MCP (STDIO &amp; HTTP /mcp)</span>
            </div>
            <p className="text-slate-600">
              Tools: <code className="font-mono text-purple-900">buscar_servicos_por_cep</code>,{' '}
              <code className="font-mono text-purple-900">interpretar_busca_por_voz</code>,{' '}
              <code className="font-mono text-purple-900">listar_ongs_apoio</code>,{' '}
              <code className="font-mono text-purple-900">obter_emergencia_offline</code>
            </p>
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-1">
            <div className="font-bold text-slate-900 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-pink-700" />
              <span>Comandos de Execução</span>
            </div>
            <div className="font-mono text-[11px] text-slate-700 space-y-0.5">
              <div>python3 -m backend.main</div>
              <div>python3 -m backend.mcp.server</div>
            </div>
          </div>
        </div>
      </div>

      {/* Anonymous Regional & Topic Demand Stats */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 md:p-8 space-y-4 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-display font-bold text-slate-900">
            <BarChart3 className="w-4 h-4 text-purple-700 shrink-0" />
            <span>Últimos Assuntos &amp; Regiões Buscadas (Totais Anônimos)</span>
          </div>
          {isSupabaseConfigured && (
            <button
              type="button"
              onClick={() => void loadDemandStats()}
              disabled={loadingDemand}
              className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 text-xs font-semibold transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingDemand ? 'animate-spin' : ''}`} />
              <span>Atualizar</span>
            </button>
          )}
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Registro diário agregado por assunto e Cidade/UF para identificar onde há mais demanda por apoio gratuito — <strong>sem nunca armazenar CEP completo, IP, voz ou histórico individual</strong>.
        </p>

        {!isSupabaseConfigured ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-700 space-y-1.5">
            <p className="font-semibold text-slate-900">
              Pronto para conectar ao seu Supabase
            </p>
            <p>
              Execute <code className="font-mono text-purple-900">supabase/migrations/003_search_demand_stats.sql</code> no SQL Editor do Supabase e configure <code className="font-mono text-purple-900">VITE_SUPABASE_URL</code> e <code className="font-mono text-purple-900">VITE_SUPABASE_ANON_KEY</code> na Vercel para acompanhar os totais aqui.
            </p>
          </div>
        ) : demandError ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-950">
            {demandError} Execute o script <code className="font-mono">003_search_demand_stats.sql</code> no SQL Editor do Supabase.
          </div>
        ) : demandStats.length === 0 ? (
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
            {loadingDemand
              ? 'Carregando estatísticas agregadas...'
              : 'Nenhuma busca agregada registrada ainda após a criação da tabela.'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {demandStats.map((row) => (
              <div
                key={row.id}
                className="bg-slate-50 rounded-xl border border-slate-200/90 p-3.5 flex items-center justify-between gap-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="text-xs font-bold text-slate-900 truncate">
                    {row.topic_label}
                  </div>
                  <div className="text-[11px] text-slate-600 flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-blue-700 shrink-0" />
                    <span>{row.city} - {row.state}</span>
                    <span className="text-slate-300" aria-hidden="true">·</span>
                    <span>{row.demand_date}</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-purple-100 text-purple-950 text-xs font-bold tabular-nums shrink-0">
                  {row.search_count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Complementary Portfolio Vision */}
      <div className="bg-white rounded-2xl border border-slate-200/90 p-6 md:p-8 space-y-3 shadow-xs">
        <div className="flex items-center gap-2 text-sm font-display font-bold text-slate-900">
          <Sparkles className="w-4 h-4 text-purple-700" />
          <span>Visão de Portfólio Tecnológico</span>
        </div>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
          Esta plataforma foi concebida de forma modular: enquanto o <strong>ProjectFlow AI</strong> demonstra governança com inteligência artificial, regras de negócio e persistência relacional com PostgreSQL/Supabase, o <strong>AcolheMulher</strong> combina frontend moderno em React/TypeScript + PWA offline e backend Python em Clean Architecture com servidor MCP e segurança trauma-informed.
        </p>
      </div>

    </div>
  );
};
