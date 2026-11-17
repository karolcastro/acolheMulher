import { useEffect, useState } from 'react';
import { CepInfo, ServiceCategory, ServiceItem } from '../types';
import { fetchNearbySusUnits, normalizePublicScope } from '../utils/nearbyHealthLookup';
import { syncDiscoveredNgoToDatabase } from '../utils/demandAnalytics';

export function useNearbySusUnits(
  location: CepInfo | null,
  category?: ServiceCategory | 'ongs_apoio' | 'geral'
) {
  const [nearbySusUnits, setNearbySusUnits] = useState<ServiceItem[]>([]);
  const [loadingNearbySus, setLoadingNearbySus] = useState(false);

  const scope = normalizePublicScope(category);
  const locationKey = location
    ? `${location.uf}|${location.localidade}|${location.cep}|${location.lat ?? ''}|${location.lng ?? ''}|${scope}`
    : '';

  useEffect(() => {
    if (!location) {
      setNearbySusUnits([]);
      setLoadingNearbySus(false);
      return;
    }

    let cancelled = false;
    setLoadingNearbySus(true);

    fetchNearbySusUnits(location, scope)
      .then((items) => {
        if (!cancelled) {
          setNearbySusUnits(items);
          setLoadingNearbySus(false);
          for (const unit of items) {
            if (unit.category === 'social') {
              void syncDiscoveredNgoToDatabase(unit);
            }
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setNearbySusUnits([]);
          setLoadingNearbySus(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [locationKey, scope]);

  return { nearbySusUnits, loadingNearbySus };
}
