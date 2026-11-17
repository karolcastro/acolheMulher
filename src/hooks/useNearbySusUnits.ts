import { useEffect, useState } from 'react';
import { CepInfo, ServiceItem } from '../types';
import { fetchNearbySusUnits } from '../utils/nearbyHealthLookup';

export function useNearbySusUnits(location: CepInfo | null) {
  const [nearbySusUnits, setNearbySusUnits] = useState<ServiceItem[]>([]);
  const [loadingNearbySus, setLoadingNearbySus] = useState(false);

  const locationKey = location
    ? `${location.uf}|${location.localidade}|${location.cep}|${location.lat ?? ''}|${location.lng ?? ''}`
    : '';

  useEffect(() => {
    if (!location) {
      setNearbySusUnits([]);
      setLoadingNearbySus(false);
      return;
    }

    let cancelled = false;
    setLoadingNearbySus(true);

    fetchNearbySusUnits(location)
      .then((items) => {
        if (!cancelled) {
          setNearbySusUnits(items);
          setLoadingNearbySus(false);
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
  }, [locationKey]);

  return { nearbySusUnits, loadingNearbySus };
}
