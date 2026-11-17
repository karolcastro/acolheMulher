import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AppSection, CepInfo, ServiceItem } from '../types';
import { useCatalog } from '../context/CatalogContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useNearbySusUnits } from '../hooks/useNearbySusUnits';
import { detectSectionIntent, normalizeText } from '../utils/voiceSearchParser';
import {
  buildMapsSusSearchUrl,
  formatLocationDisplay,
  isFreeOnlineOffer,
  RankedServiceItem,
  sortServicesByCepProximity,
} from '../utils/cepProximity';
import {
  DemandAccessChannel,
  recordAnonymousSearchDemand,
  recordVoiceSearchRelational,
} from '../utils/demandAnalytics';
import { normalizeNgoNameKey } from '../lib/supabaseClient';
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
  onUpdateNeed: (
    section: AppSection | null,
    userText?: string | null,
    channel?: DemandAccessChannel
  ) => void;
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

interface AiTriageResult {
  primaryCategory: keyof typeof SECTION_META;
  urgency: 'imediata' | 'prioritaria' | 'orientacao';
  empathyResponse: string;
  safetySteps: string[];
  recommendedIds: string[];
  recommendationReason: string;
  model?: string;
}

export const SupportTriageAgent: React.FC<SupportTriageAgentProps> = ({
  currentLocation,
  selectedNeed,
  lastUserNeedText,
  onUpdateNeed,
  onOpenSection,
  onClearLocation,
}) => {
  const { nationalServices, regionalServices, ngos } = useCatalog();
  const activeCategoryKey =
    selectedNeed && selectedNeed in SECTION_META
      ? (selectedNeed as keyof typeof SECTION_META)
      : null;

  const { nearbySusUnits, loadingNearbySus } = useNearbySusUnits(
    currentLocation,
    activeCategoryKey || 'geral'
  );
  const [needInput, setNeedInput] = useState('');
  const [unclearNotice, setUnclearNotice] = useState<string | null>(null);
  const [showAllNearby, setShowAllNearby] = useState(false);
  const [aiTriageResult, setAiTriageResult] = useState<AiTriageResult | null>(null);
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiFallbackNotice, setAiFallbackNotice] = useState<string | null>(null);
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

  const buildRagContext = () => {
    const rankedServices = sortServicesByCepProximity(
      [...regionalServices, ...nationalServices, ...nearbySusUnits],
      currentLocation
    );
    const seen = new Set<string>();
    const items: Array<{
      id: string;
      kind: 'service' | 'ngo';
      name: string;
      category: string;
      subcategory?: string;
      isNationalOnline?: boolean;
      distanceKm?: number | null;
      freeConfirmation?: string;
      summary?: string;
    }> = [];

    for (const r of rankedServices) {
      if (seen.has(r.service.id)) continue;
      seen.add(r.service.id);
      items.push({
        id: r.service.id,
        kind: 'service',
        name: r.service.name,
        category: r.service.category,
        subcategory: r.service.subcategory,
        isNationalOnline: r.service.isNationalOnline,
        distanceKm: r.distanceKm,
        freeConfirmation: r.service.freeConfirmation,
        summary: r.service.description,
      });
      if (items.length >= 16) break;
    }

    const userUf = currentLocation?.uf?.trim().toUpperCase();
    const sortedNgos = [...ngos].sort((a, b) => {
      const aLocal = userUf && a.state?.toUpperCase() === userUf ? 0 : 1;
      const bLocal = userUf && b.state?.toUpperCase() === userUf ? 0 : 1;
      return aLocal - bLocal;
    });

    for (const ngo of sortedNgos.slice(0, 8)) {
      if (seen.has(ngo.id)) continue;
      seen.add(ngo.id);
      items.push({
        id: ngo.id,
        kind: 'ngo',
        name: ngo.name,
        category: 'ongs_apoio',
        subcategory: ngo.areaLabel,
        isNationalOnline: !ngo.state,
        freeConfirmation: ngo.privacyNote,
        summary: ngo.summary,
      });
    }

    return items;
  };

  const runDeterministicFallback = (
    trimmed: string,
    sourceChannel: DemandAccessChannel
  ) => {
    const norm = normalizeText(trimmed);
    const detected = detectSectionIntent(trimmed);

    if (detected && detected in SECTION_META) {
      setNeedInput('');
      setShowAllNearby(false);
      onUpdateNeed(detected, trimmed, sourceChannel);
      return;
    }

    if (/\b(tudo|todos|todas|perto|proxim\w*|geral|online|internet|virtual|whatsapp)\b/.test(norm)) {
      setNeedInput('');
      setShowAllNearby(true);
      onUpdateNeed(null, trimmed, sourceChannel);
      if (sourceChannel !== 'web_voice') {
        void recordAnonymousSearchDemand('geral', currentLocation, sourceChannel);
      }
      return;
    }

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
      onUpdateNeed(mappedSection, trimmed, sourceChannel);
      return;
    }

    const matchedNgo = ngos.find((n) =>
      normalizeText(`${n.name} ${n.summary} ${n.areaLabel}`).includes(norm)
    );

    if (matchedNgo) {
      setNeedInput('');
      onUpdateNeed('ongs_apoio', trimmed, sourceChannel);
      return;
    }

    if (sourceChannel === 'web_voice') {
      void recordVoiceSearchRelational(trimmed, 'geral', currentLocation);
    } else {
      void recordAnonymousSearchDemand('geral', currentLocation, sourceChannel);
    }
    setUnclearNotice(
      `Não identifiquei exatamente "${trimmed}". Toque em uma das opções abaixo ou tente palavras como "psicóloga", "advogada", "delegacia", "exame" ou "curso".`
    );
  };

  const handleNeedReply = async (
    rawText: string,
    sourceChannel: DemandAccessChannel = 'triage_agent'
  ) => {
    const trimmed = rawText.trim();
    if (!trimmed) {
      setUnclearNotice('Me diga em poucas palavras o que você procura ou toque em uma das opções abaixo.');
      return;
    }

    setUnclearNotice(null);
    setAiFallbackNotice(null);

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setAiTriageResult(null);
      setAiFallbackNotice('Modo offline ativo: exibindo triagem direta sem necessidade de internet.');
      runDeterministicFallback(trimmed, sourceChannel);
      return;
    }

    setIsAnalyzingAi(true);
    try {
      const response = await fetch('/api/triage-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          location: currentLocation
            ? { city: currentLocation.localidade, state: currentLocation.uf }
            : undefined,
          catalogContext: buildRagContext(),
        }),
      });

      if (!response.ok) {
        let errMessage = 'Triagem inteligente indisponível no momento; exibindo classificação direta.';
        try {
          const errBody = (await response.json()) as { error?: string };
          if (errBody?.error) errMessage = errBody.error;
        } catch {
          // Keep default fallback notice
        }
        setAiTriageResult(null);
        setAiFallbackNotice(errMessage);
        runDeterministicFallback(trimmed, sourceChannel);
        return;
      }

      const aiData = (await response.json()) as AiTriageResult;
      const resolvedCategory =
        aiData.primaryCategory && aiData.primaryCategory in SECTION_META
          ? aiData.primaryCategory
          : 'ongs_apoio';

      setAiTriageResult({
        ...aiData,
        primaryCategory: resolvedCategory,
      });
      setNeedInput('');
      setShowAllNearby(false);
      onUpdateNeed(resolvedCategory, trimmed, sourceChannel);
    } catch {
      setAiTriageResult(null);
      setAiFallbackNotice('Sem resposta do servidor de IA agora; exibindo classificação direta.');
      runDeterministicFallback(trimmed, sourceChannel);
    } finally {
      setIsAnalyzingAi(false);
    }
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
      void handleNeedReply(transcript, 'web_voice');
    },
  });

  const matchedPreview = useMemo(() => {
    const normalizeDedupeKey = (name: string): string =>
      name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\([^)]*\)/g, ' ')
        .replace(/\s*[—–-]\s*unidade b[aá]sica de sa[uú]de.*$/i, '')
        .replace(/\b(unidade de saude da familia|unidade basica de saude|usf|psf)\b/g, 'ubs')
        .replace(/\b(de|da|do|das|dos)\b/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

    const dbNgoNames = new Set(ngos.map((n) => normalizeNgoNameKey(n.name)));

    const mergeUnique = (base: ServiceItem[], extra: ServiceItem[]): ServiceItem[] => {
      const seenIds = new Set<string>();
      const seenNames = new Set<string>();
      const out: ServiceItem[] = [];
      for (const item of [...base, ...extra]) {
        const key = normalizeDedupeKey(item.name);
        if (item.category === 'social' && dbNgoNames.has(normalizeNgoNameKey(item.name))) {
          continue;
        }
        if (seenIds.has(item.id) || seenNames.has(key)) continue;
        seenIds.add(item.id);
        seenNames.add(key);
        out.push(item);
      }
      return out;
    };

    const userUf = currentLocation?.uf?.trim().toUpperCase();
    const sortByUf = <T extends { state?: string }>(items: T[]): T[] =>
      [...items]
        .filter((item) => !item.state || !userUf || item.state.toUpperCase() === userUf)
        .sort((a, b) => {
          if (userUf) {
            const aLocal = a.state?.toUpperCase() === userUf ? 0 : 1;
            const bLocal = b.state?.toUpperCase() === userUf ? 0 : 1;
            if (aLocal !== bLocal) return aLocal - bLocal;
          }
          return 0;
        });

    const pickDiversePreview = (list: RankedServiceItem[], limit = 18): RankedServiceItem[] => {
      if (list.length <= limit) return list;
      const selected: RankedServiceItem[] = [];
      const used = new Set<string>();
      const counts: Record<string, number> = {};
      const getBucket = (r: RankedServiceItem): string => {
        const s = `${r.service.subcategory} ${r.service.name}`.toLowerCase();
        if (r.distanceKm === null) return 'phone';
        if (s.includes('delegacia') || s.includes('deam') || r.service.category === 'emergencia') return 'emergencia';
        if (s.includes('caps') || r.service.category === 'psicologico') return 'caps';
        if (s.includes('upa') || s.includes('hospital') || s.includes('maternidade') || s.includes('parto')) return 'hospital';
        if (s.includes('defensoria') || s.includes('creas') || s.includes('cras') || s.includes('casa da mulher')) return 'suas';
        return 'ubs';
      };
      const caps: Record<string, number> = {
        phone: 3,
        ubs: 5,
        hospital: 4,
        caps: 4,
        emergencia: 4,
        suas: 3,
      };
      for (const r of list) {
        const b = getBucket(r);
        if ((counts[b] || 0) < (caps[b] ?? 3)) {
          selected.push(r);
          used.add(r.service.id);
          counts[b] = (counts[b] || 0) + 1;
        }
      }
      for (const r of list) {
        if (selected.length >= limit) break;
        if (used.has(r.service.id)) continue;
        selected.push(r);
        used.add(r.service.id);
      }
      return selected.sort((a, b) => {
        const idxA = list.indexOf(a);
        const idxB = list.indexOf(b);
        return idxA - idxB;
      });
    };

    if (showAllNearby && !activeCategoryKey) {
      const mergedAll = mergeUnique(
        [...regionalServices, ...nationalServices],
        nearbySusUnits
      );
      const rankedAll = sortServicesByCepProximity(mergedAll, currentLocation);
      const onlineFirst = rankedAll.filter((r) => isFreeOnlineOffer(r.service));
      const allLocal = rankedAll.filter((r) => !isFreeOnlineOffer(r.service));
      const closeCount = allLocal.filter(
        (r) => r.distanceKm !== null && r.distanceKm <= 15
      ).length;
      const scopedLocal =
        closeCount >= 8
          ? allLocal.filter((r) => r.distanceKm === null || r.distanceKm <= 20)
          : allLocal;
      const localAndPhone = pickDiversePreview(scopedLocal, 18);
      const allMatchingNgos = sortByUf(ngos).slice(0, 6);

      return {
        onlineServices: onlineFirst,
        localServices: localAndPhone,
        ngoItems: allMatchingNgos,
        totalCount: rankedAll.length + allMatchingNgos.length,
      };
    }

    if (!activeCategoryKey) {
      return {
        onlineServices: [] as RankedServiceItem[],
        localServices: [] as RankedServiceItem[],
        ngoItems: sortByUf(ngos).slice(0, 4),
        totalCount: 0,
      };
    }

    if (activeCategoryKey === 'ongs_apoio') {
      const sortedNgos = sortByUf(ngos);
      const localDynamicNgos = sortServicesByCepProximity(
        nearbySusUnits.filter(
          (u) => u.category === 'social' && !dbNgoNames.has(normalizeNgoNameKey(u.name))
        ),
        currentLocation
      );

      return {
        onlineServices: [] as RankedServiceItem[],
        localServices: localDynamicNgos,
        ngoItems: sortedNgos.slice(0, 8),
        totalCount: sortedNgos.length + localDynamicNgos.length,
      };
    }

    const categoryDynamicUnits = nearbySusUnits.filter((u) => {
      if (u.category === 'social') return true;
      const text = `${u.subcategory} ${u.name} ${(u.tags || []).join(' ')}`.toLowerCase();
      if (activeCategoryKey === 'saude') {
        return u.category === 'saude' || u.category === 'psicologico';
      }
      if (activeCategoryKey === 'psicologico') {
        return (
          u.category === 'psicologico' ||
          u.category === 'saude' ||
          text.includes('creas') ||
          text.includes('cras') ||
          text.includes('casa da mulher') ||
          text.includes('cram')
        );
      }
      if (activeCategoryKey === 'emergencia') {
        return (
          u.category === 'emergencia' ||
          u.accessMode === 'Plantão 24h' ||
          text.includes('delegacia') ||
          text.includes('policia') ||
          text.includes('casa da mulher') ||
          text.includes('creas') ||
          text.includes('cras')
        );
      }
      if (activeCategoryKey === 'juridico') {
        return u.category === 'juridico';
      }
      if (activeCategoryKey === 'cursos') {
        return u.category === 'cursos' || text.includes('cras') || text.includes('casa da mulher');
      }
      return true;
    });

    // Small/interior municipalities may not have specialized DEAMs or Defensoria mapped;
    // surface the nearest verified municipal public units (<= 30 km) instead of showing zero local places.
    const relevantDynamicUnits =
      categoryDynamicUnits.length > 0
        ? categoryDynamicUnits
        : nearbySusUnits.slice(0, 6);

    const matchingRegional = regionalServices.filter((s) => {
      if (s.category === activeCategoryKey) return true;
      if (activeCategoryKey === 'psicologico') {
        const text = `${s.subcategory} ${s.name} ${(s.tags || []).join(' ')}`.toLowerCase();
        return (
          s.category === 'saude' &&
          (text.includes('ubs') ||
            text.includes('hospital') ||
            text.includes('caps') ||
            text.includes('acolhimento') ||
            text.includes('psicologia'))
        );
      }
      if (activeCategoryKey === 'emergencia') {
        return s.category === 'saude' && s.accessMode === 'Plantão 24h';
      }
      return false;
    });

    const combined = mergeUnique(
      [
        ...matchingRegional,
        ...nationalServices.filter((s) => s.category === activeCategoryKey),
      ],
      relevantDynamicUnits
    );

    const ranked = sortServicesByCepProximity(combined, currentLocation);
    const onlineFirst = ranked.filter((r) => isFreeOnlineOffer(r.service));
    const allLocalAndPhone = ranked.filter((r) => !isFreeOnlineOffer(r.service));
    const closePhysicalCount = allLocalAndPhone.filter(
      (r) => r.distanceKm !== null && r.distanceKm <= 15
    ).length;
    const scopedLocalAndPhone =
      closePhysicalCount >= 8
        ? allLocalAndPhone.filter(
            (r) => r.distanceKm === null || r.distanceKm <= 20
          )
        : allLocalAndPhone;
    const localAndPhone = pickDiversePreview(scopedLocalAndPhone, 18);

    const matchedCategoryNgos = sortByUf(
      ngos.filter((ngo) =>
        ngo.relatedCategories.includes(
          activeCategoryKey as 'juridico' | 'psicologico' | 'saude' | 'cursos' | 'emergencia'
        )
      )
    );
    const categoryNgos = (
      matchedCategoryNgos.length > 0 ? matchedCategoryNgos : sortByUf(ngos)
    ).slice(0, 5);

    return {
      onlineServices: onlineFirst,
      localServices: localAndPhone,
      ngoItems: categoryNgos,
      totalCount: ranked.length + categoryNgos.length,
    };
  }, [activeCategoryKey, showAllNearby, currentLocation, nationalServices, regionalServices, nearbySusUnits, ngos]);

  const hasResolvedView = Boolean(activeCategoryKey || showAllNearby);

  const ragRecommendations = useMemo(() => {
    if (!aiTriageResult || aiTriageResult.recommendedIds.length === 0) {
      return { services: [] as RankedServiceItem[], ngos: [] as typeof ngos };
    }
    const idOrder = new Map(aiTriageResult.recommendedIds.map((id, idx) => [id, idx]));
    const allServices = [...regionalServices, ...nationalServices, ...nearbySusUnits];
    const matchedServices = sortServicesByCepProximity(
      allServices.filter((s) => idOrder.has(s.id)),
      currentLocation
    ).sort((a, b) => (idOrder.get(a.service.id) ?? 99) - (idOrder.get(b.service.id) ?? 99));

    const matchedNgos = ngos
      .filter((n) => idOrder.has(n.id))
      .sort((a, b) => (idOrder.get(a.id) ?? 99) - (idOrder.get(b.id) ?? 99));

    return { services: matchedServices, ngos: matchedNgos };
  }, [aiTriageResult, regionalServices, nationalServices, nearbySusUnits, ngos, currentLocation]);

  const locationLabel = currentLocation
    ? formatLocationDisplay(currentLocation)
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
                {aiTriageResult?.empathyResponse
                  ? aiTriageResult.empathyResponse
                  : activeCategoryKey
                  ? SECTION_META[activeCategoryKey].empathyMessage
                  : `Mostrando apenas opções 100% gratuitas (ofertas online primeiro + rede pública e ONGs em até 30 km de ${locationLabel}):`}
              </p>
            )}
          </div>
        </div>

        {hasResolvedView && (
          <button
            type="button"
            onClick={() => {
              setUnclearNotice(null);
              setAiTriageResult(null);
              setAiFallbackNotice(null);
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
              void handleNeedReply(needInput);
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
                setAiFallbackNotice(null);
                clearSpeechError();
              }}
              placeholder={
                isAnalyzingAi
                  ? 'Analisando seu pedido com acolhimento...'
                  : isProcessingVoice
                  ? 'Entendendo o que você falou...'
                  : isListening
                  ? speechMode === 'recorder'
                    ? 'Gravando... fale e toque no botão vermelho para parar'
                    : 'Ouvindo o que você precisa...'
                  : 'Conte em suas palavras: ex. estou com medo em casa, exame gratis, psicologa...'
              }
              maxLength={240}
              className="flex-1 bg-transparent px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-500 focus:outline-none min-w-0"
              aria-label="Diga ou digite o tipo de apoio que você procura"
            />

            <button
              type="button"
              disabled={isProcessingVoice || isAnalyzingAi}
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
              disabled={isProcessingVoice || isAnalyzingAi}
              className="min-h-[38px] px-3.5 rounded-lg bg-gradient-to-r from-pink-600 to-purple-700 hover:from-pink-700 hover:to-purple-800 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0 whitespace-nowrap transition-all disabled:opacity-70"
            >
              {isAnalyzingAi ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
              <span>{isAnalyzingAi ? 'Analisando...' : 'Responder'}</span>
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

          {isAnalyzingAi && (
            <p className="text-[11px] text-purple-900 font-medium flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-pink-600 animate-pulse" />
              <span>Classificando sua necessidade e buscando opções gratuitas reais na rede...</span>
            </p>
          )}

          {(unclearNotice || speechError || aiFallbackNotice) && (
            <p className="text-xs text-red-700 font-medium leading-snug">
              {unclearNotice || speechError || aiFallbackNotice}
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
                    setAiTriageResult(null);
                    setAiFallbackNotice(null);
                    onUpdateNeed(key, item.label, 'triage_agent');
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
                setAiTriageResult(null);
                setAiFallbackNotice(null);
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

          {(activeCategoryKey === 'emergencia' || aiTriageResult?.urgency === 'imediata') && (
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

          {aiFallbackNotice && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-2 text-[11px] text-amber-950 font-medium">
              {aiFallbackNotice}
            </div>
          )}

          {aiTriageResult && (
            <div className="rounded-xl border border-purple-200 bg-gradient-to-br from-purple-50/80 to-pink-50/50 p-3.5 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-[11px] font-bold text-purple-950 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-pink-600 shrink-0" />
                  <span>Triagem Inteligente · Passos Recomendados</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide ${
                    aiTriageResult.urgency === 'imediata'
                      ? 'bg-red-100 text-red-900 border border-red-200'
                      : aiTriageResult.urgency === 'prioritaria'
                      ? 'bg-purple-100 text-purple-950 border border-purple-200'
                      : 'bg-blue-100 text-blue-950 border border-blue-200'
                  }`}
                >
                  {aiTriageResult.urgency === 'imediata'
                    ? 'Prioridade Imediata'
                    : aiTriageResult.urgency === 'prioritaria'
                    ? 'Apoio Prioritário'
                    : 'Orientação Gratuita'}
                </span>
              </div>

              {aiTriageResult.safetySteps.length > 0 && (
                <ul className="space-y-1 text-xs text-slate-800 list-disc pl-4">
                  {aiTriageResult.safetySteps.map((step, idx) => (
                    <li key={idx}>{step}</li>
                  ))}
                </ul>
              )}

              <p className="text-[11px] text-purple-900 font-medium">
                {aiTriageResult.recommendationReason}
              </p>

              {(ragRecommendations.services.length > 0 || ragRecommendations.ngos.length > 0) && (
                <div className="space-y-2 pt-1">
                  <div className="text-[11px] font-bold text-pink-800">
                    Destaques selecionados para o seu caso (100% gratuitos):
                  </div>
                  {ragRecommendations.services.map(renderRankedRow)}
                  {ragRecommendations.ngos.map((ngo) => (
                    <div
                      key={`rag-${ngo.id}`}
                      className="bg-white rounded-xl border border-purple-200 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="text-[11px] font-semibold text-pink-700 truncate">
                          ONG Recomendada · {ngo.areaLabel}
                        </div>
                        <div className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                          {ngo.name}
                        </div>
                        <div className="text-[11px] text-slate-600 truncate">
                          {ngo.accessChannel}
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
              )}
            </div>
          )}

          {/* 1. Free Online Offers FIRST + 2. Nearby UBSs, Hospitals and Local Units (<= 30 km) + 3. Matching NGOs */}
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-700 bg-purple-50/70 border border-purple-200/80 rounded-xl px-3 py-2">
            <span>{matchedPreview.onlineServices.length} online grátis</span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span>{matchedPreview.localServices.length} da rede pública/local perto do CEP</span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <span className="text-purple-900">{matchedPreview.ngoItems.length} ONGs voltadas para mulheres</span>
          </div>

          <div className="space-y-4">
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
                        ? `2. Rede Pública e Locais Gratuitos Próximos a ${locationLabel}`
                        : '2. Telefones 24h e Rede Pública Gratuita'}
                    </span>
                  </div>

                  {currentLocation && (
                    <a
                      href={buildMapsSusSearchUrl(
                        currentLocation,
                        activeCategoryKey || 'geral'
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-semibold text-blue-800 hover:text-pink-700 inline-flex items-center gap-1 underline underline-offset-2"
                    >
                      <span>Abrir Rede Pública no Mapa</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {loadingNearbySus && currentLocation && (
                  <div className="text-[11px] text-purple-800 flex items-center gap-1.5 py-1">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-pink-600 shrink-0" />
                    <span>Buscando apenas opções 100% gratuitas da rede pública e ONGs perto do seu CEP...</span>
                  </div>
                )}

                {matchedPreview.localServices.map(renderRankedRow)}
              </div>
            )}

            {matchedPreview.ngoItems.length > 0 && (
              <div className="space-y-2 pt-1">
                <div className="text-[11px] font-bold text-purple-900 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                  <span>
                    {activeCategoryKey === 'ongs_apoio'
                      ? 'ONGs voltadas para mulheres (gratuitas)'
                      : '3. ONGs voltadas para mulheres nesta área'}
                  </span>
                </div>
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
                      <div className="text-[11px] text-slate-600 truncate">
                        {ngo.accessChannel}
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
            )}
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
