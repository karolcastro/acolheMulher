import React, { useState } from 'react';
import type { NgoHelpArea, NgoItem } from '../data/ngosData';
import { useCatalog } from '../context/CatalogContext';
import { ArrowLeft, ExternalLink, CheckCircle2 } from 'lucide-react';

interface NgosViewProps {
  onBackToHome: () => void;
}

export const NgosView: React.FC<NgosViewProps> = ({ onBackToHome }) => {
  const { ngos } = useCatalog();
  const [selectedArea, setSelectedArea] = useState<NgoHelpArea>('todas');

  const areaTabs: { id: NgoHelpArea; label: string }[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'saude_parto', label: 'Saúde, Parto & Exames' },
    { id: 'psicologico_juridico', label: 'Psicologia & Jurídico' },
    { id: 'acolhimento_protecao', label: 'Acolhimento & Proteção' },
    { id: 'cursos_renda', label: 'Cursos & Renda' },
  ];

  const filteredNgos = React.useMemo(() => {
    if (selectedArea === 'todas') return ngos;
    return ngos.filter((ngo) => ngo.area === selectedArea);
  }, [selectedArea, ngos]);

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
            ONGs que podem te ajudar gratuitamente
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
            Projetos solidários feitos por mulheres e voluntárias para oferecer escuta, orientação jurídica, exames e cursos sem custo.
          </p>
        </div>

        {/* Clean Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {areaTabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedArea(tab.id)}
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
    </div>
  );
};
