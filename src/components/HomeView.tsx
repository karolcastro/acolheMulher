import React, { useState } from 'react';
import { AppSection, CepInfo } from '../types';
import { SAMPLE_CEPS } from '../data/servicesData';
import { useCatalog } from '../context/CatalogContext';
import { CepVoiceSearchBar } from './CepVoiceSearchBar';
import {
  MapPin,
  Scale,
  HeartHandshake,
  Stethoscope,
  GraduationCap,
  ShieldAlert,
  Users,
  Phone,
  ExternalLink,
  X,
  Share2,
  WifiOff
} from 'lucide-react';

interface HomeViewProps {
  currentLocation: CepInfo | null;
  onUpdateLocation: (cepInfo: CepInfo | null) => void;
  onSelectSection: (section: AppSection) => void;
  onOpenOfflineModal: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  currentLocation,
  onUpdateLocation,
  onSelectSection,
  onOpenOfflineModal
}) => {
  const { ngos } = useCatalog();
  const [sampleError, setSampleError] = useState<string | null>(null);

  const handleSampleCep = async (cep: string) => {
    setSampleError(null);
    const raw = cep.replace(/\D/g, '');
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`);
      const data = await res.json();
      if (data.erro) {
        setSampleError('CEP não encontrado. Você ainda pode escolher uma opção abaixo.');
        return;
      }
      onUpdateLocation({
        cep: data.cep,
        logradouro: data.logradouro,
        bairro: data.bairro,
        localidade: data.localidade,
        uf: data.uf,
        ddd: data.ddd
      });
    } catch {
      setSampleError('Não foi possível verificar o CEP agora. Tente novamente ou escolha abaixo.');
    }
  };

  const visualTiles: {
    id: AppSection;
    title: string;
    subtitle: string;
    icon: React.ReactNode;
    iconBg: string;
  }[] = [
    {
      id: 'emergencia',
      title: 'Proteção 24h',
      subtitle: 'Delegacia da Mulher, abrigo e 180',
      icon: <ShieldAlert className="w-6 h-6 text-rose-700" />,
      iconBg: 'bg-rose-50'
    },
    {
      id: 'psicologico',
      title: 'Apoio Psicológico',
      subtitle: 'Conversar com psicóloga grátis',
      icon: <HeartHandshake className="w-6 h-6 text-teal-700" />,
      iconBg: 'bg-teal-50'
    },
    {
      id: 'juridico',
      title: 'Advogada Gratuita',
      subtitle: 'Medidas protetivas, pensão e guarda',
      icon: <Scale className="w-6 h-6 text-indigo-700" />,
      iconBg: 'bg-indigo-50'
    },
    {
      id: 'saude',
      title: 'Saúde da Mulher',
      subtitle: 'Exames grátis, parto humanizado, ONGs e SUS',
      icon: <Stethoscope className="w-6 h-6 text-emerald-700" />,
      iconBg: 'bg-emerald-50'
    },
    {
      id: 'cursos',
      title: 'Cursos Gratuitos',
      subtitle: 'Aprender uma profissão e ter renda',
      icon: <GraduationCap className="w-6 h-6 text-amber-700" />,
      iconBg: 'bg-amber-50'
    },
    {
      id: 'ongs_apoio',
      title: 'ONGs que Ajudam',
      subtitle: 'Projetos gratuitos com voluntárias',
      icon: <Users className="w-6 h-6 text-rose-700" />,
      iconBg: 'bg-rose-50'
    }
  ];

  const featuredNgos = ngos.filter((n) => n.featured).slice(0, 3);

  const shareUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}`
      : 'https://acolhemulher.org.br';

  const whatsappShareUrl = `https://wa.me/?text=${encodeURIComponent(
    `Conheça o AcolheMulher: plataforma gratuita e sem cadastro para encontrar delegacias da mulher, apoio psicológico, advogada gratuita, exames e parto humanizado, cursos e ONGs pelo CEP. Acesse: ${shareUrl}`
  )}`;

  return (
    <div className="space-y-12 max-w-4xl mx-auto pb-16 sm:pb-6">

      {/* 1. Calm Hero + CEP & Voice Search */}
      <section className="text-center space-y-6 pt-2">
        <div className="space-y-2.5">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 tracking-tight text-balance">
            Como podemos te ajudar hoje?
          </h1>
          <p className="text-sm sm:text-base text-stone-600 max-w-xl mx-auto">
            Tudo gratuito, sem cadastro e sem senha. Digite seu CEP, fale pelo microfone ou toque no que você precisa.
          </p>
        </div>

        <div className="max-w-lg mx-auto space-y-2.5">
          <CepVoiceSearchBar
            variant="hero"
            inputId="homeCepInput"
            onLocationResolved={onUpdateLocation}
            onSectionSuggested={onSelectSection}
          />

          {sampleError && (
            <p className="text-xs text-rose-700">{sampleError}</p>
          )}

          {currentLocation ? (
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-50 text-emerald-900 rounded-xl border border-emerald-200 text-xs font-medium">
              <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span>
                Mostrando locais em <strong>{currentLocation.localidade} - {currentLocation.uf}</strong>
              </span>
              <button
                type="button"
                onClick={() => onUpdateLocation(null)}
                className="ml-1 p-0.5 hover:bg-emerald-100 rounded text-emerald-800"
                title="Remover CEP"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-stone-600">
              <span>Testar com:</span>
              {SAMPLE_CEPS.slice(0, 3).map((c) => (
                <button
                  key={c.cep}
                  type="button"
                  onClick={() => void handleSampleCep(c.cep)}
                  className="text-stone-700 hover:text-rose-800 underline underline-offset-2"
                >
                  {c.city}
                </button>
              ))}
            </div>
          )}

          <div>
            <button
              type="button"
              onClick={onOpenOfflineModal}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-600 hover:text-rose-800 transition-colors py-1"
            >
              <WifiOff className="w-3.5 h-3.5 text-rose-700 shrink-0" />
              <span className="underline underline-offset-2">
                Como salvar na tela inicial para usar sem internet (Acesso Offline)
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* 2. Big, Friendly, Visual 1-Tap Tiles */}
      <section aria-label="Escolha o tipo de ajuda">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {visualTiles.map((tile) => (
            <button
              key={tile.id}
              onClick={() => onSelectSection(tile.id)}
              className="bg-white hover:bg-stone-50/70 rounded-2xl border border-stone-200/90 hover:border-rose-300 p-6 text-left flex items-center gap-4 transition-all group shadow-xs hover:shadow-md"
            >
              <div className={`w-12 h-12 rounded-2xl ${tile.iconBg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}>
                {tile.icon}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-stone-900 group-hover:text-rose-800 transition-colors">
                  {tile.title}
                </h2>
                <p className="text-xs text-stone-600 mt-0.5 leading-snug">
                  {tile.subtitle}
                </p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 3. Simple Highlighted NGOs Strip */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-serif font-bold text-stone-900">
              ONGs em destaque que podem ajudar
            </h2>
            <p className="text-xs text-stone-600">
              Apoio gratuito de psicólogas, advogadas e voluntárias em todo o Brasil.
            </p>
          </div>
          <button
            onClick={() => onSelectSection('ongs_apoio')}
            className="text-xs font-semibold text-rose-700 hover:text-rose-900 whitespace-nowrap shrink-0 hover:underline"
          >
            Ver todas ({ngos.length})
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {featuredNgos.map((ngo) => (
            <div
              key={ngo.id}
              className="bg-white rounded-2xl border border-stone-200/90 p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="text-xs text-rose-700 font-semibold">
                  {ngo.areaLabel}
                </div>
                <h3 className="text-base font-bold text-stone-900">
                  {ngo.name}
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  {ngo.summary}
                </p>
              </div>

              <a
                href={ngo.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1.5 w-full py-2.5 px-4 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                <span>Acessar ONG</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Simple Emergency Call Strip (Replaces Cluttered Floating Button) */}
      <section className="bg-rose-50 rounded-2xl border border-rose-200/80 p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-center sm:text-left">
          <div className="text-sm font-bold text-stone-900">
            Precisa falar com alguém agora?
          </div>
          <p className="text-xs text-stone-700 mt-0.5">
            Ligação gratuita 24 horas, mesmo sem créditos no celular.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <a
            href="tel:180"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-700 hover:bg-rose-800 text-white text-xs font-semibold rounded-xl transition-colors whitespace-nowrap"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Ligar 180</span>
          </a>
          <a
            href="tel:190"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-stone-50 text-stone-900 border border-stone-300 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Polícia 190</span>
          </a>
        </div>
      </section>

      {/* Compact Floating WhatsApp Share Button (Main Page Only) */}
      <a
        href={whatsappShareUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Compartilhar AcolheMulher no WhatsApp"
        aria-label="Compartilhar link do AcolheMulher no WhatsApp"
        className="fixed bottom-4 right-4 z-30 inline-flex items-center gap-1.5 h-10 px-3 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-medium shadow-md transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
      >
        <Share2 className="w-3.5 h-3.5 shrink-0" />
        <span>WhatsApp</span>
      </a>

    </div>
  );
};
