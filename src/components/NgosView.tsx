import React, { useState } from 'react';
import { SUPPORT_NGOS, NgoHelpArea, NgoItem } from '../data/ngosData';
import { ArrowLeft, ExternalLink, CheckCircle2 } from 'lucide-react';

interface NgosViewProps {
  onBackToHome: () => void;
}

export const NgosView: React.FC<NgosViewProps> = ({ onBackToHome }) => {
  const [selectedArea, setSelectedArea] = useState<NgoHelpArea>('todas');

  const areaTabs: { id: NgoHelpArea; label: string }[] = [
    { id: 'todas', label: 'Todas' },
    { id: 'saude_parto', label: 'Saúde, Parto & Exames' },
    { id: 'psicologico_juridico', label: 'Psicologia & Jurídico' },
    { id: 'acolhimento_protecao', label: 'Acolhimento & Proteção' },
    { id: 'cursos_renda', label: 'Cursos & Renda' },
  ];

  const filteredNgos = React.useMemo(() => {
    if (selectedArea === 'todas') return SUPPORT_NGOS;
    return SUPPORT_NGOS.filter((ngo) => ngo.area === selectedArea);
  }, [selectedArea]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="space-y-4">
        <button
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Voltar para o início</span>
        </button>

        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 text-balance">
            ONGs que podem te ajudar gratuitamente
          </h1>
          <p className="text-sm text-stone-600 max-w-2xl leading-relaxed">
            Projetos solidários feitos por mulheres e voluntárias para oferecer escuta, orientação jurídica e cursos sem custo.
          </p>
        </div>

        {/* Clean Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {areaTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedArea(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                selectedArea === tab.id
                  ? 'bg-stone-900 text-white'
                  : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* NGOs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredNgos.map((ngo: NgoItem) => (
          <article
            key={ngo.id}
            className="bg-white rounded-2xl border border-stone-200/90 p-6 flex flex-col justify-between gap-5"
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600 font-medium">
                <span className="text-rose-700 font-semibold">{ngo.areaLabel}</span>
                <span aria-hidden="true">·</span>
                <span>{ngo.coverage}</span>
              </div>

              <div>
                <h2 className="text-lg font-bold text-stone-900">{ngo.name}</h2>
                <p className="text-xs text-stone-500 mt-0.5">{ngo.organization}</p>
              </div>

              <p className="text-sm text-stone-600 leading-relaxed">
                {ngo.summary}
              </p>

              <ul className="space-y-1.5 text-xs text-stone-700 pt-1">
                {ngo.howTheyHelp.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="pt-3 border-t border-stone-100 flex items-center justify-between gap-3">
              <span className="text-xs text-stone-500 truncate">{ngo.accessChannel}</span>
              <a
                href={ngo.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-xl transition-colors whitespace-nowrap shrink-0"
              >
                <span>Acessar ONG</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};
