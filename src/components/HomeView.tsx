import React, { useEffect, useRef, useState } from 'react';
import { AppSection, CepInfo } from '../types';
import { useCatalog } from '../context/CatalogContext';
import { CepVoiceSearchBar } from './CepVoiceSearchBar';
import heroSanctuaryImg from '../assets/images/hero_sanctuary_warm_1794857710961.jpg';
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
  ChevronRight,
  ShieldCheck
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

  const visualTiles: {
    id: AppSection;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    iconBg: string;
    featured?: boolean;
  }[] = [
    {
      id: 'emergencia',
      title: 'Proteção 24h',
      subtitle: 'Delegacia da Mulher, abrigo e 180',
      icon: <ShieldAlert className="w-6 h-6 text-rose-800" />,
      iconBg: 'bg-rose-100/80',
      featured: true
    },
    {
      id: 'psicologico',
      title: 'Apoio Psicológico',
      subtitle: 'Conversar com psicóloga grátis',
      icon: <HeartHandshake className="w-6 h-6 text-teal-800" />,
      iconBg: 'bg-teal-50'
    },
    {
      id: 'juridico',
      title: 'Advogada Gratuita',
      subtitle: 'Medidas protetivas, pensão e guarda',
      icon: <Scale className="w-6 h-6 text-indigo-800" />,
      iconBg: 'bg-indigo-50'
    },
    {
      id: 'saude',
      title: 'Saúde da Mulher',
      subtitle: 'Exames grátis, parto humanizado, ONGs e SUS',
      icon: <Stethoscope className="w-6 h-6 text-emerald-800" />,
      iconBg: 'bg-emerald-50'
    },
    {
      id: 'cursos',
      title: 'Cursos Gratuitos',
      subtitle: 'Aprender uma profissão e ter renda',
      icon: <GraduationCap className="w-6 h-6 text-amber-800" />,
      iconBg: 'bg-amber-50'
    },
    {
      id: 'ongs_apoio',
      title: 'ONGs que Ajudam',
      subtitle: 'Projetos gratuitos com voluntárias',
      icon: <Users className="w-6 h-6 text-rose-800" />,
      iconBg: 'bg-rose-50'
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
    <div className="space-y-14 max-w-6xl mx-auto pb-16 sm:pb-6">

      {/* 1. Asymmetric Editorial Split Hero + CEP & Voice Search */}
      <section className="grid grid-cols-1 lg:grid-cols-12 items-stretch gap-8 lg:gap-10 pt-1">
        <div className="lg:col-span-7 flex flex-col justify-center space-y-6 text-center lg:text-left">
          <div className="space-y-3">
            <p className="text-xs font-semibold text-rose-800 tracking-wide">
              Rede pública e solidária · Sem cadastro e sem rastro
            </p>
            <h1 className="text-[clamp(2rem,4vw,3.15rem)] font-serif font-bold text-stone-900 tracking-tight leading-[1.1] text-balance">
              Como podemos te ajudar hoje?
            </h1>
            <p className="text-sm sm:text-base text-stone-600 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Tudo gratuito, sem login e sem senha. Digite seu CEP, fale pelo microfone ou toque diretamente no tipo de apoio que você precisa.
            </p>
          </div>

          <div className="max-w-xl mx-auto lg:mx-0 w-full space-y-3">
            <CepVoiceSearchBar
              variant="hero"
              inputId="homeCepInput"
              onLocationResolved={onUpdateLocation}
              onSectionSuggested={onSelectSection}
            />

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2 text-xs text-stone-600 pt-0.5">
              {currentLocation && (
                <>
                  <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 text-emerald-950 rounded-xl border border-emerald-200 font-medium">
                    <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                    <span>
                      Mostrando locais em <strong>{currentLocation.localidade} - {currentLocation.uf}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateLocation(null)}
                      className="ml-1 p-1 hover:bg-emerald-100 rounded-lg text-emerald-800"
                      title="Remover CEP"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <span className="hidden sm:inline text-stone-300" aria-hidden="true">·</span>
                </>
              )}

              <button
                type="button"
                onClick={onOpenOfflineModal}
                className="inline-flex items-center gap-1.5 font-medium text-stone-600 hover:text-rose-800 transition-colors py-1"
              >
                <WifiOff className="w-3.5 h-3.5 text-rose-800 shrink-0" />
                <span className="underline underline-offset-2">Usar sem internet (Offline)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Desktop Editorial Sanctuary Visual */}
        <div className="hidden lg:block lg:col-span-5">
          <div className="relative h-full min-h-[340px] rounded-3xl overflow-hidden border border-stone-200/80 bg-stone-100">
            {!heroImgFailed ? (
              <img
                src={heroSanctuaryImg}
                alt="Ambiente acolhedor e sereno iluminado pela luz da manhã com vaso de cerâmica e ramos verdes"
                referrerPolicy="no-referrer"
                onError={() => setHeroImgFailed(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-rose-50 via-stone-100 to-amber-50 flex flex-col items-center justify-center p-8 text-center gap-3">
                <ShieldCheck className="w-10 h-10 text-rose-800/70" />
                <p className="font-serif text-lg text-stone-800">Espaço seguro e sem cadastro</p>
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-stone-950/75 via-stone-950/30 to-transparent">
              <p className="text-xs font-medium text-stone-100 leading-relaxed">
                Atendimento gratuito, sigiloso e imediato em todo o Brasil. Nenhuma busca fica salva.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Big, Friendly, Visual 1-Tap Tiles */}
      <section aria-label="Escolha o tipo de ajuda" className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-lg sm:text-xl font-serif font-bold text-stone-900">
            Escolha o apoio que você precisa
          </h2>
          <span className="hidden sm:inline text-xs text-stone-500">
            Toque em qualquer área para ver contatos gratuitos
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visualTiles.map((tile) => (
            <button
              key={tile.id}
              type="button"
              onClick={() => onSelectSection(tile.id)}
              className={`min-h-[96px] rounded-2xl border p-5 sm:p-6 text-left flex items-center justify-between gap-4 transition-all duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 ${
                tile.featured
                  ? 'bg-rose-50/55 hover:bg-rose-50 border-rose-200/90 hover:border-rose-300'
                  : 'bg-white hover:bg-stone-50/80 border-stone-200/85 hover:border-rose-300'
              }`}
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className={`w-12 h-12 rounded-xl ${tile.iconBg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-200`}>
                  {tile.icon}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-stone-900 group-hover:text-rose-800 transition-colors truncate">
                    {tile.title}
                  </h3>
                  <p className="text-xs text-stone-600 mt-0.5 leading-snug">
                    {tile.subtitle}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 group-hover:text-rose-800 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          ))}
        </div>
      </section>

      {/* 3. Interactive Slow-Advancing Carousel of All NGOs */}
      <section
        aria-label="ONGs em destaque que podem ajudar"
        className="space-y-5"
        onMouseEnter={() => setIsHoverPaused(true)}
        onMouseLeave={() => setIsHoverPaused(false)}
        onFocusCapture={() => setIsHoverPaused(true)}
        onBlurCapture={() => setIsHoverPaused(false)}
      >
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-serif font-bold text-stone-900">
              ONGs em destaque que podem ajudar
            </h2>
            <p className="text-xs sm:text-sm text-stone-600 mt-0.5">
              Apoio gratuito de psicólogas, advogadas e voluntárias em todo o Brasil.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={() => scrollToNgo(activeNgoIndex - 1)}
              aria-label="ONG anterior"
              className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => scrollToNgo(activeNgoIndex + 1)}
              aria-label="Próxima ONG"
              className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => onSelectSection('ongs_apoio')}
              className="min-h-[40px] inline-flex items-center gap-1 pl-2 text-xs font-semibold text-rose-800 hover:text-rose-950 whitespace-nowrap shrink-0 hover:underline underline-offset-4 tabular-nums"
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
                className={`w-[86%] sm:w-[calc(50%-0.625rem)] lg:w-[calc(33.333%-0.835rem)] shrink-0 bg-white rounded-2xl border p-6 flex flex-col justify-between gap-5 transition-colors duration-200 ${
                  isActive
                    ? 'border-rose-300'
                    : 'border-stone-200/85 hover:border-stone-300'
                }`}
              >
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium text-stone-500">
                    <span className="text-rose-800 font-semibold">{ngo.areaLabel}</span>
                    <span className="text-stone-300" aria-hidden="true">·</span>
                    <span className="truncate">{ngo.coverage}</span>
                  </div>
                  <h3 className="text-base font-bold text-stone-900 leading-snug">
                    {ngo.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed line-clamp-3">
                    {ngo.summary}
                  </p>
                </div>

                <a
                  href={ngo.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  tabIndex={isDuplicate ? -1 : undefined}
                  className="min-h-[44px] inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap"
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
                className="py-2 px-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 rounded"
              >
                <span
                  className={`block h-1.5 rounded-full transition-all duration-300 ${
                    active ? 'w-7 bg-rose-800' : 'w-2 bg-stone-300 hover:bg-stone-400'
                  }`}
                />
              </button>
            );
          })}
        </div>
      </section>

      {/* 4. Calm Emergency Call Strip */}
      <section className="bg-rose-50/75 rounded-3xl border border-rose-200/80 p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="text-center sm:text-left space-y-1">
          <h2 className="text-base font-bold text-stone-900">
            Precisa falar com alguém agora?
          </h2>
          <p className="text-xs sm:text-sm text-stone-700">
            Ligação gratuita 24 horas em todo o Brasil, funcionando mesmo sem créditos no celular.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href="tel:180"
            className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 bg-rose-800 hover:bg-rose-900 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap tabular-nums"
          >
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span>Ligar 180</span>
          </a>
          <a
            href="tel:190"
            className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-stone-50 text-stone-900 border border-stone-300 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap tabular-nums"
          >
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span>Polícia 190</span>
          </a>
        </div>
      </section>

      {/* Compact Floating WhatsApp Share Button (Main Page Only) */}
      <a
        href={whatsappShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Compartilhar AcolheMulher no WhatsApp"
        aria-label="Compartilhar link do AcolheMulher no WhatsApp"
        className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-1.5 h-10 px-3.5 rounded-full bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-medium shadow-md transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:ring-offset-2"
      >
        <Share2 className="w-3.5 h-3.5 shrink-0" />
        <span>WhatsApp</span>
      </a>

    </div>
  );
};
