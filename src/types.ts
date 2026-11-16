export type ServiceCategory = 
  | 'todos'
  | 'juridico'
  | 'psicologico'
  | 'saude'
  | 'cursos'
  | 'emergencia'
  | 'social';

export type AppSection = 
  | 'inicio'
  | 'juridico'
  | 'psicologico'
  | 'saude'
  | 'cursos'
  | 'emergencia'
  | 'ongs_apoio'
  | 'app'
  | 'ongs';

export interface ServiceItem {
  id: string;
  name: string;
  category: ServiceCategory;
  subcategory: string;
  description: string;
  isNationalOnline?: boolean;
  state?: string; // UF
  city?: string;
  neighborhood?: string;
  address?: string;
  cep?: string;
  cepRange?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  whatsapp?: string;
  website?: string;
  hours: string;
  accessMode: 'Livre Demanda (Porta Aberta)' | 'Agendamento Prévio' | 'Online Imediato' | 'Plantão 24h';
  requiresRegistration: false;
  freeConfirmation: string;
  tags: string[];
  tipsForVictim?: string;
}

export interface CepInfo {
  cep: string;
  logradouro: string;
  bairro: string;
  localidade: string;
  uf: string;
  ddd?: string;
  lat?: number;
  lng?: number;
}

export interface BenchmarkProject {
  id: string;
  name: string;
  organization: string;
  coverage: string;
  type: 'ONG / Sociedade Civil' | 'Iniciativa Coletiva' | 'Plataforma Digital' | 'Pública / Parceria';
  keyFeatures: string[];
  howItWorks: string;
  strengths: string[];
  limitationsInVulnerableContexts: string[];
  websiteUrl: string;
  relevanceToYourProject: string;
}
