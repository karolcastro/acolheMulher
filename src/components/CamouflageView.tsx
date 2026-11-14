import React from 'react';
import { ChefHat, ArrowLeft, Clock, Users, Star } from 'lucide-react';

interface CamouflageViewProps {
  onRestore: () => void;
}

export const CamouflageView: React.FC<CamouflageViewProps> = ({ onRestore }) => {
  return (
    <div className="min-h-screen bg-amber-50/50 text-stone-800 p-6 md:p-12 font-sans">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-10 rounded-2xl shadow-sm border border-amber-100">
        
        {/* Safe Exit / Restore back link hidden as a calm discrete breadcrumb */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-stone-100 text-xs text-stone-700">
          <div className="flex items-center gap-1.5 text-amber-700 font-medium">
            <ChefHat className="w-4 h-4" />
            <span>Caderno de Culinária Familiar</span>
          </div>
          <button
            onClick={onRestore}
            className="flex items-center gap-1.5 px-3 py-1 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-lg transition-colors text-xs"
            title="Voltar ao portal seguro"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Continuar leitura</span>
          </button>
        </div>

        <h1 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 mb-4">
          Bolo de Cenoura com Calda Crocante de Chocolate
        </h1>

        <div className="flex items-center gap-6 text-sm text-stone-700 mb-6">
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>45 minutos</span>
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4 text-amber-600" />
            <span>12 porções</span>
          </span>
          <span className="flex items-center gap-1 text-amber-700 font-medium">
            <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
            <span>4.9 (1.230 avaliações)</span>
          </span>
        </div>

        <div className="bg-amber-50 p-4 rounded-xl border border-amber-200/60 mb-8">
          <h2 className="font-bold text-stone-900 text-sm mb-2">Ingredientes da Massa:</h2>
          <ul className="text-sm space-y-1.5 text-stone-700 list-disc list-inside">
            <li>3 cenouras médias picadas e descascadas (aproximadamente 250g)</li>
            <li>3 ovos inteiros em temperatura ambiente</li>
            <li>1 xícara (chá) de óleo vegetal</li>
            <li>2 xícaras (chá) de açúcar cristal ou refinado</li>
            <li>2 xícaras (chá) de farinha de trigo peneirada</li>
            <li>1 colher (sopa) de fermento químico em pó para bolos</li>
            <li>1 pitadinha de sal refinado</li>
          </ul>
        </div>

        <div className="space-y-4 text-sm text-stone-700 leading-relaxed mb-8">
          <h2 className="font-bold text-stone-900 text-base">Modo de Preparo:</h2>
          <p>
            1. No liquidificador, adicione as cenouras, os ovos e o óleo. Bata muito bem em velocidade máxima por cerca de 4 a 5 minutos até obter um creme completamente liso, sem pedacinhos de cenoura.
          </p>
          <p>
            2. Transfira a mistura para uma tigela funda e junte o açúcar, mexendo delicadamente com um batedor de arame.
          </p>
          <p>
            3. Acrescente a farinha aos poucos, mexendo com movimentos suaves de baixo para cima para que o bolo fique leve e fofo. Por último, incorpore o fermento.
          </p>
          <p>
            4. Despeje em fôrma untada e enfarinhada. Leve ao forno pré-aquecido a 180°C por cerca de 40 minutos. Espete um palito no centro: saindo limpo, está pronto!
          </p>
        </div>

        <div className="pt-6 border-t border-stone-100 flex items-center justify-between">
          <span className="text-xs text-stone-700">Dica: Nunca abra o forno antes dos primeiros 30 minutos.</span>
          <button
            onClick={onRestore}
            className="text-xs text-stone-600 hover:text-stone-900 underline underline-offset-4"
          >
            (Desbloquear visualização)
          </button>
        </div>

      </div>
    </div>
  );
};
