import React, { useState } from 'react';
import { Code, Copy, Check, ExternalLink, Sparkles, Monitor, Smartphone, Globe, Shield, Search } from 'lucide-react';

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
          primary: 'bg-stone-900 hover:bg-stone-800 text-white',
          border: 'border-stone-200',
          accent: 'text-stone-900',
          lightBg: 'bg-stone-100',
          hex: '#1c1917'
        };
      default:
        return {
          primary: 'bg-rose-700 hover:bg-rose-800 text-white',
          border: 'border-rose-200',
          accent: 'text-rose-700',
          lightBg: 'bg-rose-50',
          hex: '#be123c'
        };
    }
  };

  const theme = getThemeClasses();

  // Generated code snippets
  const iframeSnippet = `<!-- Widget AcolheMulher - Início -->
<iframe 
  src="https://acolhemulher.org/embed?type=${widgetType}&theme=${themeColor}" 
  width="100%" 
  height="${widgetType === 'badge' ? '90' : widgetType === 'button' ? '60' : '380'}" 
  frameborder="0" 
  style="border-radius: 16px; border: 1px solid #e7e5e4; max-width: 500px;" 
  title="Buscador de Serviços Gratuitos para Mulheres">
</iframe>
<!-- Widget AcolheMulher - Fim -->`;

  const scriptSnippet = `<!-- Adicione no final da tag <body> do site da sua ONG -->
<script 
  src="https://cdn.acolhemulher.org/widget.js" 
  data-theme="${themeColor}" 
  data-type="${widgetType}" 
  data-position="bottom-right"
  defer>
</script>`;

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
      <section className="bg-white rounded-3xl border border-stone-200 p-8 md:p-10 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-rose-700 text-xs font-bold uppercase tracking-wider">
          <Globe className="w-4 h-4" />
          <span>Distribuição Aberta & Integração com Parceiros</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 leading-tight">
          Widget Embutível para ONGs, Coletivos e Portais
        </h1>

        <p className="text-base text-stone-600 leading-relaxed max-w-3xl">
          Você mencionou que gostaria que a plataforma pudesse ser integrada em outros sites. 
          Criamos este gerador de <strong>Widget Aberto (Embed)</strong>: qualquer organização sem fins lucrativos, 
          portal de notícias ou blog feminino pode adicionar o buscador de CEP diretamente em sua página com apenas 1 linha de código!
        </p>

        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200/80 text-xs text-emerald-900 leading-relaxed">
          <strong>Como funciona a distribuição em rede:</strong> As mulheres nem precisam saber o endereço direto do portal principal. 
          O serviço vai até elas através dos sites que elas já confiam e frequentam (sites de receitas, notícias locais, páginas de ONGs e coletivos).
        </div>
      </section>

      {/* Widget Customizer & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Controls Column */}
        <div className="lg:col-span-5 bg-white p-6 md:p-8 rounded-3xl border border-stone-200 space-y-6 shadow-sm">
          <h2 className="text-lg font-bold text-stone-900">Personalizar o Widget</h2>

          {/* Type Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              1. Formato do Widget
            </label>
            <div className="grid grid-cols-1 gap-2">
              <button
                onClick={() => setWidgetType('card')}
                className={`p-3 text-left rounded-xl border text-xs transition-all ${
                  widgetType === 'card'
                    ? 'border-rose-600 bg-rose-50/50 text-rose-950 font-semibold'
                    : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                }`}
              >
                <div className="font-bold mb-0.5">Caixa de Busca Completa</div>
                <div className="text-[11px] text-stone-700">Com campo de CEP, categorias e botão de socorro. Ideal para páginas ou blogs.</div>
              </button>

              <button
                onClick={() => setWidgetType('button')}
                className={`p-3 text-left rounded-xl border text-xs transition-all ${
                  widgetType === 'button'
                    ? 'border-rose-600 bg-rose-50/50 text-rose-950 font-semibold'
                    : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                }`}
              >
                <div className="font-bold mb-0.5">Botão Flutuante Discreto</div>
                <div className="text-[11px] text-stone-700">Fica no cantinho inferior da tela. Abre o buscador em modal com 1 clique.</div>
              </button>

              <button
                onClick={() => setWidgetType('badge')}
                className={`p-3 text-left rounded-xl border text-xs transition-all ${
                  widgetType === 'badge'
                    ? 'border-rose-600 bg-rose-50/50 text-rose-950 font-semibold'
                    : 'border-stone-200 hover:bg-stone-50 text-stone-700'
                }`}
              >
                <div className="font-bold mb-0.5">Faixa Horizontal (Selo de Apoio)</div>
                <div className="text-[11px] text-stone-700">Selo estreito para cabeçalhos ou rodapés de sites parceiros.</div>
              </button>
            </div>
          </div>

          {/* Theme Color Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-stone-700 uppercase tracking-wider block">
              2. Paleta de Cores
            </label>
            <div className="flex gap-2">
              <button
                onClick={() => setThemeColor('rose')}
                className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-all ${
                  themeColor === 'rose'
                    ? 'border-rose-600 bg-rose-50 text-rose-900 font-bold'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                Rosa Acolhe
              </button>
              <button
                onClick={() => setThemeColor('purple')}
                className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-all ${
                  themeColor === 'purple'
                    ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                Roxo Mulher
              </button>
              <button
                onClick={() => setThemeColor('slate')}
                className={`flex-1 py-2 text-xs font-medium rounded-xl border transition-all ${
                  themeColor === 'slate'
                    ? 'border-stone-800 bg-stone-100 text-stone-900 font-bold'
                    : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                }`}
              >
                Neutro
              </button>
            </div>
          </div>

          <div className="pt-2 text-xs text-stone-700 space-y-2 border-t border-stone-100">
            <div className="flex items-center gap-1.5 font-medium text-stone-700">
              <Shield className="w-4 h-4 text-emerald-600" />
              <span>Garantias de Privacidade no Embed:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-stone-600">
              <li>O site hospedeiro da ONG nunca tem acesso aos dados da mulher.</li>
              <li>Não utiliza cookies de rastreamento de publicidade.</li>
              <li>Carregamento assíncrono ultrarrápido (menos de 50kb).</li>
            </ul>
          </div>
        </div>

        {/* Live Simulation Preview */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-stone-900 text-white rounded-3xl p-6 md:p-8 shadow-md">
            <div className="flex items-center justify-between mb-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
                <Monitor className="w-4 h-4" />
                <span>Simulação: Como o Widget aparece no site da ONG parceira</span>
              </div>
              <span className="text-[11px] text-emerald-400 font-mono">Live Preview</span>
            </div>

            {/* Mock website container simulating an external NGO website */}
            <div className="bg-stone-100 text-stone-900 rounded-2xl p-6 border border-stone-300">
              
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-200 text-xs text-stone-700">
                <div className="font-bold text-stone-800 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-stone-400" />
                  <span>Portal Feminista Solidário (Site da ONG)</span>
                </div>
                <span className="text-[11px] font-mono">www.ongparceira.org.br</span>
              </div>

              {/* The Actual Rendered Widget Inside the NGO Mock */}
              {widgetType === 'card' && (
                <div className={`bg-white p-5 rounded-2xl border ${theme.border} shadow-sm space-y-3`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg ${theme.primary} flex items-center justify-center font-bold text-xs`}>
                        AM
                      </div>
                      <div>
                        <div className="font-bold text-xs text-stone-900">AcolheMulher Parceira</div>
                        <div className="text-[10px] text-stone-700">Serviços gratuitos perto de você sem cadastro</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-medium border border-emerald-200">
                      100% Gratuito
                    </span>
                  </div>

                  <form onSubmit={handleSimulateCepSearch} className="flex gap-2">
                    <input
                      type="text"
                      value={simulatedCep}
                      onChange={(e) => setSimulatedCep(e.target.value)}
                      placeholder="Digite seu CEP..."
                      className="flex-1 px-3 py-2 text-xs border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-rose-500 font-mono"
                    />
                    <button
                      type="submit"
                      className={`px-3 py-2 text-xs font-semibold rounded-xl ${theme.primary} transition-all`}
                    >
                      Buscar
                    </button>
                  </form>

                  {simulatedResult ? (
                    <div className="text-xs bg-stone-50 p-2.5 rounded-xl border border-stone-200 text-stone-700">
                      {simulatedResult}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-[11px] text-stone-700 pt-1">
                      <span>• Jurídico • Psicologia • Saúde • Cursos</span>
                      <a href="#emergencia" className="text-rose-600 font-bold hover:underline">
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
                    <span className="font-bold text-stone-900">Rede de Apoio à Mulher:</span>
                    <span className="text-stone-600 hidden sm:inline">Encontre atendimento gratuito digitando apenas o CEP.</span>
                  </div>
                  <button className={`px-3 py-1.5 rounded-lg text-xs font-bold ${theme.primary} shrink-0`}>
                    Acessar Agora
                  </button>
                </div>
              )}

            </div>
          </div>

          {/* Copy Code Snippets */}
          <div className="bg-white p-6 md:p-8 rounded-3xl border border-stone-200 space-y-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <Code className="w-4 h-4 text-rose-600" />
                <span>Código para Copiar e Colar (HTML / iFrame)</span>
              </h3>
              <button
                onClick={() => handleCopyCode(iframeSnippet)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copiado!' : 'Copiar Código'}</span>
              </button>
            </div>

            <pre className="p-4 bg-stone-900 text-rose-300 font-mono text-xs rounded-xl overflow-x-auto leading-relaxed">
              {iframeSnippet}
            </pre>

            <div className="pt-2 text-xs text-stone-700">
              <strong>Como a ONG instala:</strong> Basta abrir o painel do WordPress, Wix ou código-fonte HTML do site e colar este trecho onde quiser que o buscador apareça.
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
