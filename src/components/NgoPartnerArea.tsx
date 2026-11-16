import React, { useState } from 'react';
import { WidgetGenerator } from './WidgetGenerator';
import { GitHubIntegrationView } from './GitHubIntegrationView';
import { Globe, Database, Building2, ShieldCheck } from 'lucide-react';

export const NgoPartnerArea: React.FC = () => {
  const [partnerTab, setPartnerTab] = useState<'widget' | 'dados_github'>('widget');

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      
      {/* Header for Institutional / NGO Partners */}
      <div className="bg-white rounded-3xl border border-stone-200/85 p-6 md:p-8 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-rose-800 text-xs font-semibold mb-1">
              <Building2 className="w-4 h-4 shrink-0" />
              <span>Espaço exclusivo para instituições, coletivos e ONGs</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-900 leading-tight text-balance">
              Área de Parcerias & Integração Técnica
            </h1>
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 self-start sm:self-center">
            <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
            <span>Código aberto · Sem fins lucrativos</span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-3xl">
          Esta área é voltada para organizações da sociedade civil, coletivos de mulheres e portais parceiros. 
          Aqui você pode obter o <strong>Widget de busca para embutir no seu próprio site</strong> ou acessar a <strong>base de dados aberta e repositório no GitHub</strong>.
        </p>

        {/* Clean Sub-navigation for NGOs */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={() => setPartnerTab('widget')}
            className={`min-h-[40px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              partnerTab === 'widget'
                ? 'bg-rose-800 text-white'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>1. Gerar Widget para o seu Site</span>
          </button>

          <button
            type="button"
            onClick={() => setPartnerTab('dados_github')}
            className={`min-h-[40px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
              partnerTab === 'dados_github'
                ? 'bg-rose-800 text-white'
                : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
            }`}
          >
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span>2. Dados Abertos & GitHub</span>
          </button>
        </div>
      </div>

      {/* Content based on sub-tab */}
      {partnerTab === 'widget' ? (
        <WidgetGenerator />
      ) : (
        <GitHubIntegrationView />
      )}

    </div>
  );
};
