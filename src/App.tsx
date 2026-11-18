import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { HomeView } from './components/HomeView';
import { CategoryView } from './components/CategoryView';
import { NgosView } from './components/NgosView';
import { RightsView } from './components/RightsView';
import { PwaShowcase } from './components/PwaShowcase';
import { NgoPartnerArea } from './components/NgoPartnerArea';
import { CamouflageView } from './components/CamouflageView';
import { OfflineAccessModal } from './components/OfflineAccessModal';
import { CatalogProvider, useCatalog } from './context/CatalogContext';
import { useOnlineStatus } from './hooks/usePWAInstall';
import { WifiOff, Mail, Github, Heart, ExternalLink } from 'lucide-react';
import { AppSection, CepInfo } from './types';
import { recordAnonymousSearchDemand } from './utils/demandAnalytics';

function AppContent() {
  const { syncCatalogForLocation } = useCatalog();
  const [activeSection, setActiveSection] = useState<AppSection>('inicio');
  const [currentLocation, setCurrentLocation] = useState<CepInfo | null>(null);
  const [isCamouflaged, setIsCamouflaged] = useState(false);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const isOnline = useOnlineStatus();

  useEffect(() => {
    if (currentLocation) {
      void syncCatalogForLocation(currentLocation);
    }
  }, [currentLocation, syncCatalogForLocation]);

  const handleNavSectionChange = (section: AppSection) => {
    setActiveSection(section);
    if (
      section === 'emergencia' ||
      section === 'psicologico' ||
      section === 'juridico' ||
      section === 'saude' ||
      section === 'cursos' ||
      section === 'ongs_apoio'
    ) {
      void recordAnonymousSearchDemand(
        section,
        currentLocation,
        section === 'ongs_apoio' ? 'ongs_directory' : 'category_card'
      );
    }
  };

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
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-pink-200 selection:text-purple-950">
      {/* Clean Single-Row Top Header */}
      <Header
        activeSection={activeSection}
        setActiveSection={handleNavSectionChange}
        onQuickExit={handleQuickExit}
        onToggleCamouflage={() => setIsCamouflaged(true)}
      />

      {/* Automatic Offline Banner */}
      {!isOnline && (
        <div className="bg-purple-950 text-white border-b border-purple-800 px-4 sm:px-6 lg:px-8 py-2.5 text-xs">
          <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-medium">
              <WifiOff className="w-4 h-4 text-pink-300 shrink-0" />
              <span>Você está sem internet. Os telefones de emergência e serviços salvos continuam funcionando.</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOfflineModalOpen(true)}
              className="font-semibold text-pink-200 underline hover:text-white whitespace-nowrap"
            >
              Ver acesso offline
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-8 md:py-12">
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

        {activeSection === 'direitos' && (
          <RightsView
            currentLocation={currentLocation}
            onSelectSection={handleNavSectionChange}
            onBackToHome={() => setActiveSection('inicio')}
          />
        )}

        {activeSection === 'ongs_apoio' && (
          <NgosView
            currentLocation={currentLocation}
            onBackToHome={() => setActiveSection('inicio')}
          />
        )}

        {activeSection === 'app' && (
          <PwaShowcase onOpenOfflineModal={() => setIsOfflineModalOpen(true)} />
        )}

        {activeSection === 'ongs' && <NgoPartnerArea />}
      </main>

      {/* Footer with Mission, Creator Contact & Quick Links */}
      <footer className="bg-gradient-to-br from-[#0F172A] via-[#2E1065] to-[#500724] text-slate-200 border-t border-purple-900/60 pt-12 pb-20 sm:pb-10 text-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-10">
            {/* Brand & Mission */}
            <div className="md:col-span-6 space-y-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <strong className="font-display text-lg text-white tracking-tight">
                  Acolhe<span className="text-pink-400">Mulher</span>
                </strong>
                <span className="text-white/30" aria-hidden="true">·</span>
                <span className="text-pink-200 font-medium">Gratuito, seguro e sem cadastro</span>
              </div>

              <div className="space-y-1.5">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-pink-300 flex items-center gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  <span>Minha missão com este projeto</span>
                </p>
                <p className="text-xs sm:text-sm text-slate-200/95 leading-relaxed max-w-xl">
                  Usar a tecnologia com humanidade e acolhimento para conectar mulheres em situação de vulnerabilidade, em todo o Brasil, a serviços gratuitos de proteção, saúde, apoio psicológico, orientação jurídica e capacitação profissional — sem exigir cadastro, sem expor dados e com busca imediata por CEP ou voz.
                </p>
              </div>

              <p className="text-xs text-slate-300 pt-1">
                Idealizado e desenvolvido por <strong className="text-white">Karol Castro</strong> · Projeto aberto nascido na Formação <span className="text-pink-300 font-medium">{`{reprograma}`}</span>.
              </p>
            </div>

            {/* Creator Contact */}
            <div className="md:col-span-4 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-200">
                Contato & Colaboração
              </p>
              <p className="text-xs text-slate-300 leading-relaxed">
                Quer indicar um serviço gratuito, propor parceria com uma ONG ou conversar sobre o projeto? Fale comigo:
              </p>
              <div className="space-y-2 pt-0.5">
                <a
                  href="mailto:karolinycosta@yahoo.com.br"
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-white hover:text-pink-300 transition-colors break-all"
                >
                  <Mail className="w-4 h-4 text-pink-400 shrink-0" />
                  <span>karolinycosta@yahoo.com.br</span>
                </a>
                <div className="flex flex-col gap-1.5">
                  <a
                    href="https://github.com/karolcastro"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-slate-200 hover:text-pink-300 transition-colors"
                  >
                    <Github className="w-4 h-4 text-blue-300 shrink-0" />
                    <span>GitHub: @karolcastro</span>
                    <ExternalLink className="w-3 h-3 text-slate-400 shrink-0" />
                  </a>
                  <a
                    href="https://github.com/karolcastro/acolheMulher"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-xs text-slate-300 hover:text-pink-300 transition-colors"
                  >
                    <ExternalLink className="w-4 h-4 text-purple-300 shrink-0" />
                    <span>Repositório oficial: karolcastro/acolheMulher</span>
                  </a>
                </div>
              </div>
            </div>

            {/* Quick Navigation */}
            <div className="md:col-span-2 space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-purple-200">
                Acesso Rápido
              </p>
              <nav aria-label="Navegação do rodapé" className="flex flex-col items-start gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveSection('inicio')}
                  className="py-1 text-slate-200 hover:text-pink-300 transition-colors text-left"
                >
                  Início
                </button>
                <button
                  type="button"
                  onClick={() => handleNavSectionChange('direitos')}
                  className="py-1 text-slate-200 hover:text-pink-300 transition-colors text-left"
                >
                  Seus Direitos (Fácil)
                </button>
                <button
                  type="button"
                  onClick={() => handleNavSectionChange('ongs_apoio')}
                  className="py-1 text-slate-200 hover:text-pink-300 transition-colors text-left"
                >
                  ONGs que Ajudam
                </button>
                <button
                  type="button"
                  onClick={() => setIsOfflineModalOpen(true)}
                  className="py-1 text-slate-200 hover:text-pink-300 transition-colors inline-flex items-center gap-1.5 text-left"
                >
                  <WifiOff className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                  <span>Acesso Offline</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSection('ongs')}
                  className="py-1 text-slate-300 hover:text-blue-200 transition-colors text-left"
                >
                  Área para ONGs & Parceiros
                </button>
              </nav>
            </div>
          </div>

          <div className="pt-6 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-300">
            <span>© {new Date().getFullYear()} AcolheMulher · Por Karol Castro</span>
            <span className="text-center sm:text-right text-slate-300">
              Privacidade total: não exigimos login e não guardamos seu histórico de busca.
            </span>
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

export default function App() {
  return (
    <CatalogProvider>
      <AppContent />
    </CatalogProvider>
  );
}
