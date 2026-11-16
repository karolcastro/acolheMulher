import React from 'react';
import { LogOut } from 'lucide-react';
import { AppSection } from '../types';

interface HeaderProps {
  activeSection: AppSection;
  setActiveSection: (section: AppSection) => void;
  onQuickExit: () => void;
  onToggleCamouflage?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSection,
  setActiveSection,
  onQuickExit
}) => {
  const navLinks: { id: AppSection; label: string }[] = [
    { id: 'inicio', label: 'Início' },
    { id: 'ongs_apoio', label: 'ONGs' },
    { id: 'emergencia', label: 'Emergência 24h' },
    { id: 'app', label: 'Baixar App' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4 sm:gap-8">
        
        {/* Zone 1: Single-Element Brand Wordmark */}
        <button
          type="button"
          onClick={() => setActiveSection('inicio')}
          className="text-xl font-display font-extrabold tracking-tight text-slate-900 hover:text-purple-800 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-600 rounded-lg px-1"
        >
          Acolhe<span className="text-pink-700">Mulher</span>
        </button>

        {/* Zone 2: Clean Single-Row Navigation */}
        <nav className="hidden sm:flex items-center gap-7 text-sm font-medium text-slate-600" aria-label="Navegação principal">
          {navLinks.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <button
                key={link.id}
                type="button"
                onClick={() => setActiveSection(link.id)}
                className={`py-2 transition-colors whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-600 ${
                  isActive
                    ? 'text-purple-900 border-pink-600 font-semibold'
                    : 'border-transparent hover:text-slate-900 hover:border-purple-300'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Urgent Red Quick Exit Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onQuickExit}
            title="Fechar agora e ir para o Google (tecla ESC)"
            className="min-h-[40px] inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-2"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Sair Rápido</span>
          </button>
        </div>

      </div>

      {/* Compact Mobile Nav */}
      <nav
        aria-label="Navegação móvel"
        className="flex sm:hidden border-t border-slate-100 px-3 h-11 items-center justify-around text-xs font-medium text-slate-600 bg-white/95"
      >
        {navLinks.map((link) => {
          const isActive = activeSection === link.id;
          return (
            <button
              key={link.id}
              type="button"
              onClick={() => setActiveSection(link.id)}
              className={`min-h-[36px] px-2.5 py-1 rounded-lg whitespace-nowrap shrink-0 transition-colors ${
                isActive ? 'text-purple-900 bg-pink-50 font-semibold' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {link.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
};
