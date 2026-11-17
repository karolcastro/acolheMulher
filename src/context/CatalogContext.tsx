import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { NATIONAL_SERVICES, REGIONAL_SERVICES } from '../data/servicesData';
import { SUPPORT_NGOS, type NgoHelpArea, type NgoItem } from '../data/ngosData';
import type { ServiceItem } from '../types';
import {
  areNgosDuplicates,
  isPublicNgoRowActive,
  isPublicServiceRowActive,
  isSupabaseConfigured,
  mapRowToNgoItem,
  mapRowToServiceItem,
  normalizeNgoNameKey,
  supabase,
  type SupabaseNgoRow,
  type SupabaseServiceRow,
} from '../lib/supabaseClient';

export interface RegisterNgoInput {
  name: string;
  organization: string;
  area: Exclude<NgoHelpArea, 'todas'>;
  areaLabel: string;
  coverage: string;
  state?: string;
  city?: string;
  summary: string;
  howTheyHelp: string[];
  accessChannel: string;
  websiteUrl: string;
  privacyNote?: string;
  relatedCategories: NgoItem['relatedCategories'];
  isFreeConfirmed: boolean;
}

export interface RegisterNgoResult {
  status: 'inserted' | 'local_only' | 'duplicate' | 'invalid' | 'error';
  message: string;
  ngo?: NgoItem;
  existingName?: string;
}

interface CatalogContextValue {
  nationalServices: ServiceItem[];
  regionalServices: ServiceItem[];
  ngos: NgoItem[];
  isLiveConnected: boolean;
  isSupabaseConfigured: boolean;
  findDuplicateNgo: (
    candidate: Pick<NgoItem, 'name' | 'websiteUrl' | 'state' | 'city'>
  ) => NgoItem | undefined;
  registerPartnerNgo: (input: RegisterNgoInput) => Promise<RegisterNgoResult>;
}

const PAID_OR_COMMERCIAL_RE =
  /\b(mensalidade|plano de sa[uú]de|conv[eê]nio|particular|privad[oa]|unimed|hapvida|amil|bradesco sa[uú]de|sulam[eé]rica|taxa de ades[aã]o|consulta paga)\b/i;

const CatalogContext = createContext<CatalogContextValue>({
  nationalServices: NATIONAL_SERVICES,
  regionalServices: REGIONAL_SERVICES,
  ngos: SUPPORT_NGOS,
  isLiveConnected: false,
  isSupabaseConfigured: false,
  findDuplicateNgo: () => undefined,
  registerPartnerNgo: async () => ({
    status: 'error',
    message: 'Catálogo ainda não inicializado.',
  }),
});

function upsertById<T extends { id: string }>(items: T[], incoming: T): T[] {
  const index = items.findIndex((item) => item.id === incoming.id);
  if (index === -1) {
    return [incoming, ...items];
  }
  const next = [...items];
  next[index] = incoming;
  return next;
}

