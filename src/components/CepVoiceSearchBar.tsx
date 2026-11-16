import React, { useState } from 'react';
import { AppSection, CepInfo } from '../types';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { formatCep, resolveLocationQuery } from '../utils/voiceSearchParser';
import { Search, MapPin, Mic, Square, RefreshCw, AlertCircle } from 'lucide-react';

interface CepVoiceSearchBarProps {
  variant?: 'hero' | 'compact';
  inputId?: string;
  onLocationResolved: (cepInfo: CepInfo) => void;
  onSectionSuggested?: (section: AppSection) => void;
  onCancel?: () => void;
}

export const CepVoiceSearchBar: React.FC<CepVoiceSearchBarProps> = ({
  variant = 'hero',
  inputId = 'cepVoiceInput',
  onLocationResolved,
  onSectionSuggested,
  onCancel,
}) => {
  const [queryInput, setQueryInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastSpokenText, setLastSpokenText] = useState<string | null>(null);

  const runLookup = async (rawValue: string) => {
    const trimmed = rawValue.trim();
    if (!trimmed) {
      setErrorMessage('Digite seu CEP, cidade ou toque no microfone para falar.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);

    const result = await resolveLocationQuery(trimmed);
    setLoading(false);

    if (result.formattedInput) {
      setQueryInput(result.formattedInput);
    }

    if (result.cepInfo) {
      onLocationResolved(result.cepInfo);
      setQueryInput('');
      setLastSpokenText(null);
      if (result.suggestedSection && onSectionSuggested) {
        onSectionSuggested(result.suggestedSection);
      }
      return;
    }

    if (result.suggestedSection && onSectionSuggested) {
      setLastSpokenText(null);
      onSectionSuggested(result.suggestedSection);
      return;
    }

    if (result.error) {
      setErrorMessage(result.error);
    }
  };

  const {
    isSupported,
    isListening,
    interimTranscript,
    speechError,
    startListening,
    stopListening,
    clearSpeechError,
  } = useSpeechRecognition({
    lang: 'pt-BR',
    onFinalTranscript: (transcript) => {
      setLastSpokenText(transcript);
      setQueryInput(transcript);
      void runLookup(transcript);
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setErrorMessage(null);
    clearSpeechError();
    setLastSpokenText(null);

    // Auto-format as 00000-000 when the user is typing only CEP digits/hyphen
    if (/^[\d-]*$/.test(raw)) {
      setQueryInput(formatCep(raw));
    } else {
      setQueryInput(raw);
    }
  };

  const handleVoiceToggle = () => {
    setErrorMessage(null);
    clearSpeechError();
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const activeError = speechError || errorMessage;
  const isHero = variant === 'hero';

  return (
    <div className="space-y-2 w-full">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void runLookup(queryInput);
        }}
        className={
          isHero
            ? 'flex items-center bg-white rounded-2xl border border-stone-300/90 p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-rose-700 focus-within:border-rose-700 transition-all gap-1.5'
            : 'flex items-center bg-stone-50 rounded-xl border border-stone-300 p-1 focus-within:ring-2 focus-within:ring-rose-700 focus-within:border-rose-700 transition-all gap-1 w-full max-w-md'
        }
      >
        <MapPin className={`${isHero ? 'w-5 h-5 ml-3' : 'w-4 h-4 ml-2'} text-stone-400 shrink-0`} />
        <input
          id={inputId}
          type="text"
          value={queryInput}
          onChange={handleInputChange}
          placeholder={
            isHero
              ? 'Digite seu CEP ou fale sua cidade'
              : 'CEP ou cidade (ex: 01001-000)'
          }
          maxLength={60}
          className={`flex-1 bg-transparent text-stone-900 placeholder-stone-500 focus:outline-none min-w-0 ${
            isHero ? 'px-2 py-2.5 text-sm sm:text-base' : 'px-2 py-2 text-xs sm:text-sm'
          }`}
          aria-label="Digite seu CEP ou cidade, ou use a busca por voz"
        />

        <button
          type="button"
          onClick={handleVoiceToggle}
          disabled={loading}
          aria-label={isListening ? 'Parar busca por voz' : 'Buscar CEP ou local por voz'}
          aria-pressed={isListening}
          title={
            !isSupported
              ? 'Busca por voz indisponível neste navegador'
              : isListening
              ? 'Parar de ouvir'
              : 'Falar CEP ou cidade'
          }
          className={`min-h-[44px] min-w-[44px] px-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 ${
            isListening
              ? 'bg-rose-800 text-white hover:bg-rose-900'
              : 'bg-stone-100 text-stone-800 hover:bg-stone-200 border border-stone-200/80'
          } ${isHero ? 'text-xs sm:text-sm' : 'text-xs'}`}
        >
          {isListening ? (
            <>
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Parar</span>
            </>
          ) : (
            <>
              <Mic className="w-4 h-4 text-rose-800" />
              <span className={isHero ? 'hidden sm:inline' : 'sr-only'}>Falar</span>
            </>
          )}
        </button>

        <button
          type="submit"
          disabled={loading}
          className={`min-h-[44px] rounded-xl font-semibold transition-colors flex items-center justify-center gap-1.5 shrink-0 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-700 ${
            isHero
              ? 'px-5 bg-rose-800 hover:bg-rose-900 disabled:bg-stone-400 text-white text-sm'
              : 'px-4 bg-stone-900 hover:bg-stone-800 disabled:bg-stone-400 text-white text-xs'
          }`}
        >
          {loading ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          <span>{isHero ? 'Buscar' : 'Filtrar'}</span>
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={() => {
              if (isListening) stopListening();
              onCancel();
            }}
            className="min-h-[44px] px-2.5 text-xs font-medium text-stone-600 hover:text-stone-900 shrink-0 whitespace-nowrap"
          >
            Cancelar
          </button>
        )}
      </form>

      {/* Live voice feedback & accessibility announcements */}
      <div aria-live="polite" className="min-h-[1rem]">
        {isListening && (
          <p className="text-xs text-rose-800 font-medium flex items-center justify-center sm:justify-start gap-1.5">
            <Mic className="w-3.5 h-3.5 text-rose-700 shrink-0" />
            <span>
              {interimTranscript
                ? `Ouvindo: "${interimTranscript}"`
                : 'Ouvindo... fale seu CEP, sua cidade ou "emergência"'}
            </span>
          </p>
        )}

        {!isListening && loading && lastSpokenText && (
          <p className="text-xs text-stone-600">
            Buscando por "{lastSpokenText}"...
          </p>
        )}

        {!isListening && activeError && (
          <p className="text-xs text-rose-700 flex items-center justify-center sm:justify-start gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{activeError}</span>
          </p>
        )}
      </div>
    </div>
  );
};
