import React, { useState, useEffect } from 'react';
import {
  X,
  WifiOff,
  Wifi,
  Download,
  Smartphone,
  Share,
  MoreVertical,
  PlusSquare,
  Monitor,
  ShieldCheck,
  Phone,
  CheckCircle2
} from 'lucide-react';
import { usePWAInstall, useOnlineStatus } from '../hooks/usePWAInstall';

interface OfflineAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type DeviceTab = 'android' | 'ios' | 'desktop';

export const OfflineAccessModal: React.FC<OfflineAccessModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [activeTab, setActiveTab] = useState<DeviceTab>('android');
  const [installSuccess, setInstallSuccess] = useState(false);

  useEffect(() => {
    if (isIOS) {
      setActiveTab('ios');
    } else if (isAndroid) {
      setActiveTab('android');
    } else if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setActiveTab('desktop');
    }
  }, [isIOS, isAndroid]);

  if (!isOpen) return null;

  const handleDirectInstall = async () => {
    const accepted = await install();
    if (accepted) {
      setInstallSuccess(true);
    }
  };

  const tabs: { id: DeviceTab; label: string }[] = [
    { id: 'android', label: 'Android (Chrome)' },
    { id: 'ios', label: 'iPhone / iPad' },
    { id: 'desktop', label: 'Computador' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0F172A]/75 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="offlineModalTitle"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5 text-blue-700" />
                  <span className="text-blue-800">Conectada · Pronto para salvar offline</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5 text-red-600" />
                  <span className="text-red-700">Sem internet · Dados de emergência salvos</span>
                </>
              )}
            </div>
            <h2
              id="offlineModalTitle"
              className="text-xl font-display font-bold text-slate-900 text-balance"
            >
              Acesso Offline na Tela Inicial
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar instruções de acesso offline"
            className="min-h-[44px] min-w-[44px] -mr-2 -mt-1 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          <p className="text-sm text-slate-600 leading-relaxed">
            Salve o <strong>AcolheMulher</strong> como um atalho na tela inicial do seu celular. Assim, mesmo se seus dados móveis acabarem ou o sinal cair, você ainda consegue abrir o app e acessar os números e locais de emergência.
          </p>

          {(isInstalled || installSuccess) && (
            <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-blue-700 shrink-0 mt-0.5" />
              <div className="text-xs text-blue-950 space-y-0.5">
                <p className="font-bold">Aplicativo já instalado neste aparelho</p>
                <p>Os serviços de emergência e orientações continuam acessíveis mesmo sem internet.</p>
              </div>
            </div>
          )}

          {isInstallable && !isInstalled && !installSuccess && (
            <button
              type="button"
              onClick={() => void handleDirectInstall()}
              className="w-full min-h-[44px] px-4 py-3 rounded-xl bg-gradient-to-r from-pink-600 to-purple-700 hover:from-pink-700 hover:to-purple-800 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>Instalar na Tela Inicial Agora</span>
            </button>
          )}

          {/* Device Selector Tabs */}
          <div className="space-y-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                    activeTab === tab.id
                      ? 'bg-white text-purple-950 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {activeTab === 'android' && (
              <ol className="space-y-3 bg-slate-50 rounded-2xl border border-slate-200 p-4 text-xs sm:text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span>
                    Abra esta página no navegador <strong>Chrome</strong> e toque nos <strong>3 pontinhos</strong>{' '}
                    <MoreVertical className="w-3.5 h-3.5 inline text-slate-800" /> no canto superior direito.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span>
                    Toque em <strong>"Adicionar à tela inicial"</strong> ou <strong>"Instalar aplicativo"</strong>.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span>
                    Confirme em <strong>"Instalar"</strong>. O ícone aparecerá junto aos seus apps, ocupando menos de 2 MB.
                  </span>
                </li>
              </ol>
            )}

            {activeTab === 'ios' && (
              <ol className="space-y-3 bg-slate-50 rounded-2xl border border-slate-200 p-4 text-xs sm:text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span>
                    Abra o AcolheMulher pelo navegador <strong>Safari</strong> no seu iPhone ou iPad.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span>
                    Toque no botão de <strong>Compartilhar</strong>{' '}
                    <Share className="w-3.5 h-3.5 inline text-slate-800" /> na barra inferior da tela.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    3
                  </span>
                  <span>
                    Role para baixo e toque em <strong>"Adicionar à Tela de Início"</strong>{' '}
                    <PlusSquare className="w-3.5 h-3.5 inline text-slate-800" /> e depois em <strong>"Adicionar"</strong>.
                  </span>
                </li>
              </ol>
            )}

            {activeTab === 'desktop' && (
              <ol className="space-y-3 bg-slate-50 rounded-2xl border border-slate-200 p-4 text-xs sm:text-sm text-slate-700">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    1
                  </span>
                  <span>
                    No <strong>Google Chrome</strong> ou <strong>Microsoft Edge</strong>, clique no ícone de{' '}
                    <Monitor className="w-3.5 h-3.5 inline text-slate-800" /> <strong>Instalar</strong> no lado direito da barra de endereço.
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-purple-900 text-white text-xs font-bold flex items-center justify-center shrink-0">
                    2
                  </span>
                  <span>
                    Se não aparecer, abra o menu do navegador (<MoreVertical className="w-3.5 h-3.5 inline" />) e escolha <strong>"Salvar e compartilhar" → "Instalar página como app"</strong>.
                  </span>
                </li>
              </ol>
            )}
          </div>

          {/* Privacy note */}
          <div className="flex items-start gap-2.5 text-xs text-slate-600 bg-purple-50/70 rounded-xl p-3.5 border border-purple-200">
            <ShieldCheck className="w-4 h-4 text-purple-800 shrink-0 mt-0.5" />
            <p>
              <strong>Privacidade garantida:</strong> instalar pelo navegador não deixa registro na Google Play ou App Store da família e não pede e-mail ou senha.
            </p>
          </div>

          {/* Emergency numbers always accessible offline */}
          <div className="rounded-2xl bg-red-50/70 border border-red-200 p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-red-900">
              <Smartphone className="w-4 h-4 text-red-600" />
              <span>Telefones que funcionam mesmo sem internet nem créditos</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <a
                href="tel:180"
                className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-red-200 font-semibold text-slate-900 hover:bg-red-50 transition-colors"
              >
                <span>Ligue 180 (Mulher)</span>
                <Phone className="w-3.5 h-3.5 text-red-600" />
              </a>
              <a
                href="tel:190"
                className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-blue-200 font-semibold text-slate-900 hover:bg-blue-50 transition-colors"
              >
                <span>Polícia 190</span>
                <Phone className="w-3.5 h-3.5 text-blue-700" />
              </a>
              <a
                href="tel:188"
                className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-purple-200 font-semibold text-slate-900 hover:bg-purple-50 transition-colors"
              >
                <span>CVV 188 (Escuta)</span>
                <Phone className="w-3.5 h-3.5 text-purple-700" />
              </a>
              <a
                href="tel:129"
                className="flex items-center justify-between px-3 py-2 bg-white rounded-xl border border-pink-200 font-semibold text-slate-900 hover:bg-pink-50 transition-colors"
              >
                <span>Defensoria 129</span>
                <Phone className="w-3.5 h-3.5 text-pink-700" />
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-blue-900 hover:bg-blue-950 text-white text-xs sm:text-sm font-semibold transition-colors"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
};
