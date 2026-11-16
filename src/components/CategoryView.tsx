import React, { useState, useEffect } from 'react';
import { ServiceCategory, ServiceItem, CepInfo } from '../types';
import { useCatalog } from '../context/CatalogContext';
import { ServiceCard } from './ServiceCard';
import { CepVoiceSearchBar } from './CepVoiceSearchBar';
import { MapPin, ArrowLeft, ExternalLink } from 'lucide-react';

type HealthSubFilter = 'todos' | 'parto' | 'exames' | 'sus';

interface CategoryViewProps {
  category: ServiceCategory;
  title: string;
  subtitle: string;
  description: string;
  currentLocation: CepInfo | null;
  onUpdateLocation: (cepInfo: CepInfo | null) => void;
  onBackToHome: () => void;
}

export const CategoryView: React.FC<CategoryViewProps> = ({
  category,
  title,
  description,
  currentLocation,
  onUpdateLocation,
  onBackToHome
}) => {
  const { nationalServices, regionalServices, ngos } = useCatalog();
  const [showCepChange, setShowCepChange] = useState(!currentLocation);
  const [healthFilter, setHealthFilter] = useState<HealthSubFilter>('todos');

  useEffect(() => {
    setHealthFilter('todos');
  }, [category]);

  useEffect(() => {
    if (currentLocation) {
      setShowCepChange(false);
    }
  }, [currentLocation]);

  const services: ServiceItem[] = React.useMemo(() => {
    const matchingNational = nationalServices.filter(
      (s) => s.category === category
    );

    let matchingRegional: ServiceItem[] = [];
    if (currentLocation) {
      matchingRegional = regionalServices.filter((s) => {
        if (s.category !== category) return false;
        const matchesUF = s.state?.toUpperCase() === currentLocation.uf.toUpperCase();
        const matchesCity =
          s.city && currentLocation.localidade
            ? s.city.toLowerCase().includes(currentLocation.localidade.toLowerCase())
            : false;
        return matchesUF || matchesCity;
      });
    } else {
      matchingRegional = regionalServices.filter((s) => s.category === category);
    }

    const combined = [...matchingRegional, ...matchingNational];

    if (category !== 'saude' || healthFilter === 'todos') {
      return combined;
    }

    return combined.filter((s) => {
      const sub = `${s.subcategory} ${s.name}`.toLowerCase();
      const isParto = sub.includes('parto humanizado') || sub.includes('casa de parto') || sub.includes('casa do parto');
      const isExames = sub.includes('exame') || sub.includes('mamografia') || sub.includes('papanicolau');

      if (healthFilter === 'parto') return isParto;
      if (healthFilter === 'exames') return isExames;
      return !isParto && !isExames;
    });
  }, [category, currentLocation, healthFilter, nationalServices, regionalServices]);

  const matchingNgos = ngos.filter((ngo) =>
    ngo.relatedCategories.includes(
      category as 'juridico' | 'psicologico' | 'saude' | 'cursos' | 'emergencia'
    )
  );

  const healthTabs: { id: HealthSubFilter; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'parto', label: 'Parto Humanizado' },
    { id: 'exames', label: 'Exames Gratuitos' },
    { id: 'sus', label: 'Hospitais & SUS' },
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Simple Back Link + Title */}
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBackToHome}
          className="min-h-[40px] inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Voltar para o início</span>
        </button>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-stone-900 text-balance leading-tight">
            {title}
          </h1>
          <p className="text-sm sm:text-base text-stone-600 max-w-3xl leading-relaxed">
            {description}
          </p>
        </div>

        {/* Clean Location Filter Bar with Voice Search */}
        <div className="bg-white rounded-2xl border border-stone-200/85 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          {currentLocation && !showCepChange ? (
            <div className="flex flex-wrap items-center gap-2 text-stone-700">
              <MapPin className="w-4 h-4 text-rose-800 shrink-0" />
              <span>
                Localização: <strong>{currentLocation.localidade} - {currentLocation.uf}</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowCepChange(true)}
                className="text-rose-800 hover:text-rose-950 font-semibold underline underline-offset-2 ml-1 py-1"
              >
                Trocar CEP ou falar outro local
              </button>
            </div>
          ) : (
            <CepVoiceSearchBar
              variant="compact"
              inputId="categoryCepInput"
              onLocationResolved={(cepInfo) => {
                onUpdateLocation(cepInfo);
                setShowCepChange(false);
              }}
              onCancel={currentLocation ? () => setShowCepChange(false) : undefined}
            />
          )}
        </div>

        {category === 'saude' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
            {healthTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setHealthFilter(tab.id)}
                className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                  healthFilter === tab.id
                    ? 'bg-stone-900 text-white'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Services Grid */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>

        {services.length === 0 && (
          <div className="bg-white rounded-2xl border border-stone-200 p-8 text-center space-y-2">
            <p className="text-sm font-medium text-stone-800">
              Nenhum serviço específico encontrado para este filtro ou CEP.
            </p>
            <p className="text-xs text-stone-600">
              Experimente selecionar "Todos" ou ligar gratuitamente para o <strong>136</strong> (Disque Saúde) ou <strong>180</strong>.
            </p>
          </div>
        )}
      </div>

      {/* Matching NGOs */}
      {matchingNgos.length > 0 && (
        <section className="space-y-4 pt-6 border-t border-stone-200/80">
          <h2 className="text-lg font-serif font-bold text-stone-900">
            ONGs que também ajudam gratuitamente nessa área
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {matchingNgos.map((ngo) => (
              <div
                key={ngo.id}
                className="bg-white rounded-2xl border border-stone-200/85 hover:border-stone-300 p-6 flex flex-col justify-between gap-4 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="text-xs text-rose-800 font-semibold">{ngo.coverage}</div>
                  <h3 className="text-base font-bold text-stone-900">{ngo.name}</h3>
                  <p className="text-xs sm:text-sm text-stone-600 leading-relaxed">{ngo.summary}</p>
                </div>
                <a
                  href={ngo.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap"
                >
                  <span>Acessar ONG</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
