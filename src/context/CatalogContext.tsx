import React, { createContext, useContext, useEffect, useState } from 'react';
import { NATIONAL_SERVICES, REGIONAL_SERVICES } from '../data/servicesData';
import { SUPPORT_NGOS, type NgoItem } from '../data/ngosData';
import type { ServiceItem } from '../types';
import {
  isPublicNgoRowActive,
  isPublicServiceRowActive,
  isSupabaseConfigured,
  mapRowToNgoItem,
  mapRowToServiceItem,
  supabase,
  type SupabaseNgoRow,
  type SupabaseServiceRow,
} from '../lib/supabaseClient';

interface CatalogContextValue {
  nationalServices: ServiceItem[];
  regionalServices: ServiceItem[];
  ngos: NgoItem[];
  isLiveConnected: boolean;
  isSupabaseConfigured: boolean;
}

const CatalogContext = createContext<CatalogContextValue>({
  nationalServices: NATIONAL_SERVICES,
  regionalServices: REGIONAL_SERVICES,
  ngos: SUPPORT_NGOS,
  isLiveConnected: false,
  isSupabaseConfigured: false,
});

function upsertById<T extends { id: string }>(items: T[], incoming: T): T[] {
  const index = items.findIndex((item) => item.id === incoming.id);
  if (index === -1) {
    // New entries from Supabase appear at the top so freshly added NGOs/services are immediately visible
    return [incoming, ...items];
  }
  const next = [...items];
  next[index] = incoming;
  return next;
}

function removeById<T extends { id: string }>(items: T[], id: string): T[] {
  if (!items.some((item) => item.id === id)) return items;
  return items.filter((item) => item.id !== id);
}

function mergeServicesCatalog(
  baseNational: ServiceItem[],
  baseRegional: ServiceItem[],
  remoteRows: SupabaseServiceRow[]
): { national: ServiceItem[]; regional: ServiceItem[] } {
  let national = [...baseNational];
  let regional = [...baseRegional];

  for (const row of remoteRows) {
    if (!isPublicServiceRowActive(row)) continue;
    const item = mapRowToServiceItem(row);
    if (item.isNationalOnline) {
      regional = removeById(regional, item.id);
      national = upsertById(national, item);
    } else {
      national = removeById(national, item.id);
      regional = upsertById(regional, item);
    }
  }

  return { national, regional };
}

function mergeNgosCatalog(baseNgos: NgoItem[], remoteRows: SupabaseNgoRow[]): NgoItem[] {
  let merged = [...baseNgos];
  for (const row of remoteRows) {
    if (!isPublicNgoRowActive(row)) continue;
    merged = upsertById(merged, mapRowToNgoItem(row));
  }
  return merged;
}

export const CatalogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [nationalServices, setNationalServices] = useState<ServiceItem[]>(NATIONAL_SERVICES);
  const [regionalServices, setRegionalServices] = useState<ServiceItem[]>(REGIONAL_SERVICES);
  const [ngos, setNgos] = useState<NgoItem[]>(SUPPORT_NGOS);
  const [isLiveConnected, setIsLiveConnected] = useState(false);

  useEffect(() => {
    const client = supabase;
    if (!client) return;

    let isMounted = true;

    const loadInitialCatalog = async () => {
      try {
        const [servicesResult, ngosResult] = await Promise.all([
          client
            .from('services')
            .select(
              'id, name, category, subcategory, description, is_national_online, state, city, neighborhood, address, phone, whatsapp, website, hours, access_mode, requires_registration, free_confirmation, tags, tips_for_woman, is_verified, is_active'
            )
            .eq('is_active', true)
            .eq('is_verified', true)
            .eq('requires_registration', false),
          client
            .from('ngos')
            .select(
              'id, name, organization, area, area_label, coverage, summary, how_they_help, access_channel, website_url, related_categories, featured, is_verified, is_active'
            )
            .eq('is_active', true)
            .eq('is_verified', true),
        ]);

        if (!isMounted) return;

        if (!servicesResult.error && Array.isArray(servicesResult.data)) {
          const merged = mergeServicesCatalog(
            NATIONAL_SERVICES,
            REGIONAL_SERVICES,
            servicesResult.data as SupabaseServiceRow[]
          );
          setNationalServices(merged.national);
          setRegionalServices(merged.regional);
        }

        if (!ngosResult.error && Array.isArray(ngosResult.data)) {
          setNgos(mergeNgosCatalog(SUPPORT_NGOS, ngosResult.data as SupabaseNgoRow[]));
        }
      } catch {
        // Offline-first fallback: keep local catalog silently active
      }
    };

    void loadInitialCatalog();

    const channel = client
      .channel('acolhemulher-catalog-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'services' },
        (payload) => {
          if (!isMounted) return;

          if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id?: string } | null)?.id;
            if (!deletedId) return;
            setNationalServices((prev) => removeById(prev, deletedId));
            setRegionalServices((prev) => removeById(prev, deletedId));
            return;
          }

          const row = payload.new as Partial<SupabaseServiceRow> | null;
          if (!row?.id) return;

          if (!isPublicServiceRowActive(row)) {
            setNationalServices((prev) => removeById(prev, row.id!));
            setRegionalServices((prev) => removeById(prev, row.id!));
            return;
          }

          const item = mapRowToServiceItem(row);
          if (item.isNationalOnline) {
            setRegionalServices((prev) => removeById(prev, item.id));
            setNationalServices((prev) => upsertById(prev, item));
          } else {
            setNationalServices((prev) => removeById(prev, item.id));
            setRegionalServices((prev) => upsertById(prev, item));
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'ngos' },
        (payload) => {
          if (!isMounted) return;

          if (payload.eventType === 'DELETE') {
            const deletedId = (payload.old as { id?: string } | null)?.id;
            if (!deletedId) return;
            setNgos((prev) => removeById(prev, deletedId));
            return;
          }

          const row = payload.new as Partial<SupabaseNgoRow> | null;
          if (!row?.id) return;

          if (!isPublicNgoRowActive(row)) {
            setNgos((prev) => removeById(prev, row.id!));
            return;
          }

          const item = mapRowToNgoItem(row);
          setNgos((prev) => upsertById(prev, item));
        }
      )
      .subscribe((status) => {
        if (!isMounted) return;
        setIsLiveConnected(status === 'SUBSCRIBED');
      });

    return () => {
      isMounted = false;
      setIsLiveConnected(false);
      void client.removeChannel(channel);
    };
  }, []);

  return (
    <CatalogContext.Provider
      value={{
        nationalServices,
        regionalServices,
        ngos,
        isLiveConnected,
        isSupabaseConfigured,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
};

export function useCatalog(): CatalogContextValue {
  return useContext(CatalogContext);
}
