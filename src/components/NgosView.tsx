import React, { useMemo, useState } from 'react';
import type { NgoHelpArea, NgoItem } from '../data/ngosData';
import type { CepInfo } from '../types';
import { useCatalog } from '../context/CatalogContext';
import { normalizeText } from '../utils/voiceSearchParser';
import { recordAnonymousSearchDemand, type DemandTopicKey } from '../utils/demandAnalytics';
import { ArrowLeft, ExternalLink, CheckCircle2, Search } from 'lucide-react';

interface NgosViewProps {
  currentLocation?: CepInfo | null;
  onBackToHome: () => void;
}

function mapAreaToDemandTopic(area: NgoHelpArea): DemandTopicKey {
  switch (area) {
    case 'saude_parto':
      return 'saude';
    case 'psicologico_juridico':
      return 'psicologico';
    case 'acolhimento_protecao':
      return 'emergencia';
    case 'cursos_renda':
      return 'cursos';
    case 'todas':
    default:
      return 'ongs_apoio';
  }
}

export const NgosView: React.FC<NgosViewProps> = ({ currentLocation = null, onBackToHome }) => {
  const { ngos } = useCatalog();
  const [selectedArea, setSelectedArea] = useState<NgoHelpArea>('todas');
  const [searchTerm, setSearchTerm] = useState('');

  const areaTabs: { id: NgoHelpArea; label: string }[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'saude_parto', label: 'Saúde, Parto & Exames' },
    { id: 'psicologico_juridico', label: 'Psicologia & Jurídico' },
    { id: 'acolhimento_protecao', label: 'Acolhimento & Proteção' },
    { id: 'cursos_renda', label: 'Cursos & Renda' },
  ];

  const filteredNgos = useMemo(() => {
    const byArea =
      selectedArea === 'todas' ? ngos : ngos.filter((ngo) => ngo.area === selectedArea);

    const q = normalizeText(searchTerm);
    if (!q) return byArea;

    return byArea.filter((ngo) =>
      normalizeText(
        `${ngo.name} ${ngo.organization} ${ngo.coverage} ${ngo.state || ''} ${ngo.city || ''} ${ngo.areaLabel} ${ngo.summary} ${ngo.howTheyHelp.join(' ')}`
      ).includes(q)
    );
  }, [selectedArea, searchTerm, ngos]);

  const handleSelectArea = (area: NgoHelpArea) => {
    setSelectedArea(area);
    void recordAnonymousSearchDemand(
      mapAreaToDemandTopic(area),
      currentLocation,
      'ongs_directory'
    );
  };

  const handleNgoSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void recordAnonymousSearchDemand(
      mapAreaToDemandTopic(selectedArea),
      currentLocation,
      'ongs_directory'
    );
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="space-y-4">
        <button
          type="button"
          onClick={onBackToHome}
          className="min-h-[40px] inline-flex items-center gap-1.5 text-sm font-medium text-purple-900 hover:text-pink-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" />
          <span>Voltar para o início</span>
        </button>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-slate-900 text-balance leading-tight">
            ONGs que podem te ajudar gratuitamente ({ngos.length})
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
            Projetos solidários feitos por mulheres e voluntárias para oferecer escuta, orientação jurídica, exames e cursos sem custo.
          </p>
        </div>

        {/* Search Input inside NGOs Directory */}
        <form
          onSubmit={handleNgoSearchSubmit}
          className="flex items-center bg-white rounded-xl border border-slate-200 p-1.5 max-w-xl shadow-xs focus-within:ring-2 focus-within:ring-purple-600 focus-within:border-purple-600 gap-2"
        >
          <Search className="w-4 h-4 text-purple-700 ml-2.5 shrink-0" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Filtrar ONG por nome, estado (SP, BA...), cidade ou apoio"
            aria-label="Filtrar ONGs gratuitas"
            className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 placeholder-slate-500 focus:outline-none min-w-0 py-1.5"
          />
          <button
            type="submit"
            className="min-h-[36px] px-3.5 py-1.5 rounded-lg bg-purple-900 hover:bg-purple-950 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
          >
            Buscar ONG
          </button>
        </form>

        {/* Clean Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {areaTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectArea(tab.id)}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                selectedArea === tab.id
                  ? 'bg-purple-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-pink-300 hover:text-pink-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* NGOs Grid */}
      {filteredNgos.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
          <p className="text-sm font-semibold text-slate-900">
            Nenhuma ONG encontrada para este filtro.
          </p>
          <p className="text-xs text-slate-600">
            Limpe a busca ou selecione "Todas" para visualizar todas as ONGs cadastradas.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredNgos.map((ngo: NgoItem) => (
            <article
              key={ngo.id}
              className="bg-white rounded-2xl border border-slate-200/90 hover:border-pink-300 p-6 flex flex-col justify-between gap-5 shadow-xs hover:shadow-md transition-all duration-200"
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 font-medium">
                  <span className="text-pink-700 font-semibold">{ngo.areaLabel}</span>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  <span>{ngo.coverage}</span>
                </div>

                <div>
                  <h2 className="text-lg font-display font-bold text-slate-900 leading-snug">{ngo.name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">{ngo.organization}</p>
                </div>

                <p className="text-sm text-slate-600 leading-relaxed">
                  {ngo.summary}
                </p>

                <ul className="space-y-1.5 text-xs text-slate-700 pt-1">
                  {ngo.howTheyHelp.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500 truncate">{ngo.accessChannel}</span>
                <a
                  href={ngo.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-gradient-to-r from-pink-600 to-purple-700 hover:from-pink-700 hover:to-purple-800 rounded-xl transition-all whitespace-nowrap shrink-0 shadow-xs"
                >
                  <span>Acessar ONG</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

