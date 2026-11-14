import React from 'react';
import { EyeOff, LogOut } from 'lucide-react';
import { AppSection } from '../types';

interface HeaderProps {
  activeSection: AppSection;
  setActiveSection: (section: AppSection) => void;
  onQuickExit: () => void;
  onToggleCamouflage: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeSection,
  setActiveSection,
  onQuickExit,
  onToggleCamouflage
}) => {
  const navLinks: { id: AppSection; label: string }[] = [
    { id: 'inicio', label: 'Início' },
    { id: 'ongs_apoio', label: 'ONGs' },
    { id: 'emergencia', label: 'Emergência 24h' },
    { id: 'app', label: 'Baixar App' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-stone-200/80">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        
        {/* Brand */}
        <button
          onClick={() => setActiveSection('inicio')}
          className="text-lg font-serif font-bold tracking-tight text-stone-900 hover:text-rose-800 transition-colors whitespace-nowrap shrink-0"
        >
          AcolheMulher
        </button>

        {/* Clean Single-Row Navigation */}
        <nav className="hidden sm:flex items-center gap-6 text-sm font-medium text-stone-600" aria-label="Navegação principal">
          {navLinks.map((link) => {
            const isActive = activeSection === link.id;
            return (
              <button
                key={link.id}
                onClick={() => setActiveSection(link.id)}
                className={`py-1 transition-colors whitespace-nowrap shrink-0 border-b-2 ${
                  isActive
                    ? 'text-rose-800 border-rose-700 font-semibold'
                    : 'border-transparent hover:text-stone-900'
                }`}
              >
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Safety Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onToggleCamouflage}
            title="Disfarçar esta tela rapidamente"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-600 hover:text-stone-900 hover:bg-stone-100 rounded-xl transition-colors whitespace-nowrap shrink-0"
          >
            <EyeOff className="w-4 h-4" />
            <span className="hidden md:inline">Disfarçar</span>
          </button>

          <button
            onClick={onQuickExit}
            title="Fechar agora e ir para o Google (tecla ESC)"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-rose-700 hover:bg-rose-800 rounded-xl transition-colors whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sair Rápido</span>
          </button>
        </div>

      </div>

      {/* Minimal Mobile Nav */}
      <div className="flex sm:hidden border-t border-stone-100 px-4 py-2 justify-around text-xs font-medium text-stone-600 bg-white">
        {navLinks.map((link) => {
          const isActive = activeSection === link.id;
          return (
            <button
              key={link.id}
              onClick={() => setActiveSection(link.id)}
              className={`px-2 py-1 rounded-lg whitespace-nowrap ${
                isActive ? 'text-rose-800 bg-rose-50 font-semibold' : 'text-stone-600'
              }`}
            >
              {link.label}
            </button>
          );
        })}
      </div>
    </header>
  );
};
