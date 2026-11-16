import React, { useState } from 'react';
import { Code, Copy, Check, Monitor, Globe, Shield } from 'lucide-react';

export const WidgetGenerator: React.FC = () => {
  const [widgetType, setWidgetType] = useState<'card' | 'badge' | 'button'>('card');
  const [themeColor, setThemeColor] = useState<'rose' | 'purple' | 'slate'>('rose');
  const [copied, setCopied] = useState(false);
  const [simulatedCep, setSimulatedCep] = useState('');
  const [simulatedResult, setSimulatedResult] = useState<string | null>(null);

  const getThemeClasses = () => {
    switch (themeColor) {
      case 'purple':
        return {
          primary: 'bg-purple-700 hover:bg-purple-800 text-white',
          border: 'border-purple-200',
          accent: 'text-purple-700',
          lightBg: 'bg-purple-50',
          hex: '#7e22ce'
        };
      case 'slate':
        return {
          primary: 'bg-blue-900 hover:bg-blue-950 text-white',
          border: 'border-blue-200',
          accent: 'text-blue-900',
          lightBg: 'bg-blue-50',
          hex: '#1e3a8a'
        };
      default:
        return {
          primary: 'bg-pink-600 hover:bg-pink-700 text-white',
          border: 'border-pink-200',
          accent: 'text-pink-700',
          lightBg: 'bg-pink-50',
          hex: '#db2777'
        };
    }
  };

  const theme = getThemeClasses();

  const iframeSnippet = `<!-- Widget AcolheMulher - Início -->
<iframe 
  src="https://acolhemulher.org/embed?type=${widgetType}&theme=${themeColor}" 
  width="100%" 
  height="${widgetType === 'badge' ? '90' : widgetType === 'button' ? '60' : '380'}" 
  frameborder="0" 
  style="border-radius: 16px; border: 1px solid #e2e8f0; max-width: 500px;" 
  title="Buscador de Serviços Gratuitos para Mulheres">
</iframe>
<!-- Widget AcolheMulher - Fim -->`;

  const handleCopyCode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSimulateCepSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (simulatedCep.replace(/\D/g, '').length >= 5) {
      setSimulatedResult('Buscando CRAS, Defensoria, UBS e Cursos gratuitos mais próximos do seu CEP...');
    }
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto">

      {/* Intro */}
      <section className="bg-white rounded-3xl border border-slate-200 p-8 md:p-10 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-pink-700 text-xs font-bold uppercase tracking-wider">
          <Globe className="w-4 h-4" />
          <span>Distribuição Aberta & Integração com Parceiros</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 leading-tight">
          Widget Embutível para ONGs, Coletivos e Portais
        </h1>

        <p className="text-base text-slate-600 leading-relaxed max-w-3xl">
          Qualquer organização sem fins lucrativos, portal de notícias ou coletivo pode adicionar o buscador por CEP diretamente em sua página com apenas 1 trecho de código.
        </p>

        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-200/80 text-xs sm:text-sm text-blue-950 leading-relaxed">
          <strong>Como funciona a distribuição em rede:</strong> As mulheres nem precisam saber o endereço direto do portal principal. O serviço vai até elas através dos sites que já confiam e frequentam.
        </div>
      </section>

      {/* Widget Customizer & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

        {/* Controls Column */}
        <div className="lg:col-span-5 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 space-y-6 shadow-xs">
          <h2 className="text-lg font-display font-bold text-slate-900">Personalizar o Widget</h2>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              1. Formato do Widget
            </label>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => setWidgetType('card')}
                className={`p-3 text-left rounded-xl border text-xs transition-all ${
                  widgetType === 'card'
                    ? 'border-pink-600 bg-pink-50/70 text-purple-950 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold mb-0.5">Caixa de Busca Completa</div>
                <div className="text-[11px] text-slate-600">Com campo de CEP, categorias e botão de socorro. Ideal para páginas ou blogs.</div>
              </button>

              <button
                type="button"
                onClick={() => setWidgetType('button')}
                className={`p-3 text-left rounded-xl border text-xs transition-all ${
                  widgetType === 'button'
                    ? 'border-pink-600 bg-pink-50/70 text-purple-950 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold mb-0.5">Botão Flutuante Discreto</div>
                <div className="text-[11px] text-slate-600">Fica no cantinho inferior da tela. Abre o buscador em modal com 1 clique.</div>
              </button>

              <button
                type="button"
                onClick={() => setWidgetType('badge')}
                className={`p-3 text-left rounded-xl border text-xs transition-all ${
                  widgetType === 'badge'
                    ? 'border-pink-600 bg-pink-50/70 text-purple-950 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="font-bold mb-0.5">Faixa Horizontal (Selo de Apoio)</div>
                <div className="text-[11px] text-slate-600">Selo estreito para cabeçalhos ou rodapés de sites parceiros.</div>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
              2. Paleta de Cores
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setThemeColor('rose')}
                className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-all ${
                  themeColor === 'rose'
                    ? 'border-pink-600 bg-pink-50 text-pink-900 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Rosa Acolhe
              </button>
              <button
                type="button"
                onClick={() => setThemeColor('purple')}
                className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-all ${
                  themeColor === 'purple'
                    ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Roxo Mulher
              </button>
              <button
                type="button"
                onClick={() => setThemeColor('slate')}
                className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-all ${
                  themeColor === 'slate'
                    ? 'border-blue-800 bg-blue-50 text-blue-950 font-bold'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                Azul Seguro
              </button>
            </div>
          </div>

          <div className="pt-2 text-xs text-slate-700 space-y-2 border-t border-slate-100">
            <div className="flex items-center gap-1.5 font-medium text-slate-800">
              <Shield className="w-4 h-4 text-blue-700" />
              <span>Garantias de Privacidade no Embed:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600">
              <li>O site hospedeiro da ONG nunca tem acesso aos dados da mulher.</li>
              <li>Não utiliza cookies de rastreamento de publicidade.</li>
              <li>Carregamento assíncrono ultrarrápido (menos de 50kb).</li>
            </ul>
          </div>
        </div>

        {/* Live Simulation Preview */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-gradient-to-br from-[#0F172A] via-[#2E1065] to-[#500724] text-white rounded-3xl p-6 md:p-8 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-pink-200 flex items-center gap-1.5">
                <Monitor className="w-4 h-4" />
                <span>Simulação: Como o Widget aparece no site da ONG parceira</span>
              </div>
              <span className="text-[11px] text-blue-300 font-mono">Live Preview</span>
            </div>

            <div className="bg-slate-100 text-slate-900 rounded-2xl p-6 border border-white/20">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-200 text-xs text-slate-700">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-600" />
                  <span>Portal Feminista Solidário (Site da ONG)</span>
                </div>
                <span className="text-[11px] font-mono">www.ongparceira.org.br</span>
              </div>

              {widgetType === 'card' && (
                <div className={`bg-white p-5 rounded-2xl border ${theme.border} shadow-sm space-y-3`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg ${theme.primary} flex items-center justify-center font-bold text-xs`}>
                        AM
                      </div>
                      <div>
                        <div className="font-bold text-xs text-slate-900">AcolheMulher Parceira</div>
                        <div className="text-[10px] text-slate-600">Serviços gratuitos perto de você sem cadastro</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-blue-50 text-blue-800 px-2 py-0.5 rounded font-semibold border border-blue-200">
                      100% Gratuito
                    </span>
                  </div>

                  <form onSubmit={handleSimulateCepSearch} className="flex gap-2">
                    <input
                      type="text"
                      value={simulatedCep}
                      onChange={(e) => setSimulatedCep(e.target.value)}
                      placeholder="Digite seu CEP..."
                      className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-pink-600 font-mono"
                    />
                    <button
                      type="submit"
                      className={`px-3 py-2 text-xs font-semibold rounded-xl ${theme.primary} transition-all`}
                    >
                      Buscar
                    </button>
                  </form>

                  {simulatedResult ? (
                    <div className="text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-slate-700">
                      {simulatedResult}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1">
                      <span>Jurídico · Psicologia · Saúde · Cursos</span>
                      <a href="tel:180" className="text-red-600 font-bold hover:underline">
                        Ligue 180
                      </a>
                    </div>
                  )}
                </div>
              )}

              {widgetType === 'button' && (
                <div className="py-8 flex justify-end">
                  <div className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg ${theme.primary} font-medium text-xs cursor-pointer`}>
                    <Shield className="w-4 h-4" />
                    <span>Precisa de Ajuda ou Cursos Gratuitos?</span>
                  </div>
                </div>
              )}

              {widgetType === 'badge' && (
                <div className={`p-3 rounded-xl border ${theme.border} ${theme.lightBg} flex items-center justify-between gap-4 text-xs`}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">Rede de Apoio à Mulher:</span>
                    <span className="text-slate-600 hidden sm:inline">Encontre atendimento gratuito digitando apenas o CEP.</span>
                  </div>
                  <button type="button" className={`px-3 py-1.5 rounded-lg text-xs font-bold ${theme.primary} shrink-0`}>
                    Acessar Agora
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Copy Code Snippets */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-slate-900 text-sm flex items-center gap-2">
                <Code className="w-4 h-4 text-pink-600" />
                <span>Código para Copiar e Colar (HTML / iFrame)</span>
              </h3>
              <button
                type="button"
                onClick={() => handleCopyCode(iframeSnippet)}
                className="min-h-[36px] inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-900 text-white rounded-lg hover:bg-blue-950 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-pink-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Código'}</span>
              </button>
            </div>

            <pre className="p-4 bg-[#0F172A] text-pink-300 font-mono text-xs rounded-xl overflow-x-auto leading-relaxed">
              {iframeSnippet}
            </pre>

            <div className="pt-2 text-xs text-slate-700">
              <strong>Como a ONG instala:</strong> Basta abrir o painel do WordPress, Wix ou código-fonte HTML do site e colar este trecho onde quiser que o buscador apareça.
            </div>
          </div>

        </div>
      </div>

    </div>
  );
};
