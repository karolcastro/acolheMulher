import React, { useMemo, useState } from 'react';
import type { AppSection, CepInfo } from '../types';
import {
  RIGHT_THEME_TABS,
  WOMEN_RIGHTS_SIMPLE,
  type WomenRightTheme,
} from '../data/dailyTipsAndRightsData';
import { normalizeAsciiKey } from '../utils/cepSearchService';
import { formatLocationDisplay } from '../utils/cepProximity';
import { ArrowLeft, ArrowRight, CheckCircle2, Search, ShieldCheck, MapPin } from 'lucide-react';

interface RightsViewProps {
  currentLocation: CepInfo | null;
  onSelectSection: (section: AppSection) => void;
  onBackToHome: () => void;
}

export const RightsView: React.FC<RightsViewProps> = ({
  currentLocation,
  onSelectSection,
  onBackToHome,
}) => {
  const [selectedTheme, setSelectedTheme] = useState<WomenRightTheme>('todos');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredRights = useMemo(() => {
    const byTheme =
      selectedTheme === 'todos'
        ? WOMEN_RIGHTS_SIMPLE
        : WOMEN_RIGHTS_SIMPLE.filter((item) => item.theme === selectedTheme);

    const q = normalizeAsciiKey(searchTerm);
    if (!q) return byTheme;

    return byTheme.filter((item) =>
      normalizeAsciiKey(
        `${item.themeLabel} ${item.question} ${item.plainAnswer} ${item.whatYouCanDo.join(' ')} ${item.legalNote}`
      ).includes(q)
    );
  }, [selectedTheme, searchTerm]);

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
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-pink-700">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>Explicação simples · Sem termos difíceis</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-slate-900 text-balance leading-tight">
            Seus direitos explicados de forma fácil
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-3xl leading-relaxed">
            Entenda na prática o que a lei garante para proteger você, seus filhos, sua saúde, seu trabalho e seu dinheiro — sem palavras complicadas e com caminhos gratuitos para pedir ajuda.
          </p>
        </div>

        {currentLocation && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-950 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-blue-700 shrink-0" />
            <span>
              Ao tocar nos botões abaixo, você já verá os serviços gratuitos próximos a{' '}
              <strong>{formatLocationDisplay(currentLocation)}</strong>.
            </span>
          </div>
        )}

        {/* Simple Search Input */}
        <div className="flex items-center bg-white rounded-xl border border-slate-200 p-1.5 max-w-xl shadow-xs focus-within:ring-2 focus-within:ring-purple-600 focus-within:border-purple-600 gap-2">
          <Search className="w-4 h-4 text-purple-700 ml-2.5 shrink-0" />
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Busque uma dúvida... ex: pensão, parto, delegacia, foto, trabalho"
            aria-label="Buscar dúvida sobre direitos das mulheres"
            className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 placeholder-slate-500 focus:outline-none min-w-0 py-1.5"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm('')}
              className="min-h-[36px] px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Theme Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {RIGHT_THEME_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedTheme(tab.id)}
              className={`min-h-[40px] px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                selectedTheme === tab.id
                  ? 'bg-purple-900 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-pink-300 hover:text-pink-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Rights Grid */}
      {filteredRights.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3">
          <p className="text-sm font-semibold text-slate-900">
            Não encontramos esse assunto na lista.
          </p>
          <p className="text-xs text-slate-600">
            Limpe a busca ou fale gratuitamente com uma defensora pública para tirar sua dúvida.
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setSelectedTheme('todos');
            }}
            className="min-h-[40px] px-4 py-2 rounded-xl bg-purple-900 text-white text-xs font-semibold"
          >
            Mostrar todos os direitos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredRights.map((item) => (
            <article
              key={item.id}
              className="bg-white rounded-2xl border border-slate-200/90 hover:border-purple-300 p-6 flex flex-col justify-between gap-5 shadow-xs transition-all"
            >
              <div className="space-y-3.5">
                <div className="text-xs font-semibold text-pink-700">
                  {item.themeLabel}
                </div>

                <h2 className="text-lg font-display font-bold text-slate-900 leading-snug">
                  {item.question}
                </h2>

                <p className="text-sm text-slate-700 leading-relaxed">
                  {item.plainAnswer}
                </p>

                <div className="pt-1 space-y-2">
                  <p className="text-xs font-semibold text-purple-950">
                    O que você pode fazer:
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {item.whatYouCanDo.map((step, idx) => (
                      <li key={idx} className="flex items-start gap-2 leading-relaxed">
                        <CheckCircle2 className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
                        <span>{step}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 space-y-3">
                <p className="text-[11px] text-slate-500 leading-snug">
                  {item.legalNote}
                </p>
                <button
                  type="button"
                  onClick={() => onSelectSection(item.relatedSection)}
                  className="min-h-[44px] w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-900 to-purple-900 hover:from-pink-600 hover:to-purple-700 text-white text-xs font-semibold transition-all whitespace-nowrap"
                >
                  <span>{item.ctaLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
};
