import React, { useState } from 'react';
import { ServiceItem } from '../types';
import { Phone, MapPin, Clock, MessageCircle, ExternalLink, Info } from 'lucide-react';

interface ServiceCardProps {
  service: ServiceItem;
  distanceLabel?: string | null;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service, distanceLabel }) => {
  const [showTips, setShowTips] = useState(false);

  const mapQuery = service.address
    ? encodeURIComponent(service.address)
    : encodeURIComponent(`${service.name} ${service.city || ''}`);

  return (
    <article className="bg-white rounded-2xl border border-slate-200/90 hover:border-pink-300 p-6 flex flex-col justify-between gap-5 shadow-xs hover:shadow-md transition-all duration-200">
      <div className="space-y-3">
        {/* Clean Unboxed Metadata */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 font-medium">
          <span className="text-pink-700 font-semibold">{service.subcategory}</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span>{service.accessMode}</span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="text-blue-800 font-semibold">Gratuito</span>
          {distanceLabel && (
            <>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="text-purple-800 font-semibold">{distanceLabel}</span>
            </>
          )}
        </div>

        {/* Title */}
        <h3 className="text-lg font-display font-bold text-slate-900 leading-snug tracking-tight">
          {service.name}
        </h3>

        {/* Description */}
        <p className="text-sm text-slate-600 leading-relaxed">
          {service.description}
        </p>

        {/* Location & Hours */}
        <div className="space-y-2 pt-1 text-xs text-slate-700">
          <div className="flex items-start gap-2">
            <MapPin className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
            <span className="leading-relaxed">
              {service.isNationalOnline
                ? 'Atendimento em todo o Brasil (telefone ou internet)'
                : service.address || `${service.neighborhood || ''}, ${service.city} - ${service.state}`}
            </span>
          </div>

          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <span className="tabular-nums">{service.hours}</span>
          </div>
        </div>

        {/* Optional Simple Tip */}
        {service.tipsForVictim && (
          <div className="pt-1">
            <button
              type="button"
              onClick={() => setShowTips(!showTips)}
              className="inline-flex items-center gap-1.5 py-1 text-xs font-semibold text-purple-800 hover:text-pink-700 transition-colors"
            >
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>{showTips ? 'Fechar dica' : 'Dica importante antes de ir'}</span>
            </button>
            {showTips && (
              <p className="mt-2 text-xs text-slate-700 pt-2.5 border-t border-slate-100 leading-relaxed">
                {service.tipsForVictim}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Touch-Friendly Action Buttons (min 44px height) */}
      <div className="flex flex-wrap items-center gap-2.5 pt-3 border-t border-slate-100">
        {service.phone && (
          <a
            href={`tel:${service.phone.replace(/\D/g, '')}`}
            className="flex-1 min-w-[136px] min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-950 rounded-xl transition-colors whitespace-nowrap tabular-nums focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-700"
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
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
          >
            <MessageCircle className="w-3.5 h-3.5 text-purple-700 shrink-0" />
            <span>WhatsApp</span>
          </a>
        )}

        {service.address && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${mapQuery}`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
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
            className="min-h-[44px] inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-pink-800 hover:text-pink-950 bg-pink-50/70 hover:bg-pink-100 border border-pink-200 rounded-xl transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
          >
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            <span>Site</span>
          </a>
        )}
      </div>
    </article>
  );
};
