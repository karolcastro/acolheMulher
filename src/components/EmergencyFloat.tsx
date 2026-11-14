import React, { useState } from 'react';
import { Phone, ShieldAlert, X, HeartHandshake } from 'lucide-react';

export const EmergencyFloat: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <aside aria-label="Contatos de Emergência" className="fixed bottom-6 right-6 z-30">
      {isOpen ? (
        <div className="bg-stone-900 text-white p-5 rounded-3xl shadow-2xl border border-stone-700 w-72 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-stone-800">
            <span className="text-xs font-bold text-rose-300 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4" />
              <span>Contatos Imediatos</span>
            </span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-stone-400 hover:text-white p-1 rounded-lg"
              title="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            <a
              href="tel:180"
              className="flex items-center justify-between p-2.5 rounded-xl bg-rose-950/80 hover:bg-rose-900 border border-rose-800/60 transition-colors"
            >
              <div>
                <div className="font-bold text-rose-200">180 - Central da Mulher</div>
                <div className="text-[10px] text-stone-300">Acolhimento e orientação</div>
              </div>
              <Phone className="w-4 h-4 text-rose-300" />
            </a>

            <a
              href="tel:190"
              className="flex items-center justify-between p-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 transition-colors"
            >
              <div>
                <div className="font-bold text-white">190 - Polícia Militar</div>
                <div className="text-[10px] text-stone-300">Perigo ou agressão agora</div>
              </div>
              <Phone className="w-4 h-4 text-white" />
            </a>

            <a
              href="tel:188"
              className="flex items-center justify-between p-2.5 rounded-xl bg-teal-950/80 hover:bg-teal-900 border border-teal-800/60 transition-colors"
            >
              <div>
                <div className="font-bold text-teal-200">188 - Apoio Emocional (CVV)</div>
                <div className="text-[10px] text-stone-300">Escuta anônima 24 horas</div>
              </div>
              <HeartHandshake className="w-4 h-4 text-teal-300" />
            </a>
          </div>

          <div className="text-[10px] text-stone-300 pt-1 text-center">
            Ligações 100% gratuitas de qualquer celular.
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-full shadow-lg border border-rose-500 font-semibold text-xs transition-all hover:scale-105 active:scale-95"
          title="Telefones de Emergência"
        >
          <Phone className="w-4 h-4 text-rose-200" />
          <span>Telefones 24h</span>
        </button>
      )}
    </aside>
  );
};
