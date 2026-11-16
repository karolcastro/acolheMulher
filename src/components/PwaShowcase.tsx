import React from 'react';
import { Smartphone, Download, Zap, WifiOff, Check, Lock } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PwaShowcaseProps {
  onOpenOfflineModal?: () => void;
}

export const PwaShowcase: React.FC<PwaShowcaseProps> = ({ onOpenOfflineModal }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();

  const handleInstallClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) return;
    }
    onOpenOfflineModal?.();
  };

  return (
    <div className="space-y-10 max-w-6xl mx-auto">

      {/* Intro Header */}
      <section className="bg-white rounded-3xl border border-slate-200/90 p-8 md:p-10 space-y-4 shadow-xs">
        <div className="flex items-center gap-2 text-pink-700 text-xs font-semibold">
          <Smartphone className="w-4 h-4 shrink-0" />
          <span>Aplicativo leve direto no navegador (PWA)</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-display font-bold text-slate-900 leading-tight text-balance">
          Plataforma ou App? Como o PWA entrega os dois juntos
        </h1>

        <p className="text-sm sm:text-base text-slate-600 leading-relaxed max-w-3xl">
          Para atender mulheres em situação de vulnerabilidade sem barreiras, a melhor solução é uma{' '}
          <strong>Progressive Web App (PWA)</strong>. Veja as 4 vantagens práticas que fazem o aplicativo funcionar no celular sem passar pela burocracia das lojas de aplicativos:
        </p>
      </section>

      {/* 4 Reasons why PWA wins */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-pink-50 text-pink-700 flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-display font-bold text-slate-900 text-base">
            1. Não deixa rastro na conta Google / Apple da família
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Se uma mulher baixa um aplicativo da Play Store ou App Store, o nome do app fica gravado no histórico de compras da conta familiar. O PWA funciona direto pelo link seguro sem deixar histórico na loja.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center font-bold">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-display font-bold text-slate-900 text-base">
            2. Pesa menos de 2 MB (Não trava celular com pouca memória)
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Celulares básicos com armazenamento lotado frequentemente recusam aplicativos grandes. O PWA instala em 1 segundo, ocupando menos espaço do que uma única foto.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold">
            <WifiOff className="w-5 h-5" />
          </div>
          <h3 className="font-display font-bold text-slate-900 text-base">
            3. Funciona mesmo sem internet (Modo Offline de Emergência)
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Se os dados móveis acabarem na rua, a tecnologia de <em>Service Worker</em> do PWA mantém os telefones de socorro (180, 190, Defensoria) e os endereços consultados salvos no aparelho.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 space-y-3 shadow-xs">
          <div className="w-10 h-10 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center font-bold">
            <Smartphone className="w-5 h-5" />
          </div>
          <h3 className="font-display font-bold text-slate-900 text-base">
            4. Um único código para Web, Android e iPhone
          </h3>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            Sem depender de aprovações demoradas em lojas nativas, atualizações importantes de serviços e contatos gratuitos chegam imediatamente para qualquer aparelho.
          </p>
        </div>
      </div>

      {/* Interactive Mobile Device Simulator */}
      <section className="bg-gradient-to-br from-[#0F172A] via-[#2E1065] to-[#500724] text-white rounded-3xl p-8 md:p-12 shadow-lg">
        <div className="max-w-4xl mx-auto flex flex-col md:flex-row items-center gap-10">

          {/* Smartphone Frame Mockup */}
          <div className="w-[300px] h-[580px] bg-slate-950 rounded-[48px] p-3.5 border-4 border-purple-900/70 shadow-2xl relative shrink-0">
            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-4 bg-slate-900 rounded-full z-20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-slate-800" />
            </div>

            <div className="w-full h-full bg-[#F8FAFC] rounded-[38px] overflow-hidden flex flex-col justify-between text-slate-900 font-sans text-xs">
              {/* App Bar */}
              <div className="bg-white pt-8 pb-3 px-4 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-pink-600 to-purple-700 text-white flex items-center justify-center font-bold text-[10px]">
                    AM
                  </div>
                  <span className="font-display font-bold text-slate-900 text-xs">AcolheMulher</span>
                </div>
                <span className="text-pink-700 text-[10px] font-semibold">
                  Sem login
                </span>
              </div>

              {/* Scrollable Mini Feed */}
              <div className="p-4 space-y-3 overflow-y-auto">
                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="text-[11px] text-pink-700 font-semibold">Busca por CEP</div>
                  <div className="p-2 bg-slate-100 rounded-lg text-[11px] text-slate-700 font-mono tabular-nums">
                    CEP: 01001-000
                  </div>
                  <div className="text-[10px] text-blue-800 font-semibold">
                    8 serviços encontrados no raio
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1.5">
                  <div className="font-bold text-[11px] text-slate-900">Casa da Mulher Brasileira</div>
                  <div className="text-[10px] text-slate-500">Atendimento e abrigo 24h</div>
                  <div className="flex gap-1.5 pt-1">
                    <span className="px-2 py-1 bg-red-600 text-white rounded text-[9px] font-bold">Ligar 24h</span>
                    <span className="px-2 py-1 bg-blue-50 text-blue-900 rounded text-[9px] font-semibold">Ver Rota</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200 space-y-1">
                  <div className="font-bold text-[11px] text-slate-900">Defensoria Pública (NUDEM)</div>
                  <div className="text-[10px] text-slate-500">Advogada gratuita · Porta Aberta</div>
                </div>
              </div>

              {/* Bottom Touch Bar */}
              <div className="bg-white p-3 border-t border-slate-200 flex items-center justify-around text-[10px] text-slate-600">
                <span className="text-purple-900 font-bold">Início</span>
                <span>Mapa</span>
                <span>Cursos</span>
                <span className="text-red-600 font-bold">Ligue 180</span>
              </div>
            </div>
          </div>

          {/* Explanation Text */}
          <div className="space-y-5">
            <h2 className="text-2xl md:text-3xl font-display font-bold text-white">
              Como funciona na prática para a usuária?
            </h2>

            <p className="text-slate-200 text-sm leading-relaxed">
              Quando a mulher acessa pelo celular no Chrome ou Safari, o próprio navegador exibe a opção amigável:
              <br />
              <strong className="text-white">"Deseja adicionar o AcolheMulher à sua tela de início?"</strong>
            </p>

            <div className="space-y-2 text-xs sm:text-sm text-slate-200">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-pink-400 shrink-0" />
                <span>Cria um ícone na tela do celular como se fosse um app da loja.</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-pink-400 shrink-0" />
                <span>Abre em tela cheia sem a barra de endereços do navegador.</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-pink-400 shrink-0" />
                <span>Mantém telefones de emergência acessíveis mesmo sem sinal.</span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleInstallClick()}
                className="min-h-[44px] px-5 py-3 bg-gradient-to-r from-pink-600 to-purple-700 hover:from-pink-700 hover:to-purple-800 text-white font-semibold text-xs rounded-xl transition-all flex items-center gap-2 whitespace-nowrap shadow-md"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span>
                  {isInstalled
                    ? 'App instalado · Ver guia offline'
                    : isInstallable
                    ? 'Instalar no Celular Agora'
                    : 'Ver Como Instalar Offline'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
};
