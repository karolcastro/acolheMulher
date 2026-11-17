import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppSection, CepInfo, ServiceItem } from '../types';
import { useCatalog } from '../context/CatalogContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useNearbySusUnits } from '../hooks/useNearbySusUnits';
import { detectSectionIntent, normalizeText } from '../utils/voiceSearchParser';
import {
  isFreeOnlineOffer,
  RankedServiceItem,
  sortServicesByCepProximity,
} from '../utils/cepProximity';
import { recordAnonymousSearchDemand } from '../utils/demandAnalytics';
import {
  Sparkles,
  Send,
  Mic,
  Square,
  Phone,
  MessageCircle,
  ExternalLink,
  ArrowRight,
  RotateCcw,
  RefreshCw,
  ShieldAlert,
  HeartHandshake,
  Scale,
  Stethoscope,
  GraduationCap,
  Users,
  MapPin,
  Globe,
  Building2
} from 'lucide-react';

interface SupportTriageAgentProps {
  currentLocation: CepInfo | null;
  selectedNeed: AppSection | null;
  lastUserNeedText: string | null;
  onUpdateNeed: (section: AppSection | null, userText?: string | null) => void;
  onOpenSection: (section: AppSection) => void;
  onClearLocation: () => void;
}

const SECTION_META: Record<
  'emergencia' | 'psicologico' | 'juridico' | 'saude' | 'cursos' | 'ongs_apoio',
  {
    label: string;
    empathyMessage: string;
    buttonClass: string;
    icon: React.ReactNode;
  }
> = {
  emergencia: {
    label: 'Proteção 24h e Emergência',
    empathyMessage:
      'Se você estiver em perigo imediato, ligue agora para 190 ou 180. Separei os locais de proteção urgente para a sua região:',
    buttonClass:
      'bg-red-50 text-red-800 border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600',
    icon: <ShieldAlert className="w-3.5 h-3.5 shrink-0" />,
  },
  psicologico: {
    label: 'Apoio Psicológico',
    empathyMessage:
      'Você não precisa passar por isso sozinha. Aqui estão canais gratuitos e sigilosos de escuta e atendimento psicológico:',
    buttonClass:
      'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-700 hover:text-white hover:border-purple-700',
    icon: <HeartHandshake className="w-3.5 h-3.5 shrink-0" />,
  },
  juridico: {
    label: 'Advogada Gratuita e Direitos',
    empathyMessage:
      'Orientação jurídica gratuita para medida protetiva, pensão, guarda e divórcio sem custos:',
    buttonClass:
      'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-800 hover:text-white hover:border-blue-800',
    icon: <Scale className="w-3.5 h-3.5 shrink-0" />,
  },
  saude: {
    label: 'Saúde, Parto Humanizado e Exames',
    empathyMessage:
      'Atendimento gratuito pelo SUS, casas de parto humanizado, exames preventivos e ONGs de saúde:',
    buttonClass:
      'bg-pink-50 text-pink-900 border-pink-200 hover:bg-pink-600 hover:text-white hover:border-pink-600',
    icon: <Stethoscope className="w-3.5 h-3.5 shrink-0" />,
  },
  cursos: {
    label: 'Cursos Gratuitos e Renda',
    empathyMessage:
      'Cursos gratuitos de capacitação, tecnologia e geração de renda para fortalecer sua autonomia:',
    buttonClass:
      'bg-indigo-50 text-indigo-900 border-indigo-200 hover:bg-indigo-700 hover:text-white hover:border-indigo-700',
    icon: <GraduationCap className="w-3.5 h-3.5 shrink-0" />,
  },
  ongs_apoio: {
    label: 'ONGs que Ajudam',
    empathyMessage:
      'Projetos solidários e coletivos com voluntárias que oferecem apoio gratuito sem burocracia:',
    buttonClass:
      'bg-purple-50 text-purple-900 border-purple-200 hover:bg-gradient-to-r hover:from-pink-600 hover:to-purple-700 hover:text-white hover:border-purple-600',
    icon: <Users className="w-3.5 h-3.5 shrink-0" />,
  },
};

