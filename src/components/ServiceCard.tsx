import React, { useState } from 'react';
import { ServiceItem } from '../types';
import { Phone, MapPin, Clock, MessageCircle, ExternalLink, Info } from 'lucide-react';

interface ServiceCardProps {
  service: ServiceItem;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
  const [showTips, setShowTips] = useState(false);

  const mapQuery = service.address
    ? encodeURIComponent(service.address)
    : encodeURIComponent(`${service.name} ${service.city || ''}`);

  return (
    <article className="bg-white rounded-2xl border border-stone-200/85 hover:border-stone-300 p-6 flex flex-col justify-between gap-5 transition-colors duration-200">
      <div className="space-y-3">
        {/* Clean Unboxed Metadata */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-stone-600 font-medium">
          <span className="text-rose-800 font-semibold">{service.subcategory}</span>
          <span className="text-stone-300" aria-hidden="true">·</span>
          <span>{service.accessMode}</span>
          <span className="text-stone-300" aria-hidden="true">·</span>
          <span className="text-emerald-800 font-semibold">Gratuito</span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-stone-900 leading-snug tracking-tight">
          {service.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-stone-600 leading-relaxed">
          {service.description}
        </p>

        {/* Location & Hours */}
        <div className="space-y-2 pt-1 text-xs text-stone-700">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              {service.isNationalOnline
                ? 'Atendimento em todo o Brasil (telefone ou internet)'
                : service.address || `${service.neighborhood || ''}, ${service.city} - ${service.state}`}
            </span>
          </div>

          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />
            <span className="tabular-nums">{service.hours}</span>
          </div>
        </div>

        {/* Optional Simple Tip */}
        {service.tipsForVictim && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowTips(!showTips)}
              className="inline-flex items-center gap-1.5 py-1 text-xs font-medium text-rose-800 hover:text-rose-950 transition-colors"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>{showTips ? 'Fechar dica' : 'Dica importante antes de ir'}</span>
            </button>
            {showTips && (
              <p className="mt-2 text-xs text-stone-700 pt-2.5 border-t border-stone-100 leading-relaxed">
                {service.tipsForVictim}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Touch-Friendly Action Buttons (min 44px height) */}
      <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-stone-100">
        {service.phone && (
          <a
            href={`tel:${service.phone.replace(/\D/g, '')}`}
            className="flex-1 min-w-[136px] min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-stone-900 hover:bg-stone-800 rounded-xl transition-colors whitespace-nowrap tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-700"
          >
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span>Ligar ({service.phone})</span>
          </a>
        )}

        {service.whatsapp && (
          <a
            href={`https://wa.me/${service.whatsapp}?text=Olá,%20preciso%20de%20orientação%20e%20apoio.`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
            <span>WhatsApp</span>
          </a>
        )}

        {service.address && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-xl transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
          >
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>Ver no Mapa</span>
          </a>
        )}

        {service.website && (
          <a
            href={service.website}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-white hover:bg-stone-50 border border-stone-200 rounded-xl transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            <span>Site</span>
          </a>
        )}
      </div>
    </article>
  );
};
