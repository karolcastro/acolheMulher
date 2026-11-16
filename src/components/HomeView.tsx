import React, { useEffect, useRef, useState } from 'react';
import { AppSection, CepInfo } from '../types';
import { useCatalog } from '../context/CatalogContext';
import { CepVoiceSearchBar, SearchResolvedPayload } from './CepVoiceSearchBar';
import { SupportTriageAgent } from './SupportTriageAgent';
import { recordAnonymousSearchDemand } from '../utils/demandAnalytics';
import heroWomanRefugeImg from '../assets/images/hero_woman_refuge_1794861297510.jpg';
import {
  MapPin,
  Scale,
  HeartHandshake,
  Stethoscope,
  GraduationCap,
  ShieldAlert,
  Users,
  Phone,
  ExternalLink,
  X,
  Share2,
  WifiOff,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface HomeViewProps {
  currentLocation: CepInfo | null;
  onUpdateLocation: (cepInfo: CepInfo | null) => void;
  onSelectSection: (section: AppSection) => void;
  onOpenOfflineModal: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  currentLocation,
  onUpdateLocation,
  onSelectSection,
  onOpenOfflineModal
}) => {
  const { ngos } = useCatalog();
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const scrollPosRef = useRef<number>(0);
  const ignoreAnimUntilRef = useRef<number>(0);
  const [activeNgoIndex, setActiveNgoIndex] = useState(0);
  const [isHoverPaused, setIsHoverPaused] = useState(false);
  const [selectedNeed, setSelectedNeed] = useState<AppSection | null>(null);
  const [lastUserNeedText, setLastUserNeedText] = useState<string | null>(null);
  const [agentOpen, setAgentOpen] = useState<boolean>(Boolean(currentLocation));

  const handleHeroSearchResult = (payload: SearchResolvedPayload) => {
    setAgentOpen(true);
    const resolvedLocation = payload.cepInfo ?? currentLocation;
    if (payload.suggestedSection) {
      setSelectedNeed(payload.suggestedSection);
      setLastUserNeedText(payload.rawQuery);
      void recordAnonymousSearchDemand(payload.suggestedSection, resolvedLocation);
    } else {
      setSelectedNeed(null);
      setLastUserNeedText(null);
      if (resolvedLocation) {
        void recordAnonymousSearchDemand('geral', resolvedLocation);
      }
    }
  };

  const handleOpenSection = (section: AppSection) => {
    void recordAnonymousSearchDemand(section, currentLocation);
    onSelectSection(section);
  };

  const getLoopWidth = (container: HTMLDivElement): number => {
    if (ngos.length === 0) return 0;
    const first = container.children[0] as HTMLElement | undefined;
    const secondSetFirst = container.children[ngos.length] as HTMLElement | undefined;
    if (first && secondSetFirst) {
      return Math.max(1, secondSetFirst.offsetLeft - first.offsetLeft);
    }
    return Math.max(1, container.scrollWidth / 2);
  };

  const scrollToNgo = (targetIndex: number) => {
    if (ngos.length === 0) return;
    const normalized = ((targetIndex % ngos.length) + ngos.length) % ngos.length;
    setActiveNgoIndex(normalized);

    const container = carouselRef.current;
    if (!container) return;
    const card = container.children[normalized] as HTMLElement | undefined;
    if (!card) return;

    ignoreAnimUntilRef.current = Date.now() + 600;
    scrollPosRef.current = card.offsetLeft;
    container.scrollTo({ left: card.offsetLeft, behavior: 'smooth' });
  };

  useEffect(() => {
    if (ngos.length <= 1 || isHoverPaused) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    let rafId = 0;
    let lastTime = performance.now();
    const SPEED_PX_PER_SEC = 34;

    const tick = (now: number) => {
      const dt = Math.min(64, now - lastTime);
      lastTime = now;

      const container = carouselRef.current;
      if (container && Date.now() >= ignoreAnimUntilRef.current) {
        const loopWidth = getLoopWidth(container);
        if (loopWidth > 1) {
          let nextPos = scrollPosRef.current + (dt / 1000) * SPEED_PX_PER_SEC;
          if (nextPos >= loopWidth) {
            nextPos -= loopWidth;
          }
          scrollPosRef.current = nextPos;
          container.scrollLeft = nextPos;

          const step = loopWidth / ngos.length;
          const nextActive = Math.floor(((nextPos + step * 0.35) % loopWidth) / step) % ngos.length;
          setActiveNgoIndex((prev) => (prev !== nextActive ? nextActive : prev));
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(rafId);
  }, [ngos.length, isHoverPaused]);

  const handleCarouselScroll = () => {
    const container = carouselRef.current;
    if (!container || ngos.length === 0) return;
    if (Date.now() < ignoreAnimUntilRef.current) return;

    const loopWidth = getLoopWidth(container);
    if (loopWidth <= 1) return;

    if (isHoverPaused) {
      let current = container.scrollLeft;
      if (current >= loopWidth) {
        current = current % loopWidth;
        container.scrollLeft = current;
      }
      scrollPosRef.current = current;
      const step = loopWidth / ngos.length;
      const nextActive = Math.floor(((current + step * 0.35) % loopWidth) / step) % ngos.length;
      setActiveNgoIndex((prev) => (prev !== nextActive ? nextActive : prev));
    }
  };

  const secondaryCategories: {
    id: AppSection;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    iconBg: string;
    hoverBorder: string;
    hoverTitle: string;
  }[] = [
    {
      id: 'juridico',
      title: 'Advogada Gratuita',
      subtitle: 'Medidas protetivas, pensão e guarda',
      icon: <Scale className="w-5 h-5 text-blue-700" />,
      iconBg: 'bg-blue-50',
      hoverBorder: 'hover:border-blue-300',
      hoverTitle: 'group-hover:text-blue-800'
    },
    {
      id: 'saude',
      title: 'Saúde da Mulher',
      subtitle: 'Exames grátis, parto humanizado e SUS',
      icon: <Stethoscope className="w-5 h-5 text-pink-700" />,
      iconBg: 'bg-pink-50',
      hoverBorder: 'hover:border-pink-300',
      hoverTitle: 'group-hover:text-pink-700'
    },
    {
      id: 'cursos',
      title: 'Cursos Gratuitos',
      subtitle: 'Aprender uma profissão e ter renda',
      icon: <GraduationCap className="w-5 h-5 text-indigo-700" />,
      iconBg: 'bg-indigo-50',
      hoverBorder: 'hover:border-indigo-300',
      hoverTitle: 'group-hover:text-indigo-800'
    },
    {
      id: 'ongs_apoio',
      title: 'ONGs que Ajudam',
      subtitle: 'Projetos gratuitos com voluntárias',
      icon: <Users className="w-5 h-5 text-purple-700" />,
      iconBg: 'bg-purple-50',
      hoverBorder: 'hover:border-purple-300',
      hoverTitle: 'group-hover:text-purple-800'
    }
  ];

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://acolhemulher.org.br';

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    `Conheça o AcolheMulher: plataforma gratuita e sem cadastro para encontrar delegacias da mulher, apoio psicológico, advogada gratuita, exames e parto humanizado, cursos e ONGs pelo CEP. Acesse: ${shareUrl}`
  )}`;

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8 -mt-8 md:-mt-12 -mb-8 md:-mb-12 overflow-x-clip">

      {/* Zona 1: Hero Fotográfico Full-Bleed + Dock Frosted Glass ("Busque aqui") */}
      <section
        aria-label="Busca principal"
        className="relative overflow-hidden bg-[#0F172A] border-b border-purple-950/60"
      >
        {/* Full-bleed Documentary Image Backdrop */}
        <div className="absolute inset-0">
          {!heroImgFailed ? (
            <img
              src={heroWomanRefugeImg}
              alt="Mulher sentada próxima a uma janela iluminada abraçando os joelhos em ambiente acolhedor e sereno"
              referrerPolicy="no-referrer"
              onError={() => setHeroImgFailed(true)}
              className="w-full h-full object-cover object-[78%_center] sm:object-right opacity-85"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#0F172A] via-[#2E1065] to-[#831843]" />
          )}

          {/* Directional Contrast Scrim: Deep Navy Blue -> Deep Purple -> Magenta Pink */}
          <div
            className="absolute inset-0 bg-gradient-to-r from-[#0F172A]/95 via-[#2E1065]/85 to-[#831843]/40"
            aria-hidden="true"
          />
          <div
            className="absolute inset-0 bg-gradient-to-t from-[#0F172A]/85 via-transparent to-[#0F172A]/35 sm:hidden"
            aria-hidden="true"
          />
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="max-w-2xl space-y-6">
            <div className="space-y-3">
              <p className="text-xs font-semibold text-pink-300 tracking-wide">
                Rede pública e solidária · Sem cadastro e sem rastro
              </p>
              <h1 className="text-[clamp(2rem,4.3vw,3.35rem)] font-display font-bold text-white tracking-tight leading-[1.08] text-balance">
                Você não está sozinha. Encontre apoio gratuito agora.
              </h1>
              <p className="text-sm sm:text-base text-slate-200 max-w-xl leading-relaxed">
                Tudo gratuito, sem login e sem senha. Digite seu CEP ou fale pelo microfone para encontrar proteção, psicóloga, advogada, saúde e cursos perto de você.
              </p>
            </div>

            {/* Frosted Glass White Search Dock — Unmistakable Primary Focus */}
            <div className="bg-white/95 backdrop-blur-xl rounded-2xl p-4 sm:p-5 shadow-2xl border border-white/70 space-y-3">
              <label
                htmlFor="homeCepInput"
                className="block text-xs font-bold text-purple-950 tracking-wide"
              >
                Busque aqui pelo seu CEP, cidade ou voz
              </label>

              <CepVoiceSearchBar
                variant="hero"
                inputId="homeCepInput"
                onLocationResolved={onUpdateLocation}
                onSearchResult={handleHeroSearchResult}
              />

              {(agentOpen || currentLocation || selectedNeed) && (
                <SupportTriageAgent
                  currentLocation={currentLocation}
                  selectedNeed={selectedNeed}
                  lastUserNeedText={lastUserNeedText}
                  onUpdateNeed={(section, userText) => {
                    setSelectedNeed(section);
                    setLastUserNeedText(userText ?? null);
                    if (section) {
                      void recordAnonymousSearchDemand(section, currentLocation);
                    }
                  }}
                  onOpenSection={handleOpenSection}
                  onClearLocation={() => {
                    onUpdateLocation(null);
                    setSelectedNeed(null);
                    setLastUserNeedText(null);
                    setAgentOpen(false);
                  }}
                />
              )}

              <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-slate-600 pt-0.5">
                {currentLocation ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-950 rounded-xl border border-blue-200 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    <span>
                      Locais em <strong>{currentLocation.localidade} - {currentLocation.uf}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateLocation(null);
                        setSelectedNeed(null);
                        setLastUserNeedText(null);
                        setAgentOpen(false);
                      }}
                      className="ml-0.5 p-1 hover:bg-blue-100 rounded-lg text-blue-800 transition-colors"
                      title="Remover CEP"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <span className="text-slate-500">
                    Nenhuma busca fica salva no aparelho ou no servidor.
                  </span>
                )}

                <button
                  type="button"
                  onClick={onOpenOfflineModal}
                  className="inline-flex items-center gap-1.5 font-semibold text-purple-900 hover:text-pink-700 transition-colors py-1"
                >
                  <WifiOff className="w-3.5 h-3.5 text-pink-700 shrink-0" />
                  <span className="underline underline-offset-2">Usar sem internet (Offline)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Zona 2: Escolha o apoio que você precisa (Superfície clara assimétrica estilo Bento) */}
      <section aria-label="Escolha o tipo de ajuda" className="bg-[#F8FAFC] border-b border-slate-200 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 border-b border-slate-200">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-pink-700">
                Áreas de atendimento gratuito
              </p>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-slate-900">
                Escolha o apoio que você precisa
              </h2>
            </div>
            <span className="text-xs text-slate-600">
              Toque em qualquer área para ver contatos gratuitos
            </span>
          </div>

          <div className="space-y-4 sm:space-y-5">
            {/* Tier 1: Urgência e Escuta (Bento Assimétrico) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
              <button
                type="button"
                onClick={() => handleOpenSection('emergencia')}
                className="lg:col-span-7 min-h-[116px] rounded-2xl p-6 sm:p-7 text-left flex items-center justify-between gap-4 bg-gradient-to-r from-red-600 via-rose-600 to-pink-700 hover:from-red-700 hover:to-pink-800 text-white shadow-md hover:shadow-lg transition-all duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-13 h-13 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                    <ShieldAlert className="w-6 h-6 text-white" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="text-[11px] font-semibold text-pink-100 uppercase tracking-wider">
                      Atendimento prioritário
                    </div>
                    <h3 className="text-lg sm:text-xl font-display font-bold text-white truncate">
                      Proteção 24h
                    </h3>
                    <p className="text-xs sm:text-sm text-rose-50 leading-snug">
                      Delegacia da Mulher, abrigo sigiloso, Casa da Mulher e 180
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-white/80 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>

              <button
                type="button"
                onClick={() => handleOpenSection('psicologico')}
                className="lg:col-span-5 min-h-[116px] rounded-2xl p-6 sm:p-7 text-left flex items-center justify-between gap-4 bg-white border border-purple-200/90 hover:border-purple-400 shadow-xs hover:shadow-md transition-all duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-700"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="w-13 h-13 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200">
                    <HeartHandshake className="w-6 h-6 text-purple-700" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="text-[11px] font-semibold text-purple-700 uppercase tracking-wider">
                      Escuta acolhedora
                    </div>
                    <h3 className="text-lg font-display font-bold text-slate-900 group-hover:text-purple-800 transition-colors truncate">
                      Apoio Psicológico
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-snug">
                      Conversar com psicóloga grátis, presencial ou online
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-purple-700 group-hover:translate-x-1 transition-all shrink-0" />
              </button>
            </div>

            {/* Tier 2: 4 Áreas Complementares */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
              {secondaryCategories.map((tile) => (
                <button
                  key={tile.id}
                  type="button"
                  onClick={() => handleOpenSection(tile.id)}
                  className={`min-h-[96px] rounded-2xl border border-slate-200/90 bg-white hover:bg-white p-5 text-left flex items-center justify-between gap-3 shadow-xs hover:shadow-md transition-all duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-600 ${tile.hoverBorder}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`w-11 h-11 rounded-xl ${tile.iconBg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200`}>
                      {tile.icon}
                    </div>
                    <div className="min-w-0">
                      <h3 className={`text-sm sm:text-base font-display font-bold text-slate-900 transition-colors truncate ${tile.hoverTitle}`}>
                        {tile.title}
                      </h3>
                      <p className="text-xs text-slate-600 mt-0.5 leading-snug">
                        {tile.subtitle}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-pink-700 group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Zona 3: Carrossel Contínuo de ONGs (Faixa futurista Azul-Roxo-Rosa para separação nítida) */}
      <section
        aria-label="ONGs em destaque que podem ajudar"
        className="bg-gradient-to-br from-[#0F172A] via-[#2E1065] to-[#500724] text-white py-12 sm:py-16"
        onMouseEnter={() => setIsHoverPaused(true)}
        onMouseLeave={() => setIsHoverPaused(false)}
        onFocusCapture={() => setIsHoverPaused(true)}
        onBlurCapture={() => setIsHoverPaused(false)}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-7">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-4 border-b border-white/15">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-pink-300">
                Rede solidária e voluntária
              </p>
              <h2 className="text-xl sm:text-2xl font-display font-bold text-white">
                ONGs em destaque que podem ajudar
              </h2>
              <p className="text-xs sm:text-sm text-slate-300">
                Apoio gratuito de psicólogas, advogadas e voluntárias em todo o Brasil.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => scrollToNgo(activeNgoIndex - 1)}
                aria-label="ONG anterior"
                className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => scrollToNgo(activeNgoIndex + 1)}
                aria-label="Próxima ONG"
                className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-white/20 bg-white/10 text-white hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => handleOpenSection('ongs_apoio')}
                className="min-h-[40px] inline-flex items-center gap-1 pl-2 text-xs font-semibold text-pink-300 hover:text-white whitespace-nowrap shrink-0 hover:underline underline-offset-4 tabular-nums"
              >
                <span>Ver todas ({ngos.length})</span>
              </button>
            </div>
          </div>

          {/* Seamless Continuous Carousel Track */}
          <div
            ref={carouselRef}
            onScroll={handleCarouselScroll}
            onTouchStart={() => setIsHoverPaused(true)}
            onTouchEnd={() => setIsHoverPaused(false)}
            role="region"
            aria-roledescription="carrossel"
            aria-label="Lista interativa de ONGs parceiras"
            className="relative flex gap-5 overflow-x-auto scrollbar-none pb-1"
          >
            {[...ngos, ...ngos].map((ngo, idx) => {
              const logicalIndex = idx % ngos.length;
              const isDuplicate = idx >= ngos.length;
              const isActive = logicalIndex === activeNgoIndex;
              return (
                <article
                  key={`${ngo.id}-${isDuplicate ? 'loop' : 'base'}`}
                  aria-hidden={isDuplicate ? true : undefined}
                  className={`w-[86%] sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.835rem)] shrink-0 bg-white/95 text-slate-900 rounded-2xl border p-6 flex flex-col justify-between gap-5 transition-all duration-200 ${
                    isActive
                      ? 'border-pink-400 shadow-lg'
                      : 'border-white/40 hover:border-pink-300'
                  }`}
                >
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-slate-500">
                      <span className="text-pink-700 font-semibold">{ngo.areaLabel}</span>
                      <span className="text-slate-300" aria-hidden="true">·</span>
                      <span className="truncate">{ngo.coverage}</span>
                    </div>
                    <h3 className="text-base font-display font-bold text-slate-900 leading-snug">
                      {ngo.name}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-3">
                      {ngo.summary}
                    </p>
                  </div>

                  <a
                    href={ngo.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    tabIndex={isDuplicate ? -1 : undefined}
                    className="min-h-[44px] inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 bg-gradient-to-r from-blue-900 to-purple-900 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-semibold rounded-xl transition-all whitespace-nowrap"
                  >
                    <span>Acessar ONG</span>
                    <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  </a>
                </article>
              );
            })}
          </div>

          {/* Interactive Pagination Bars */}
          <div className="flex items-center justify-center gap-1.5 pt-1" role="tablist" aria-label="Selecionar ONG no carrossel">
            {ngos.map((ngo, idx) => {
              const active = idx === activeNgoIndex;
              return (
                <button
                  key={ngo.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  aria-label={`Mostrar ${ngo.name}`}
                  onClick={() => scrollToNgo(idx)}
                  className="py-2 px-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 rounded"
                >
                  <span
                    className={`block h-1.5 rounded-full transition-all duration-300 ${
                      active ? 'w-7 bg-pink-500' : 'w-2 bg-white/25 hover:bg-white/45'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Zona 4: Plantão Telefônico 24h (Faixa branca nítida com Vermelho e Azul) */}
      <section aria-label="Atendimento telefônico 24 horas" className="bg-white border-t border-slate-200 py-11 sm:py-12 pb-20 sm:pb-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left space-y-1.5">
            <p className="text-xs font-semibold text-red-600 tracking-wide">
              Plantão telefônico imediato
            </p>
            <h2 className="text-xl font-display font-bold text-slate-900">
              Precisa falar com alguém agora?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Ligação gratuita 24 horas em todo o Brasil, funcionando mesmo sem créditos no celular.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href="tel:180"
              className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap tabular-nums shadow-xs"
            >
              <Phone className="w-3.5 h-3.5 shrink-0" />
              <span>Ligar 180</span>
            </a>
            <a
              href="tel:190"
              className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap tabular-nums shadow-xs"
            >
              <Phone className="w-3.5 h-3.5 shrink-0" />
              <span>Polícia 190</span>
            </a>
          </div>
        </div>
      </section>

      {/* Compact Floating WhatsApp Share Button (Main Page Only) */}
      <a
        href={whatsappShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Compartilhar AcolheMulher no WhatsApp"
        aria-label="Compartilhar link do AcolheMulher no WhatsApp"
        className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-purple-800 hover:bg-purple-900 text-white text-xs font-semibold shadow-lg transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-700 focus-visible:ring-offset-2"
      >
        <Share2 className="w-3.5 h-3.5 shrink-0" />
        <span>WhatsApp</span>
      </a>

    </div>
  );
};
