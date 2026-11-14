import React, { useState, useEffect } from 'react';
import { NATIONAL_SERVICES, REGIONAL_SERVICES } from '../data/servicesData';
import { Github, ExternalLink, Download, GitPullRequest, Code, Check, Sparkles, Layers, ShieldCheck, HeartHandshake, RefreshCw, GitCommit } from 'lucide-react';

export const GitHubIntegrationView: React.FC = () => {
  const [repoData, setRepoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  useEffect(() => {
    const fetchRepo = async () => {
      try {
        const res = await fetch('https://api.github.com/repos/karolcastro/Reprograma_IA_Agente_de_Projetos');
        if (res.ok) {
          const data = await res.json();
          setRepoData(data);
        }
      } catch (err) {
        console.error('Erro ao conectar ao GitHub:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchRepo();
  }, []);

  const handleDownloadJSON = () => {
    const fullDatabase = {
      projeto: "AcolheMulher",
      autora: "Karol Castro",
      repositorio: "https://github.com/karolcastro/Reprograma_IA_Agente_de_Projetos",
      versao: "1.0.0",
      data_exportacao: new Date().toISOString(),
      total_servicos: NATIONAL_SERVICES.length + REGIONAL_SERVICES.length,
      servicos_nacionais: NATIONAL_SERVICES,
      servicos_regionais: REGIONAL_SERVICES
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
    <div className="space-y-8 max-w-5xl mx-auto">
      
      {/* Top Banner / GitHub Identity */}
      <div className="bg-stone-900 text-white rounded-3xl p-6 md:p-10 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-stone-800">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white text-stone-950 flex items-center justify-center shrink-0 shadow-md">
              <Github className="w-8 h-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                  Projeto Aberto no GitHub
                </span>
                <span className="px-2 py-0.5 bg-rose-950 text-rose-300 text-[10px] rounded-md border border-rose-800">
                  Formação {`{reprograma}`}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white mt-0.5">
                Reprograma_IA_Agente_de_Projetos
              </h1>
              <div className="text-xs text-stone-400 font-mono mt-1">
                github.com/karolcastro/Reprograma_IA_Agente_de_Projetos
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <a
              href="https://github.com/karolcastro/Reprograma_IA_Agente_de_Projetos"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold transition-all shadow-sm"
            >
              <Github className="w-4 h-4" />
              <span>Ver Repositório Oficial</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Live Repository Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="bg-stone-800/80 p-4 rounded-2xl border border-stone-700/80 space-y-1">
            <span className="text-stone-400 text-[11px] block">Autora & Desenvolvedora</span>
            <div className="font-bold text-white text-sm flex items-center gap-2">
              <img
                src={repoData?.owner?.avatar_url || "https://avatars.githubusercontent.com/u/49079797?v=4"}
                alt="Karol Castro"
                className="w-5 h-5 rounded-full"
              />
              <span>Karol Castro</span>
            </div>
            <a
              href="https://github.com/karolcastro"
              target="_blank"
              rel="noopener noreferrer"
              className="text-rose-300 hover:underline text-[11px] block"
            >
              @karolcastro no GitHub
            </a>
          </div>

          <div className="bg-stone-800/80 p-4 rounded-2xl border border-stone-700/80 space-y-1">
            <span className="text-stone-400 text-[11px] block">Licença & Modelo de Acesso</span>
            <div className="font-bold text-emerald-400 text-sm">Código Aberto (Open Source)</div>
            <span className="text-stone-300 text-[11px] block">Livre de fins lucrativos · Acesso por CEP</span>
          </div>

          <div className="bg-stone-800/80 p-4 rounded-2xl border border-stone-700/80 space-y-1">
            <span className="text-stone-400 text-[11px] block">Arquitetura Integrada</span>
            <div className="font-bold text-indigo-300 text-sm">React 19 + TypeScript + PWA</div>
            <span className="text-stone-300 text-[11px] block">Widget iFrame + API ViaCEP</span>
          </div>
        </div>
      </div>

      {/* Open Data & Community Contribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Export Open Data */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
              <Download className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-stone-900">
              Download da Base Aberta (JSON)
            </h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              Disponibilizamos todos os dados públicos e verificados de postos de saúde, DEAMs, Defensorias e cursos gratuitos para que outras pesquisadoras e desenvolvedoras possam utilizar livremente.
            </p>
          </div>

          <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
            <span className="text-xs text-stone-500 font-mono">
              {NATIONAL_SERVICES.length + REGIONAL_SERVICES.length} serviços cadastrados
            </span>
            <button
              onClick={handleDownloadJSON}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Baixar Dados (.json)</span>
            </button>
          </div>
        </div>

        {/* Card 2: Contribute via GitHub Issue */}
        <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
              <GitPullRequest className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-stone-900">
              Sugerir Novo Serviço no GitHub
            </h2>
            <p className="text-xs text-stone-600 leading-relaxed">
              Trabalha em um CRAS, faculdade ou ONG e quer cadastrar um serviço gratuito do seu bairro? Copie o modelo padronizado e abra uma Issue no repositório.
            </p>
          </div>

          <div className="pt-4 border-t border-stone-100 flex items-center justify-between gap-3">
            <button
              onClick={handleCopyTemplate}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors"
            >
              {copiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Code className="w-3.5 h-3.5" />}
              <span>{copiedTemplate ? 'Modelo Copiado!' : 'Copiar Modelo'}</span>
            </button>

            <a
              href="https://github.com/karolcastro/Reprograma_IA_Agente_de_Projetos/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold bg-rose-700 hover:bg-rose-800 text-white rounded-xl transition-colors"
            >
              <span>Abrir no GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

      </div>

      {/* Python Clean Architecture + Security + MCP Server (Partners Only) */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-stone-800 uppercase tracking-wider">
            <Layers className="w-4 h-4 text-rose-700" />
            <span>Backend Python · Clean Architecture + Segurança + MCP</span>
          </div>
          <span className="text-xs font-medium text-emerald-800">
            15 testes automatizados aprovados
          </span>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          O backend em Python segue separação estrita em camadas (<strong>Domain</strong>, <strong>Application</strong>, <strong>Infrastructure</strong>, <strong>Presentation</strong>, <strong>Security</strong> e <strong>MCP</strong>), com proteção Zero-PII (sem armazenamento de CEP, voz ou IP), anti-SSRF para ViaCEP, rate limiting com HMAC efêmero, cabeçalhos OWASP e protocolo <strong>Model Context Protocol (JSON-RPC 2.0)</strong> para agentes de IA.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-stone-50 rounded-xl border border-stone-200 p-3.5 space-y-1">
            <div className="font-bold text-stone-900 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>Servidor MCP (STDIO &amp; HTTP /mcp)</span>
            </div>
            <p className="text-stone-600">
              Tools: <code className="font-mono text-stone-800">buscar_servicos_por_cep</code>,{' '}
              <code className="font-mono text-stone-800">interpretar_busca_por_voz</code>,{' '}
              <code className="font-mono text-stone-800">listar_ongs_apoio</code>,{' '}
              <code className="font-mono text-stone-800">obter_emergencia_offline</code>
            </p>
          </div>

          <div className="bg-stone-50 rounded-xl border border-stone-200 p-3.5 space-y-1">
            <div className="font-bold text-stone-900 flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-rose-700" />
              <span>Comandos de Execução</span>
            </div>
            <div className="font-mono text-[11px] text-stone-700 space-y-0.5">
              <div>python3 -m backend.main</div>
              <div>python3 -m backend.mcp.server</div>
            </div>
          </div>
        </div>
      </div>

      {/* Complementary Portfolio Vision */}
      <div className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8 shadow-xs space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-stone-700 uppercase tracking-wider">
          <Sparkles className="w-4 h-4 text-rose-600" />
          <span>Visão de Portfólio Tecnológico</span>
        </div>
        <p className="text-xs text-stone-600 leading-relaxed">
          Esta plataforma foi concebida de forma modular: enquanto o <strong>ProjectFlow AI</strong> demonstra governança com inteligência artificial, regras de negócio e persistência relacional com PostgreSQL/Supabase, o <strong>AcolheMulher</strong> combina frontend moderno em React/TypeScript + PWA offline e backend Python em Clean Architecture com servidor MCP e segurança trauma-informed.
        </p>
      </div>

    </div>
  );
};