export function upsertNgoUnique(items: NgoItem[], incoming: NgoItem): NgoItem[] {
  const duplicateIndex = items.findIndex((existing) => areNgosDuplicates(existing, incoming));
  if (duplicateIndex === -1) {
    return [incoming, ...items];
  }

  const next = items.filter((existing, idx) => idx === duplicateIndex || !areNgosDuplicates(existing, incoming));
  const current = next[0] ? next.findIndex((existing) => areNgosDuplicates(existing, incoming)) : -1;
  if (current === -1) return [incoming, ...next];

  const existingItem = next[current];
  next[current] = {
    ...existingItem,
    ...incoming,
    state: incoming.state || existingItem.state,
    city: incoming.city || existingItem.city,
    privacyNote:
      incoming.privacyNote && incoming.privacyNote !== 'Atendimento gratuito sem exposição pública de dados.'
        ? incoming.privacyNote
        : existingItem.privacyNote,
  };
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

export function mergeNgosCatalog(baseNgos: NgoItem[], remoteRows: SupabaseNgoRow[]): NgoItem[] {
  let merged: NgoItem[] = [];
  for (const base of baseNgos) {
    merged = upsertNgoUnique(merged, base);
  }
  // Keep original order for base items, then apply remote rows without duplicating legacy IDs/names/domains
  merged = [...merged].reverse();

  for (const row of remoteRows) {
    if (!isPublicNgoRowActive(row)) continue;
    merged = upsertNgoUnique(merged, mapRowToNgoItem(row));
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
        const loadServicesWithFallback = async () => {
          const extended = await client
            .from('services')
            .select(
              'id, name, category, subcategory, description, is_national_online, state, city, neighborhood, address, cep, lat, lng, phone, whatsapp, website, hours, access_mode, requires_registration, free_confirmation, tags, tips_for_woman, is_verified, is_active'
            )
            .eq('is_active', true)
            .eq('is_verified', true)
            .eq('requires_registration', false);

          if (!extended.error) return extended;

          return client
            .from('services')
            .select(
              'id, name, category, subcategory, description, is_national_online, state, city, neighborhood, address, phone, whatsapp, website, hours, access_mode, requires_registration, free_confirmation, tags, tips_for_woman, is_verified, is_active'
            )
            .eq('is_active', true)
            .eq('is_verified', true)
            .eq('requires_registration', false);
        };

        const loadNgosWithFallback = async () => {
          const extended = await client
            .from('ngos')
            .select(
              'id, name, organization, area, area_label, coverage, state, city, summary, how_they_help, access_channel, website_url, privacy_note, related_categories, featured, is_verified, is_active'
            )
            .eq('is_active', true)
            .eq('is_verified', true);

          if (!extended.error) return extended;

          return client
            .from('ngos')
            .select(
              'id, name, organization, area, area_label, coverage, summary, how_they_help, access_channel, website_url, related_categories, featured, is_verified, is_active'
            )
            .eq('is_active', true)
            .eq('is_verified', true);
        };

        const [servicesResult, ngosResult] = await Promise.all([
          loadServicesWithFallback(),
          loadNgosWithFallback(),
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
          setNgos((prev) => upsertNgoUnique(prev, item));
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

  const findDuplicateNgo = useCallback(
    (candidate: Pick<NgoItem, 'name' | 'websiteUrl' | 'state' | 'city'>): NgoItem | undefined => {
      return ngos.find((existing) =>
        areNgosDuplicates(existing, { id: '', ...candidate })
      );
    },
    [ngos]
  );

  const registerPartnerNgo = useCallback(
    async (input: RegisterNgoInput): Promise<RegisterNgoResult> => {
      const name = input.name.trim();
      const organization = (input.organization || name).trim();
      const summary = input.summary.trim();
      const websiteUrl = input.websiteUrl.trim();
      const state = input.state?.trim().toUpperCase().slice(0, 2) || undefined;
      const city = input.city?.trim() || undefined;
      const coverage =
        input.coverage.trim() ||
        (state ? `${city ? `${city} - ` : ''}${state}` : 'Todo o Brasil');
      const accessChannel = input.accessChannel.trim() || 'Atendimento gratuito pelo site oficial';
      const privacyNote =
        input.privacyNote?.trim() || 'Atendimento 100% gratuito e sigiloso voltado para mulheres.';

      if (!input.isFreeConfirmed) {
        return {
          status: 'invalid',
          message: 'Confirme que o atendimento da ONG é 100% gratuito e voltado para mulheres.',
        };
      }

      if (name.length < 4) {
        return {
          status: 'invalid',
          message: 'Informe o nome completo da ONG (mínimo 4 caracteres).',
        };
      }

      if (summary.length < 15) {
        return {
          status: 'invalid',
          message: 'Descreva como a ONG apoia mulheres gratuitamente (mínimo 15 caracteres).',
        };
      }

      if (!/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(websiteUrl)) {
        return {
          status: 'invalid',
          message: 'Informe um site ou link oficial válido começando com https:// ou http://',
        };
      }

      if (PAID_OR_COMMERCIAL_RE.test(`${name} ${organization} ${summary} ${accessChannel}`)) {
        return {
          status: 'invalid',
          message: 'Serviços pagos, convênios ou particulares não são aceitos na plataforma.',
        };
      }

      const duplicate = findDuplicateNgo({ name, websiteUrl, state, city });
      if (duplicate) {
        return {
          status: 'duplicate',
          existingName: duplicate.name,
          message: `Esta ONG já está cadastrada no banco de dados (${duplicate.name}). Não é permitido cadastrar ONGs duplicadas.`,
        };
      }

      const slug = normalizeNgoNameKey(name).replace(/[^a-z0-9]+/g, '-').slice(0, 48) || 'parceira';
      const tempId = `ngo-${slug}-${Date.now().toString(36).slice(-5)}`;
      const localNgo: NgoItem = {
        id: tempId,
        name,
        organization,
        featured: false,
        area: input.area,
        areaLabel: input.areaLabel.trim() || 'Apoio Gratuito para Mulheres',
        coverage,
        state,
        city,
        accessChannel,
        summary,
        howTheyHelp:
          input.howTheyHelp.filter((h) => h.trim().length > 0).length > 0
            ? input.howTheyHelp.filter((h) => h.trim().length > 0)
            : [summary],
        websiteUrl,
        privacyNote,
        relatedCategories:
          input.relatedCategories.length > 0
            ? input.relatedCategories
            : ['psicologico', 'juridico', 'emergencia'],
      };

      if (!supabase || !isSupabaseConfigured) {
        setNgos((prev) => upsertNgoUnique(prev, localNgo));
        return {
          status: 'local_only',
          ngo: localNgo,
          message:
            'ONG adicionada à sessão atual. Configure o Supabase (script 005) para gravar permanentemente no banco de dados online.',
        };
      }

      try {
        const { data, error } = await supabase.rpc('register_ngo_candidate', {
          p_name: name,
          p_organization: organization,
          p_area: input.area,
          p_area_label: localNgo.areaLabel,
          p_coverage: coverage,
          p_state: state ?? null,
          p_city: city ?? null,
          p_summary: summary,
          p_how_they_help: localNgo.howTheyHelp,
          p_access_channel: accessChannel,
          p_website_url: websiteUrl,
          p_privacy_note: privacyNote,
          p_related_categories: localNgo.relatedCategories,
          p_is_free_confirmed: input.isFreeConfirmed,
          p_source_type: 'partner_form',
        });

        if (error) {
          return {
            status: 'error',
            message:
              'Não foi possível salvar no Supabase agora. Verifique se o script SQL 005 foi executado no SQL Editor.',
          };
        }

        const payload = (data || {}) as {
          status?: string;
          ngo_id?: string;
          existing_name?: string;
          message?: string;
        };

        if (payload.status === 'duplicate') {
          return {
            status: 'duplicate',
            existingName: payload.existing_name,
            message:
              payload.message ||
              'Esta ONG já está cadastrada no banco de dados (nome ou site duplicado).',
          };
        }

        if (payload.status === 'invalid') {
          return {
            status: 'invalid',
            message: payload.message || 'Dados inválidos para cadastro da ONG.',
          };
        }

        const persistedNgo: NgoItem = {
          ...localNgo,
          id: payload.ngo_id || tempId,
        };
        setNgos((prev) => upsertNgoUnique(prev, persistedNgo));

        return {
          status: 'inserted',
          ngo: persistedNgo,
          message:
            payload.message ||
            'ONG gravada no banco de dados de ONGs com sucesso e já disponível nas buscas.',
        };
      } catch {
        return {
          status: 'error',
          message: 'Falha de conexão ao tentar registrar a ONG no banco de dados.',
        };
      }
    },
    [findDuplicateNgo]
  );

  return (
    <CatalogContext.Provider
      value={{
        nationalServices,
        regionalServices,
        ngos,
        isLiveConnected,
        isSupabaseConfigured,
        findDuplicateNgo,
        registerPartnerNgo,
      }}
    >
      {children}
    </CatalogContext.Provider>
  );
};

export function useCatalog(): CatalogContextValue {
  return useContext(CatalogContext);
}

