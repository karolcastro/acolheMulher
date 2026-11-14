import React, { useState, useEffect } from 'react';
import { Search, MapPin, Sparkles, Filter, AlertCircle, RefreshCw, PhoneCall, ShieldAlert, BookOpen } from 'lucide-react';
import { ServiceCategory, ServiceItem, CepInfo } from '../types';
import { NATIONAL_SERVICES, REGIONAL_SERVICES, CATEGORIES_CONFIG, SAMPLE_CEPS } from '../data/servicesData';
import { ServiceCard } from './ServiceCard';

interface SearchSectionProps {
  onGoToResearch: () => void;
}

export const SearchSection: React.FC<SearchSectionProps> = ({ onGoToResearch }) => {
  const [cepInput, setCepInput] = useState('');
  const [loadingCep, setLoadingCep] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);
  const [currentLocation, setCurrentLocation] = useState<CepInfo | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory>('todos');
  const [searchQuery, setSearchQuery] = useState('');

  // Format CEP as user types (00000-000)
  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 8) value = value.slice(0, 8);
    if (value.length > 5) {
      value = `${value.slice(0, 5)}-${value.slice(5)}`;
    }
    setCepInput(value);
    setCepError(null);
  };

  // Fetch CEP from ViaCEP API
  const handleSearchCep = async (cepToSearch?: string) => {
    const target = (cepToSearch || cepInput).replace(/\D/g, '');
    if (target.length !== 8) {
      setCepError('Por favor, digite um CEP válido com 8 dígitos.');
      return;
    }

    setLoadingCep(true);
    setCepError(null);

    try {
      const response = await fetch(`https://viacep.com.br/ws/${target}/json/`);
      const data = await response.json();

      if (data.erro) {
        setCepError('CEP não encontrado na base dos Correios. Tente outro CEP ou use um dos exemplos abaixo.');
        setLoadingCep(false);
        return;
      }

      setCurrentLocation({
        cep: data.cep,
        logradouro: data.logradouro,
        bairro: data.bairro,
        localidade: data.localidade,
        uf: data.uf,
        ddd: data.ddd
      });
    } catch {
      setCepError('Não foi possível consultar os Correios no momento. Exibindo rede nacional de apoio.');
    } finally {
      setLoadingCep(false);
    }
  };

  const selectSampleCep = (sampleCep: string) => {
    setCepInput(sampleCep);
    handleSearchCep(sampleCep);
  };

  const clearLocation = () => {
    setCurrentLocation(null);
    setCepInput('');
    setCepError(null);
  };

  // Filter logic:
  // 1. National services are ALWAYS included.
  // 2. If a location is detected, filter regional services that match UF or City.
  // 3. Filter by category.
  // 4. Filter by text query.
  const filteredServices: ServiceItem[] = React.useMemo(() => {
    let all: ServiceItem[] = [...NATIONAL_SERVICES];

    if (currentLocation) {
      const matchingRegional = REGIONAL_SERVICES.filter(item => {
        if (!item.state) return false;
        const matchesUF = item.state.toUpperCase() === currentLocation.uf.toUpperCase();
        const matchesCity = item.city && currentLocation.localidade
          ? item.city.toLowerCase().includes(currentLocation.localidade.toLowerCase())
          : false;
        return matchesUF || matchesCity;
      });

      // Show regional services first, followed by national services
      all = [...matchingRegional, ...NATIONAL_SERVICES];
    } else {
      // If no CEP is entered yet, show all sample regional services + national
      all = [...REGIONAL_SERVICES, ...NATIONAL_SERVICES];
    }

    // Filter by Category
    if (selectedCategory !== 'todos') {
      all = all.filter(s => s.category === selectedCategory);
    }

    // Filter by Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      all = all.filter(s => 
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.subcategory.toLowerCase().includes(q) ||
        (s.tags && s.tags.some(t => t.toLowerCase().includes(q))) ||
        (s.city && s.city.toLowerCase().includes(q))
      );
    }

    return all;
  }, [currentLocation, selectedCategory, searchQuery]);

  return (
    <div className="space-y-10">
      
      {/* Hero Presentation */}
      <section className="bg-stone-900 text-white rounded-3xl p-8 md:p-12 relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-r from-rose-950/70 via-stone-900 to-stone-900 pointer-events-none" />
        <div className="relative z-10 max-w-3xl space-y-4">
          
          <div className="flex items-center gap-2 text-rose-300 text-xs font-semibold tracking-wide uppercase">
            <span>Privacidade Absoluta</span>
            <span aria-hidden="true">·</span>
            <span>Zero Cadastro</span>
            <span aria-hidden="true">·</span>
            <span>100% Gratuito</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-serif font-bold tracking-tight text-white leading-tight">
            Você não está sozinha. Encontre apoio perto de você pelo seu CEP.
          </h1>

          <p className="text-stone-300 text-base md:text-lg leading-relaxed">
            Reunimos em um só lugar os serviços gratuitos que o Estado e a sociedade civil oferecem: 
            atendimento psicológico, orientação jurídica, saúde da mulher, abrigo seguro e cursos profissionalizantes.
            <strong> Sem burocracia, sem login e sem Gov.br.</strong>
          </p>

          {/* Quick Notice */}
          <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-stone-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Nenhum dado pessoal é salvo
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Ligue 180 gratuito 24h
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Acesso por livre demanda
            </span>
          </div>

        </div>
      </section>

      {/* CEP Search Bar & Location Card */}
      <section className="bg-white rounded-2xl border border-stone-200 p-6 md:p-8 shadow-sm space-y-6">
        <div>
          <label htmlFor="cepInput" className="block text-sm font-bold text-stone-900 mb-1">
            Digite seu CEP para localizar serviços públicos no seu bairro:
          </label>
          <p className="text-xs text-stone-600 mb-4">
            Não guardamos seu endereço. O CEP serve exclusivamente para calcular os serviços públicos da sua cidade e estado.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MapPin className="w-5 h-5 text-stone-600 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="cepInput"
                type="text"
                value={cepInput}
                onChange={handleCepChange}
                placeholder="Exemplo: 01001-000 ou 40285-001"
                maxLength={9}
                className="w-full pl-11 pr-4 py-3 bg-stone-50 border border-stone-300 rounded-xl text-stone-900 placeholder-stone-600 text-base font-mono focus:outline-none focus:ring-2 focus:ring-rose-600 focus:bg-white transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearchCep();
                }}
              />
            </div>

            <button
              onClick={() => handleSearchCep()}
              disabled={loadingCep}
              className="px-6 py-3 bg-rose-700 hover:bg-rose-800 disabled:bg-stone-300 text-white font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
            >
              {loadingCep ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Buscando CEP...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Localizar Serviços</span>
                </>
              )}
            </button>
          </div>

          {cepError && (
            <div className="mt-3 flex items-center gap-2 text-xs text-rose-700 bg-rose-50 p-2.5 rounded-lg border border-rose-200">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{cepError}</span>
            </div>
          )}
        </div>

        {/* Sample CEPs quick clicks */}
        <div className="pt-2 border-t border-stone-100">
          <div className="text-xs text-stone-700 font-medium mb-2 flex items-center gap-1">
            <span>Ou selecione uma cidade para testar a busca:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_CEPS.map((sample) => (
              <button
                key={sample.cep}
                onClick={() => selectSampleCep(sample.cep)}
                className="px-3 py-1 text-xs bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg transition-colors border border-stone-200/60 font-medium"
              >
                {sample.city} ({sample.uf})
              </button>
            ))}
          </div>
        </div>

        {/* Detected Location Status Banner */}
        {currentLocation && (
          <div className="bg-rose-50/80 border border-rose-200/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                <MapPin className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs text-stone-700 font-semibold uppercase tracking-wider">
                  Região Ativa no Filtro
                </div>
                <div className="text-sm font-bold text-stone-900">
                  {currentLocation.bairro ? `${currentLocation.bairro}, ` : ''}{currentLocation.localidade} - {currentLocation.uf}
                  <span className="text-xs font-normal text-stone-700 ml-2 font-mono">({currentLocation.cep})</span>
                </div>
                <div className="text-xs text-rose-700 mt-0.5">
                  Exibindo serviços especializados desta cidade e a rede nacional gratuita.
                </div>
              </div>
            </div>

            <button
              onClick={clearLocation}
              className="text-xs text-stone-600 hover:text-stone-900 underline underline-offset-2 whitespace-nowrap self-end sm:self-center"
            >
              Limpar filtro de CEP
            </button>
          </div>
        )}

      </section>

      {/* Filter Tabs & Search query */}
      <section className="space-y-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 lg:pb-0 scrollbar-none">
            {CATEGORIES_CONFIG.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id as ServiceCategory)}
                className={`px-3.5 py-2 text-xs font-semibold rounded-xl transition-all whitespace-nowrap shrink-0 ${
                  selectedCategory === cat.id
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-white text-stone-600 hover:text-stone-900 hover:bg-stone-100 border border-stone-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Keyword Search Input */}
          <div className="relative min-w-[240px]">
            <Search className="w-4 h-4 text-stone-600 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nome, palavra ou curso..."
              className="w-full pl-9 pr-4 py-2 bg-white border border-stone-200 rounded-xl text-xs text-stone-900 placeholder-stone-600 focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

        </div>

        {/* Results Count & Explanatory Tip */}
        <div className="flex items-center justify-between text-xs text-stone-700 pt-1">
          <div>
            Mostrando <strong>{filteredServices.length}</strong> serviços gratuitos disponíveis
            {currentLocation ? ` em ${currentLocation.localidade}/${currentLocation.uf} + Rede Nacional` : ' no Brasil'}
          </div>

          <button
            onClick={onGoToResearch}
            className="text-rose-700 hover:text-rose-800 font-medium flex items-center gap-1 hover:underline"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Por que governos falham nisso? Ver pesquisa</span>
          </button>
        </div>
      </section>

      {/* Service Cards Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredServices.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </section>

      {/* If no services match the query */}
      {filteredServices.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl border border-stone-200 p-8 space-y-4">
          <AlertCircle className="w-10 h-10 text-stone-600 mx-auto" />
          <h3 className="text-lg font-bold text-stone-900">Nenhum serviço encontrado para este filtro</h3>
          <p className="text-sm text-stone-600 max-w-md mx-auto">
            Tente buscar por termos mais genéricos como "psicologia", "advogada", "remédio" ou limpe a busca por palavra-chave.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('todos');
            }}
            className="px-4 py-2 text-xs font-semibold bg-stone-900 text-white rounded-xl"
          >
            Restaurar todos os serviços
          </button>
        </div>
      )}

      {/* Emergency Guidance Banner */}
      <section className="bg-rose-900 text-white p-6 md:p-8 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-1.5 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 text-xs text-rose-200 font-bold uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4" />
            <span>Situação de Risco Imediato?</span>
          </div>
          <h3 className="text-xl md:text-2xl font-serif font-bold">
            Se você estiver sob ameaça agora, não espere atendimento agendado.
          </h3>
          <p className="text-xs md:text-sm text-rose-100 max-w-2xl">
            Ligue imediatamente para o <strong>190 (Polícia Militar)</strong> para socorro em flagrante ou <strong>180 (Central da Mulher)</strong> para receber acolhimento e orientação anônima.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href="tel:190"
            className="px-5 py-2.5 bg-white text-rose-950 font-bold text-sm rounded-xl hover:bg-rose-100 transition-colors shadow"
          >
            Ligar 190 (Polícia)
          </a>
          <a
            href="tel:180"
            className="px-5 py-2.5 bg-rose-800 text-white font-bold text-sm rounded-xl hover:bg-rose-700 transition-colors border border-rose-700"
          >
            Ligar 180 (Acolhe)
          </a>
        </div>
      </section>

    </div>
  );
};
