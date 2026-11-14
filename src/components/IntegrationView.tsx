import React, { useState } from 'react';
import { WidgetGenerator } from './WidgetGenerator';
import { PwaShowcase } from './PwaShowcase';
import { Globe, Smartphone } from 'lucide-react';

export const IntegrationView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'widget' | 'pwa'>('widget');

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Sub-navigation bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-2 flex items-center justify-center gap-2 max-w-md mx-auto shadow-xs">
        <button
          onClick={() => setActiveSubTab('widget')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'widget'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Globe className="w-3.5 h-3.5" />
          <span>Widget para ONGs</span>
        </button>

        <button
          onClick={() => setActiveSubTab('pwa')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold transition-all ${
            activeSubTab === 'pwa'
              ? 'bg-rose-700 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Smartphone className="w-3.5 h-3.5" />
          <span>Plataforma + App (PWA)</span>
        </button>
      </div>

      {/* Render selected view */}
      {activeSubTab === 'widget' ? <WidgetGenerator /> : <PwaShowcase />}
    </div>
  );
};
