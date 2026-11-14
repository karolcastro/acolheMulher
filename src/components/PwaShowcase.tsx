import React from 'react';
import { Smartphone, Download, Zap, WifiOff, ShieldCheck, Check, Lock } from 'lucide-react';
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
    <div className="space-y-12 max-w-5xl mx-auto">
      
      {/* Intro Header */}
      <section className="bg-white rounded-3xl border border-stone-200 p-8 md:p-10 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-rose-700 text-xs font-bold uppercase tracking-wider">
          <Smartphone className="w-4 h-4" />
          <span>Arquitetura da Plataforma e Aplicativo</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 leading-tight">
          "Plataforma ou App?": Como o PWA entrega os dois juntos
        </h1>

        <p className="text-base text-stone-600 leading-relaxed max-w-3xl">
          Para atender mulheres em situação de vulnerabilidade sem barreiras, a melhor solução é uma 
          <strong> Progressive Web App (PWA)</strong>. Veja as 4 vantagens práticas que fazem o aplicativo funcionar no celular sem passar pela burocracia das lojas de aplicativos:
        </p>
      </section>

      {/* 4 Reasons why PWA wins for vulnerable women */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        <div className="bg-white p-6 rounded-3xl border border-stone-200 space-y-3 shadow-sm">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-stone-900 text-base">
            1. Não deixa rastro na conta Google / Apple da família
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Se uma mulher baixa um aplicativo da Play Store ou App Store, o nome do app fica gravado no histórico de compras da conta familiar (geralmente vinculada ao cartão ou e-mail que o parceiro monitora). O PWA funciona direto pelo link seguro sem deixar histórico na loja.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-stone-200 space-y-3 shadow-sm">
          <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
            <Zap className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-stone-900 text-base">
            2. Pesa menos de 2 MB (Não trava celular com pouca memória)
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Muitas mulheres das classes C, D e E usam celulares básicos com armazenamento lotado que recusam novos aplicativos de 100 MB. O PWA instala em apenas 1 segundo, ocupando menos espaço do que uma única foto do WhatsApp.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-stone-200 space-y-3 shadow-sm">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
            <WifiOff className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-stone-900 text-base">
            3. Funciona mesmo sem internet (Modo Offline de Emergência)
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Se os dados móveis acabarem no meio da rua, a tecnologia de <em>Service Worker</em> do PWA mantém os números de telefone de socorro (180, 190, Defensoria) e os endereços já consultados salvos no aparelho.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-stone-200 space-y-3 shadow-sm">
          <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-800 flex items-center justify-center font-bold">
            <Smartphone className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-stone-900 text-base">
            4. Um único código para Web, Android e iPhone
          </h3>
          <p className="text-xs text-stone-600 leading-relaxed">
            Criar apps nativos separados exigiria programar duas vezes (uma para Android e outra para iOS), pagar taxas anuais em dólar para a Apple e esperar dias por aprovação. Com PWA, você lança imediatamente para qualquer dispositivo.
          </p>
        </div>

      </div>

      {/* Interactive Mobile Device Simulator */}
      <section className="bg-stone-900 text-white rounded-3xl p-8 md:p-12 shadow-xl">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row items-center gap-10">
          
          {/* Smartphone Frame Mockup */}
          <div className="w-[300px] h-[580px] bg-stone-950 rounded-[48px] p-3.5 border-4 border-stone-700 shadow-2xl relative shrink-0">
            {/* Notch / Speaker */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 w-28 h-4 bg-stone-900 rounded-full z-20 flex items-center justify-center">
              <div className="w-3 h-3 rounded-full bg-stone-800" />
            </div>

            {/* Screen Content */}
            <div className="w-full h-full bg-stone-50 rounded-[38px] overflow-hidden flex flex-col justify-between text-stone-900 font-sans text-xs">
              
              {/* App Bar */}
              <div className="bg-white pt-8 pb-3 px-4 border-b border-stone-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-[10px]">
                    AM
                  </div>
                  <span className="font-bold text-stone-900 text-xs">AcolheMulher</span>
                </div>
                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[9px] rounded font-semibold">
                  Sem Login
                </span>
              </div>

              {/* Scrollable Mini Feed */}
              <div className="p-4 space-y-3 overflow-y-auto">
                <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-xs space-y-1.5">
                  <div className="text-[10px] text-rose-700 font-bold uppercase">Busca por CEP</div>
                  <div className="p-2 bg-stone-100 rounded-lg text-[11px] text-stone-500 font-mono">
                    CEP: 01001-000
                  </div>
                  <div className="text-[10px] text-emerald-700 font-medium">
                    ✓ 8 serviços encontrados no raio
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-xs space-y-1">
                  <div className="font-bold text-[11px] text-stone-900">Casa da Mulher Brasileira</div>
                  <div className="text-[10px] text-stone-500">Atendimento e abrigo 24h</div>
                  <div className="flex gap-1.5 pt-1">
                    <span className="px-2 py-1 bg-stone-900 text-white rounded text-[9px] font-bold">Ligar 24h</span>
                    <span className="px-2 py-1 bg-stone-100 text-stone-700 rounded text-[9px]">Ver Rota</span>
                  </div>
                </div>

                <div className="bg-white p-3 rounded-xl border border-stone-200 shadow-xs space-y-1">
                  <div className="font-bold text-[11px] text-stone-900">Defensoria Pública (NUDEM)</div>
                  <div className="text-[10px] text-stone-500">Advogada gratuita sem taxa</div>
                  <span className="inline-block px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded text-[9px] font-medium">
                    Porta Aberta
                  </span>
                </div>
              </div>

              {/* Bottom Touch Bar */}
              <div className="bg-white p-3 border-t border-stone-200 flex items-center justify-around text-[10px] text-stone-600">
                <span className="text-rose-700 font-bold">Início</span>
                <span>Mapa</span>
                <span>Cursos</span>
                <span className="text-rose-600 font-bold">Ligue 180</span>
              </div>

            </div>
          </div>

          {/* Explanation Text */}
          <div className="space-y-5">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-white">
              Como funciona na prática para a usuária?
            </h2>

            <p className="text-stone-300 text-sm leading-relaxed">
              Quando a mulher acessa pelo celular no Chrome ou Safari, o próprio navegador exibe a opção amigável:
              <br />
              <strong className="text-white">"Deseja adicionar o AcolheMulher à sua tela de início?"</strong>
            </p>

            <div className="space-y-2 text-xs text-stone-300">
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Cria um ícone na tela do celular como se fosse um app da loja.</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Abre em tela cheia sem a barra de endereços do navegador.</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Pode ter o nome do ícone disfarçado (ex: "Notas" ou "Receitas").</span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleInstallClick()}
                className="px-5 py-3 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl transition-all shadow flex items-center gap-2 whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
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
