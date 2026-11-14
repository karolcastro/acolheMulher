import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { CategoryView } from './components/CategoryView';
import { NgosView } from './components/NgosView';
import { PwaShowcase } from './components/PwaShowcase';
import { NgoPartnerArea } from './components/NgoPartnerArea';
import { CamouflageView } from './components/CamouflageView';
import { OfflineAccessModal } from './components/OfflineAccessModal';
import { useOnlineStatus } from './hooks/usePWAInstall';
import { WifiOff } from 'lucide-react';
import { AppSection, CepInfo } from './types';

export default function App() {
  const [activeSection, setActiveSection] = useState<AppSection>('inicio');
  const [currentLocation, setCurrentLocation] = useState<CepInfo | null>(null);
  const [isCamouflaged, setIsCamouflaged] = useState(false);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const isOnline = useOnlineStatus();

  // Quick exit handler: replaces history so back button cannot return
  const handleQuickExit = () => {
    try {
      window.sessionStorage.clear();
      window.localStorage.clear();
    } catch {
      // ignore
    }
    window.location.replace('https://www.google.com');
  };

  // Keyboard shortcut: ESC triggers quick exit immediately
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleQuickExit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isCamouflaged) {
    return <CamouflageView onRestore={() => setIsCamouflaged(false)} />;
  }

  return (
    <div className="min-h-screen bg-[#FAF8F6] text-stone-900 flex flex-col font-sans selection:bg-rose-200 selection:text-rose-900">
      {/* Clean Single-Row Top Header */}
      <Header
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        onQuickExit={handleQuickExit}
        onToggleCamouflage={() => setIsCamouflaged(true)}
      />

      {/* Automatic Offline Banner */}
      {!isOnline && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-950">
          <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-medium">
              <WifiOff className="w-4 h-4 text-amber-700 shrink-0" />
              <span>Você está sem internet. Os telefones de emergência e serviços salvos continuam funcionando.</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOfflineModalOpen(true)}
              className="font-semibold underline hover:text-amber-800 whitespace-nowrap"
            >
              Ver acesso offline
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 w-full px-4 sm:px-6 py-8 md:py-12">
        {activeSection === 'inicio' && (
          <HomeView
            currentLocation={currentLocation}
            onUpdateLocation={setCurrentLocation}
            onSelectSection={setActiveSection}
            onOpenOfflineModal={() => setIsOfflineModalOpen(true)}
          />
        )}

        {activeSection === 'juridico' && (
          <CategoryView
            category="juridico"
            title="Advogada Gratuita & Apoio Jurídico"
            subtitle="Defensoria Pública, Medidas Protetivas e Direito de Família"
            description="Atendimento gratuito com Defensoras Públicas e advogadas para medidas protetivas, pensão alimentícia, guarda e divórcio."
            currentLocation={currentLocation}
            onUpdateLocation={setCurrentLocation}
            onBackToHome={() => setActiveSection('inicio')}
          />
        )}

        {activeSection === 'psicologico' && (
          <CategoryView
            category="psicologico"
            title="Apoio Psicológico"
            subtitle="Clínicas Universitárias, Centros de Referência e CVV"
            description="Escuta humanizada, sigilosa e gratuita para cuidar da sua saúde emocional sem julgamentos."
            currentLocation={currentLocation}
            onUpdateLocation={setCurrentLocation}
            onBackToHome={() => setActiveSection('inicio')}
          />
        )}

        {activeSection === 'saude' && (
          <CategoryView
            category="saude"
            title="Saúde da Mulher: Exames, Parto Humanizado, ONGs & SUS"
            subtitle="Casas de Parto Humanizado, ONGs de Exames Gratuitos e Postos de Saúde"
            description="Encontre casas de parto humanizado gratuito, ONGs e carretas que fazem mamografia e papanicolau sem custo, além de hospitais e atendimento pelo SUS."
            currentLocation={currentLocation}
            onUpdateLocation={setCurrentLocation}
            onBackToHome={() => setActiveSection('inicio')}
          />
        )}

        {activeSection === 'cursos' && (
          <CategoryView
            category="cursos"
            title="Cursos Gratuitos & Renda"
            subtitle="Capacitação Profissional Gratuita, Tecnologia e Negócios"
            description="Cursos gratuitos para você aprender uma nova profissão, abrir um negócio ou conquistar independência financeira."
            currentLocation={currentLocation}
            onUpdateLocation={setCurrentLocation}
            onBackToHome={() => setActiveSection('inicio')}
          />
        )}

        {activeSection === 'emergencia' && (
          <CategoryView
            category="emergencia"
            title="Proteção & Emergência 24h"
            subtitle="Casa da Mulher Brasileira, Delegacias DEAM, 180 e 190"
            description="Atendimento imediato 24 horas para situações de risco, acolhimento seguro para você e seus filhos e ligações gratuitas."
            currentLocation={currentLocation}
            onUpdateLocation={setCurrentLocation}
            onBackToHome={() => setActiveSection('inicio')}
          />
        )}

        {activeSection === 'ongs_apoio' && (
          <NgosView onBackToHome={() => setActiveSection('inicio')} />
        )}

        {activeSection === 'app' && (
          <PwaShowcase onOpenOfflineModal={() => setIsOfflineModalOpen(true)} />
        )}

        {activeSection === 'ongs' && <NgoPartnerArea />}
      </main>

      {/* Quiet, Uncluttered Footer */}
      <footer className="bg-white border-t border-stone-200/80 py-6 text-xs text-stone-600">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>
            <strong className="text-stone-900">AcolheMulher</strong> · Gratuito e sem cadastro
          </span>

          <div className="flex flex-wrap items-center justify-center gap-5">
            <button
              onClick={() => setActiveSection('inicio')}
              className="hover:text-stone-900 transition-colors"
            >
              Início
            </button>
            <button
              onClick={() => setActiveSection('ongs_apoio')}
              className="hover:text-stone-900 transition-colors"
            >
              ONGs que Ajudam
            </button>
            <button
              onClick={() => setIsOfflineModalOpen(true)}
              className="hover:text-stone-900 transition-colors inline-flex items-center gap-1"
            >
              <WifiOff className="w-3.5 h-3.5 text-rose-700" />
              <span>Acesso Offline</span>
            </button>
            <button
              onClick={() => setActiveSection('ongs')}
              className="text-stone-500 hover:text-stone-900 transition-colors"
            >
              Área para ONGs & Parceiros
            </button>
          </div>
        </div>
      </footer>

      <OfflineAccessModal
        isOpen={isOfflineModalOpen}
        onClose={() => setIsOfflineModalOpen(false)}
      />
    </div>
  );
}
