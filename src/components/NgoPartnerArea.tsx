import React, { useState } from 'react';
import { WidgetGenerator } from './WidgetGenerator';
import { GitHubIntegrationView } from './GitHubIntegrationView';
import { Globe, Database, Building2, ShieldCheck } from 'lucide-react';

export const NgoPartnerArea: React.FC = () => {
  const [partnerTab, setPartnerTab] = useState<'widget' | 'dados_github'>('widget');

  return (
    <div className="space-y-8 max-w-6xl mx-auto">

      {/* Header for Institutional / NGO Partners */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-8 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-pink-700 text-xs font-semibold mb-1">
              <Building2 className="w-4 h-4 shrink-0" />
              <span>Espaço exclusivo para instituições, coletivos e ONGs</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 leading-tight text-balance">
              Área de Parcerias & Integração Técnica
            </h1>
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-900 self-start sm:self-center">
            <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
            <span>Código aberto · Sem fins lucrativos</span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
          Esta área é voltada para organizações da sociedade civil, coletivos de mulheres e portais parceiros.
          Aqui você pode obter o <strong>Widget de busca para embutir no seu próprio site</strong> ou acessar a <strong>base de dados aberta e repositório no GitHub</strong>.
        </p>

        {/* Clean Sub-navigation for NGOs */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setPartnerTab('widget')}
            className={`min-h-[40px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              partnerTab === 'widget'
                ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-purple-900 hover:bg-purple-50'
            }`}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>1. Gerar Widget para o seu Site</span>
          </button>

          <button
            type="button"
            onClick={() => setPartnerTab('dados_github')}
            className={`min-h-[40px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              partnerTab === 'dados_github'
                ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-purple-900 hover:bg-purple-50'
            }`}
          >
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span>2. Dados Abertos & GitHub</span>
          </button>
        </div>
      </div>

      {partnerTab === 'widget' ? (
        <WidgetGenerator />
      ) : (
        <GitHubIntegrationView />
      )}

    </div>
  );
};