export const SupportTriageAgent: React.FC<SupportTriageAgentProps> = ({
  currentLocation,
  selectedNeed,
  lastUserNeedText,
  onUpdateNeed,
  onOpenSection,
  onClearLocation,
}) => {
  const { nationalServices, regionalServices, ngos } = useCatalog();
  const { nearbySusUnits, loadingNearbySus } = useNearbySusUnits(currentLocation);
  const [needInput, setNeedInput] = useState('');
  const [unclearNotice, setUnclearNotice] = useState<string | null>(null);
  const [showAllNearby, setShowAllNearby] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setShowAllNearby(false);
  }, [currentLocation, selectedNeed]);

  useEffect(() => {
    if (currentLocation && !selectedNeed) {
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 80);
      return () => window.clearTimeout(timer);
    }
  }, [currentLocation, selectedNeed]);

  const handleNeedReply = (rawText: string) => {
    const trimmed = rawText.trim();
    if (!trimmed) {
      setUnclearNotice('Me diga em poucas palavras o que você procura ou toque em uma das opções abaixo.');
      return;
    }

    setUnclearNotice(null);
    const norm = normalizeText(trimmed);
    const detected = detectSectionIntent(trimmed);

    if (detected && detected in SECTION_META) {
      setNeedInput('');
      setShowAllNearby(false);
      onUpdateNeed(detected, trimmed);
      return;
    }

    if (/\b(tudo|todos|todas|perto|proxim\w*|geral|online|internet|virtual|whatsapp)\b/.test(norm)) {
      setNeedInput('');
      setShowAllNearby(true);
      onUpdateNeed(null, trimmed);
      void recordAnonymousSearchDemand('geral', currentLocation, 'triage_agent');
      return;
    }

    // Fallback keyword match against existing services/NGOs
    const allServices = [...regionalServices, ...nationalServices];
    const matchedService = allServices.find((s) =>
      normalizeText(`${s.name} ${s.subcategory} ${s.description} ${(s.tags || []).join(' ')}`).includes(norm)
    );

    if (matchedService) {
      setNeedInput('');
      const mappedSection: AppSection =
        matchedService.category === 'todos' || matchedService.category === 'social'
          ? 'ongs_apoio'
          : matchedService.category;
      onUpdateNeed(mappedSection, trimmed);
      return;
    }

    const matchedNgo = ngos.find((n) =>
      normalizeText(`${n.name} ${n.summary} ${n.areaLabel}`).includes(norm)
    );

    if (matchedNgo) {
      setNeedInput('');
      onUpdateNeed('ongs_apoio', trimmed);
      return;
    }

    setUnclearNotice(
      `Não identifiquei exatamente "${trimmed}". Toque em uma das opções abaixo ou tente palavras como "psicóloga", "advogada", "delegacia", "exame" ou "curso".`
    );
  };

  const {
    isListening,
    isProcessingVoice,
    speechMode,
    interimTranscript,
    speechError,
    startListening,
    stopListening,
    clearSpeechError,
  } = useSpeechRecognition({
    lang: 'pt-BR',
    onFinalTranscript: (transcript) => {
      setNeedInput(transcript);
      handleNeedReply(transcript);
    },
  });

  const activeCategoryKey =
    selectedNeed && selectedNeed in SECTION_META
      ? (selectedNeed as keyof typeof SECTION_META)
      : null;

  const matchedPreview = useMemo(() => {
    const mergeUnique = (base: ServiceItem[], extra: ServiceItem[]): ServiceItem[] => {
      const seenIds = new Set<string>();
      const seenNames = new Set<string>();
      const out: ServiceItem[] = [];
      for (const item of [...base, ...extra]) {
        const key = item.name.trim().toLowerCase();
        if (seenIds.has(item.id) || seenNames.has(key)) continue;
        seenIds.add(item.id);
        seenNames.add(key);
        out.push(item);
      }
      return out;
    };

    if (showAllNearby && !activeCategoryKey) {
      const mergedAll = mergeUnique(
        [...regionalServices, ...nationalServices],
        nearbySusUnits
      );
      const rankedAll = sortServicesByCepProximity(mergedAll, currentLocation);
      const onlineFirst = rankedAll.filter((r) => isFreeOnlineOffer(r.service));
      const localAndPhone = rankedAll
        .filter((r) => !isFreeOnlineOffer(r.service))
        .slice(0, 14);
      return {
        onlineServices: onlineFirst,
        localServices: localAndPhone,
        ngoItems: [],
        totalCount: rankedAll.length,
      };
    }

    if (!activeCategoryKey) {
      return {
        onlineServices: [] as RankedServiceItem[],
        localServices: [] as RankedServiceItem[],
        ngoItems: ngos.slice(0, 4),
        totalCount: 0,
      };
    }

    if (activeCategoryKey === 'ongs_apoio') {
      return {
        onlineServices: [] as RankedServiceItem[],
        localServices: [] as RankedServiceItem[],
        ngoItems: ngos.slice(0, 5),
        totalCount: ngos.length,
      };
    }

    const relevantDynamicUnits =
      activeCategoryKey === 'saude'
        ? nearbySusUnits
        : activeCategoryKey === 'emergencia'
        ? nearbySusUnits.filter((u) => u.accessMode === 'Plantão 24h')
        : activeCategoryKey === 'psicologico'
        ? nearbySusUnits.filter(
            (u) =>
              u.subcategory.includes('UBS') ||
              /\b(ubs|caps|posto|centro de saude|centro de saúde|saude da familia|saúde da família)\b/i.test(
                u.name
              )
          )
        : [];

    const combined = mergeUnique(
      [
        ...regionalServices.filter((s) => s.category === activeCategoryKey),
        ...nationalServices.filter((s) => s.category === activeCategoryKey),
      ],
      relevantDynamicUnits
    );

    const ranked = sortServicesByCepProximity(combined, currentLocation);
    const onlineFirst = ranked.filter((r) => isFreeOnlineOffer(r.service));
    const localAndPhone = ranked
      .filter((r) => !isFreeOnlineOffer(r.service))
      .slice(0, 12);

    return {
      onlineServices: onlineFirst,
      localServices: localAndPhone,
      ngoItems: [],
      totalCount: ranked.length,
    };
  }, [activeCategoryKey, showAllNearby, currentLocation, nationalServices, regionalServices, nearbySusUnits, ngos]);

  const hasResolvedView = Boolean(activeCategoryKey || showAllNearby);

  const locationLabel = currentLocation
    ? `${currentLocation.localidade} - ${currentLocation.uf}`
    : 'todo o Brasil';

  const renderRankedRow = ({ service, distanceLabel }: RankedServiceItem) => {
    const isOnline = isFreeOnlineOffer(service);
    const mapQuery = service.address
      ? encodeURIComponent(`${service.name}, ${service.address}`)
      : typeof service.lat === 'number' && typeof service.lng === 'number'
      ? encodeURIComponent(`${service.lat},${service.lng}`)
      : encodeURIComponent(`${service.name} ${service.city || ''} ${service.state || ''}`);
    const hasMap =
      !service.isNationalOnline &&
      Boolean(service.address || (typeof service.lat === 'number' && typeof service.lng === 'number'));

    return (
      <div
        key={service.id}
        className={`rounded-xl border p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
          isOnline
            ? 'bg-purple-50/70 border-purple-200'
            : 'bg-slate-50 border-slate-200/90'
        }`}
      >
        <div className="min-w-0 space-y-0.5">
          <div className="text-[11px] font-semibold text-pink-700 truncate">
            {service.subcategory} · {service.isNationalOnline ? 'Online / Todo o Brasil' : `${service.city} - ${service.state}`}
            {distanceLabel ? ' · ' : ''}
            {distanceLabel && <span className="text-purple-800">{distanceLabel}</span>}
          </div>
          <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
            {service.name}
          </div>
          <div className="text-[11px] text-slate-600 truncate">
            {service.address ? `${service.address} · ` : ''}{service.hours}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
          {service.whatsapp && (
            <a
              href={`https://wa.me/${service.whatsapp}?text=Olá,%20preciso%20de%20orientação%20e%20apoio.`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[36px] inline-flex items-center gap-1 px-3 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <MessageCircle className="w-3 h-3" />
              <span>WhatsApp</span>
            </a>
          )}
          {service.website && (
            <a
              href={service.website}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[36px] inline-flex items-center gap-1 px-3 py-1.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <span>Acessar Online</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {service.phone && (
            <a
              href={`tel:${service.phone.replace(/\D/g, '')}`}
              className="min-h-[36px] inline-flex items-center gap-1 px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <Phone className="w-3 h-3" />
              <span>{service.phone}</span>
            </a>
          )}
          {hasMap && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[36px] inline-flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
            >
              <MapPin className="w-3 h-3" />
              <span>Mapa</span>
            </a>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      role="region"
      aria-live="polite"
      aria-label="Agente interativo de acolhimento"
      className="mt-3 pt-4 border-t border-purple-200/80 space-y-3.5"
    >
      {/* Agent Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-600 to-purple-700 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-purple-950 flex flex-wrap items-center gap-1.5">
              <span>Agente AcolheMulher</span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="text-blue-800">{locationLabel}</span>
            </div>
            {!hasResolvedView ? (
              <p className="text-xs sm:text-sm text-slate-800 leading-snug">
                {currentLocation ? (
                  <>
                    Encontrei <strong>{locationLabel}</strong>. <strong>O que você procura agora?</strong> Escreva, fale ou escolha uma opção:
                  </>
                ) : (
                  <>
                    <strong>O que você procura agora?</strong> Me conte em poucas palavras ou toque em uma opção:
                  </>
                )}
              </p>
            ) : (
              <p className="text-xs sm:text-sm text-slate-800 leading-snug">
                {lastUserNeedText && (
                  <span className="block text-[11px] font-medium text-purple-800 mb-0.5">
                    Você procurou: "{lastUserNeedText}"
                  </span>
                )}
                {activeCategoryKey
                  ? SECTION_META[activeCategoryKey].empathyMessage
                  : `Mostrando atendimentos em até 30 km de ${locationLabel} (no mesmo estado), do mais próximo ao mais distante:`}
              </p>
            )}
          </div>
        </div>

        {hasResolvedView && (
          <button
            type="button"
            onClick={() => {
              setUnclearNotice(null);
              setShowAllNearby(false);
              onUpdateNeed(null, null);
            }}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-800 hover:text-pink-700 whitespace-nowrap shrink-0 py-1 px-2 rounded-lg hover:bg-purple-50 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Outro assunto</span>
          </button>
        )}
      </div>

      {/* Interactive Need Prompt Form (Ask what she is looking for) */}
      {!hasResolvedView && (
        <div className="space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleNeedReply(needInput);
            }}
            className="flex items-center bg-purple-50/70 rounded-xl border border-purple-200 p-1 focus-within:ring-2 focus-within:ring-pink-600 focus-within:bg-white transition-all gap-1"
          >
            <input
              ref={inputRef}
              type="text"
              value={needInput}
              onChange={(e) => {
                setNeedInput(e.target.value);
                setUnclearNotice(null);
                clearSpeechError();
              }}
              placeholder={
                isProcessingVoice
                  ? 'Entendendo o que você falou...'
                  : isListening
                  ? speechMode === 'recorder'
                    ? 'Gravando... fale e toque no botão vermelho para parar'
                    : 'Ouvindo o que você precisa...'
                  : 'Ex: preciso de psicóloga, medida protetiva, exame grátis...'
              }
              maxLength={80}
              className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-500 focus:outline-none min-w-0"
              aria-label="Diga ou digite o tipo de apoio que você procura"
            />

            <button
              type="button"
              disabled={isProcessingVoice}
              onClick={() => (isListening ? stopListening() : startListening())}
              aria-label={isListening ? 'Parar gravação' : 'Falar o que você procura'}
              className={`min-h-[38px] min-w-[38px] px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors shrink-0 ${
                isListening
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-white text-purple-800 hover:bg-purple-100 border border-purple-200'
              }`}
            >
              {isProcessingVoice ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : isListening ? (
                <Square className="w-3 h-3 fill-current" />
              ) : (
                <Mic className="w-3.5 h-3.5" />
              )}
            </button>

            <button
              type="submit"
              disabled={isProcessingVoice}
              className="min-h-[38px] px-3.5 rounded-lg bg-gradient-to-r from-pink-600 to-purple-700 hover:from-pink-700 hover:to-purple-800 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Responder</span>
            </button>
          </form>

          {isListening && interimTranscript && (
            <p className="text-[11px] text-purple-900 font-medium">
              Ouvindo: "{interimTranscript}"
            </p>
          )}

          {!isListening && isProcessingVoice && (
            <p className="text-[11px] text-purple-900 font-medium">
              Transcrevendo o que você falou...
            </p>
          )}

          {(unclearNotice || speechError) && (
            <p className="text-xs text-red-700 font-medium leading-snug">
              {unclearNotice || speechError}
            </p>
          )}

          {/* Quick 1-Tap Choice Buttons */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {(Object.keys(SECTION_META) as (keyof typeof SECTION_META)[]).map((key) => {
              const item = SECTION_META[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setUnclearNotice(null);
                    onUpdateNeed(key, item.label);
                  }}
                  className={`min-h-[40px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center gap-2 text-left transition-all ${item.buttonClass}`}
                >
                  {item.icon}
                  <span className="leading-tight">{item.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setUnclearNotice(null);
                setShowAllNearby(true);
                void recordAnonymousSearchDemand('geral', currentLocation, 'triage_agent');
              }}
              className="col-span-2 sm:col-span-3 min-h-[38px] px-3 py-2 rounded-xl border border-blue-200 bg-blue-50/80 hover:bg-blue-800 text-blue-900 hover:text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
            >
              <span>Ver todos os locais em até 30 km do meu CEP</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* Tailored Agent Answer + Immediate Local Results Preview */}
      {hasResolvedView && (
        <div className="space-y-3">
          {!currentLocation && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-3.5 py-2.5 text-xs text-blue-950">
              Dica: digite seu <strong>CEP ou cidade</strong> no campo acima para filtrar locais exatos do seu bairro.
            </div>
          )}

          {activeCategoryKey === 'emergencia' && (
            <div className="flex flex-wrap items-center gap-2">
              <a
                href="tel:180"
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Ligar 180 (24h)</span>
              </a>
              <a
                href="tel:190"
                className="min-h-[38px] inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-900 hover:bg-blue-950 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Polícia 190</span>
              </a>
            </div>
          )}

          {/* 1. Free Online Offers FIRST + 2. Nearby UBSs, Hospitals and Local Units (<= 30 km) */}
          <div className="space-y-3 max-h-[380px] overflow-y-auto pr-0.5">
            {matchedPreview.onlineServices.length > 0 && (
              <div className="space-y-2">
                <div className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                  <span>1. Ofertas Online Gratuitas · Atendimento Imediato</span>
                </div>
                {matchedPreview.onlineServices.map(renderRankedRow)}
              </div>
            )}

            {(matchedPreview.localServices.length > 0 || loadingNearbySus) && (
              <div className="space-y-2 pt-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] font-bold text-blue-950 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                    <span>
                      {currentLocation
                        ? `2. UBSs, Hospitais e Locais Próximos em ${currentLocation.localidade} - ${currentLocation.uf} (até 30 km)`
                        : '2. Telefones 24h e Locais Presenciais'}
                    </span>
                  </div>

                  {currentLocation && (
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                        `UBS Posto de Saude Hospital SUS perto de ${currentLocation.localidade} ${currentLocation.uf}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-blue-800 hover:text-pink-700 inline-flex items-center gap-1 underline underline-offset-2"
                    >
                      <span>Abrir UBSs e Hospitais no Mapa</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {loadingNearbySus && currentLocation && (
                  <div className="text-[11px] text-purple-800 flex items-center gap-1.5 py-1">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-pink-600 shrink-0" />
                    <span>Buscando UBSs e hospitais públicos perto do seu CEP...</span>
                  </div>
                )}

                {matchedPreview.localServices.map(renderRankedRow)}
              </div>
            )}

            {matchedPreview.ngoItems.map((ngo) => (
              <div
                key={ngo.id}
                className="bg-slate-50 rounded-xl border border-slate-200/90 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="min-w-0 space-y-0.5">
                  <div className="text-[11px] font-semibold text-pink-700 truncate">
                    {ngo.areaLabel} · {ngo.coverage}
                  </div>
                  <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {ngo.name}
                  </div>
                </div>
                <a
                  href={ngo.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[36px] inline-flex items-center gap-1 px-3 py-1.5 bg-gradient-to-r from-pink-600 to-purple-700 text-white text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0"
                >
                  <span>Acessar ONG</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            {activeCategoryKey ? (
              <button
                type="button"
                onClick={() => onOpenSection(activeCategoryKey)}
                className="min-h-[42px] flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-purple-700 hover:from-pink-700 hover:to-purple-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs whitespace-nowrap"
              >
                <span>Ver todos os resultados ({matchedPreview.totalCount})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowAllNearby(false)}
                className="min-h-[42px] flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-900 hover:bg-purple-950 text-white text-xs font-semibold rounded-xl transition-all shadow-xs whitespace-nowrap"
              >
                <span>Filtrar por área específica</span>
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            {currentLocation && (
              <button
                type="button"
                onClick={onClearLocation}
                className="text-xs font-medium text-slate-600 hover:text-red-600 py-2 px-2 transition-colors"
              >
                Limpar cidade/CEP
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
