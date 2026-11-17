import React, { useMemo, useState } from 'react';
import { WidgetGenerator } from './WidgetGenerator';
import { GitHubIntegrationView } from './GitHubIntegrationView';
import { useCatalog } from '../context/CatalogContext';
import type { NgoHelpArea, NgoItem } from '../data/ngosData';
import {
  Globe,
  Database,
  Building2,
  ShieldCheck,
  PlusCircle,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';

const UF_OPTIONS = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
];

const AREA_LABELS: Record<Exclude<NgoHelpArea, 'todas'>, string> = {
  psicologico_juridico: 'Psicologia & Jurídico',
  acolhimento_protecao: 'Acolhimento & Proteção',
  saude_parto: 'Saúde, Parto & Exames',
  cursos_renda: 'Cursos & Renda',
};

const RELATED_CATEGORY_OPTIONS: Array<{
  id: NgoItem['relatedCategories'][number];
  label: string;
}> = [
  { id: 'psicologico', label: 'Apoio Psicológico' },
  { id: 'juridico', label: 'Advogada Gratuita' },
  { id: 'saude', label: 'Saúde & Exames' },
  { id: 'emergencia', label: 'Proteção 24h' },
  { id: 'cursos', label: 'Cursos & Renda' },
];

export const NgoPartnerArea: React.FC = () => {
  const { ngos, findDuplicateNgo, registerPartnerNgo } = useCatalog();
  const [partnerTab, setPartnerTab] = useState<'widget' | 'cadastrar_ong' | 'dados_github'>('widget');

  const [name, setName] = useState('');
  const [organization, setOrganization] = useState('');
  const [area, setArea] = useState<Exclude<NgoHelpArea, 'todas'>>('psicologico_juridico');
  const [stateUf, setStateUf] = useState('');
  const [city, setCity] = useState('');
  const [coverage, setCoverage] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [accessChannel, setAccessChannel] = useState('');
  const [summary, setSummary] = useState('');
  const [howHelpText, setHowHelpText] = useState('');
  const [privacyNote, setPrivacyNote] = useState('');
  const [relatedCategories, setRelatedCategories] = useState<NgoItem['relatedCategories']>([
    'psicologico',
    'juridico',
  ]);
  const [isFreeConfirmed, setIsFreeConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  const liveDuplicate = useMemo(() => {
    if (name.trim().length < 3 && websiteUrl.trim().length < 5) return undefined;
    return findDuplicateNgo({
      name: name.trim(),
      websiteUrl: websiteUrl.trim(),
      state: stateUf || undefined,
      city: city.trim() || undefined,
    });
  }, [name, websiteUrl, stateUf, city, findDuplicateNgo]);

  const toggleCategory = (cat: NgoItem['relatedCategories'][number]) => {
    setRelatedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmitNgo = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (liveDuplicate) {
      setFeedback({
        type: 'warning',
        text: `Esta ONG já está cadastrada no banco (${liveDuplicate.name}). Não é permitido cadastrar ONGs duplicadas.`,
      });
      return;
    }

    setSubmitting(true);
    const helpLines = howHelpText
      .split(/\n|;/)
      .map((item) => item.trim())
      .filter(Boolean);

    const result = await registerPartnerNgo({
      name,
      organization: organization || name,
      area,
      areaLabel: AREA_LABELS[area],
      coverage:
        coverage.trim() ||
        (stateUf ? `${city.trim() ? `${city.trim()} - ` : ''}${stateUf}` : 'Todo o Brasil'),
      state: stateUf || undefined,
      city: city.trim() || undefined,
      summary,
      howTheyHelp: helpLines,
      accessChannel: accessChannel.trim() || 'Atendimento gratuito pelo site oficial',
      websiteUrl,
      privacyNote: privacyNote.trim() || undefined,
      relatedCategories:
        relatedCategories.length > 0 ? relatedCategories : ['psicologico', 'juridico'],
      isFreeConfirmed,
    });
    setSubmitting(false);

    if (result.status === 'inserted' || result.status === 'local_only') {
      setFeedback({ type: 'success', text: result.message });
      setName('');
      setOrganization('');
      setStateUf('');
      setCity('');
      setCoverage('');
      setWebsiteUrl('');
      setAccessChannel('');
      setSummary('');
      setHowHelpText('');
      setPrivacyNote('');
      setIsFreeConfirmed(false);
    } else if (result.status === 'duplicate') {
      setFeedback({ type: 'warning', text: result.message });
    } else {
      setFeedback({ type: 'error', text: result.message });
    }
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto">

      {/* Header for Institutional / NGO Partners */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-8 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-pink-700 text-xs font-semibold mb-1">
              <Building2 className="w-4 h-4 shrink-0" />
              <span>Espaço exclusivo para instituições, coletivos e ONGs</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-display font-bold text-slate-900 leading-tight text-balance">
              Área de Parcerias & Integração Técnica
            </h1>
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-900 self-start sm:self-center">
            <ShieldCheck className="w-4 h-4 text-blue-700 shrink-0" />
            <span>{ngos.length} ONGs no banco · Sem duplicatas</span>
          </div>
        </div>

        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
          Esta área é voltada para organizações da sociedade civil, coletivos de mulheres e portais parceiros.
          Aqui você pode obter o <strong>Widget de busca para seu site</strong>, <strong>cadastrar novas ONGs gratuitas no banco de dados (com trava anti-duplicidade)</strong> ou acompanhar os dados e buscas da plataforma.
        </p>

        {/* Clean Sub-navigation for NGOs */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setPartnerTab('widget')}
            className={`min-h-[40px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              partnerTab === 'widget'
                ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-purple-900 hover:bg-purple-50'
            }`}
          >
            <Globe className="w-3.5 h-3.5 shrink-0" />
            <span>1. Gerar Widget para o seu Site</span>
          </button>

          <button
            type="button"
            onClick={() => setPartnerTab('cadastrar_ong')}
            className={`min-h-[40px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              partnerTab === 'cadastrar_ong'
                ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-purple-900 hover:bg-purple-50'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5 shrink-0" />
            <span>2. Cadastrar ONG no Banco</span>
          </button>

          <button
            type="button"
            onClick={() => setPartnerTab('dados_github')}
            className={`min-h-[40px] flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              partnerTab === 'dados_github'
                ? 'bg-gradient-to-r from-pink-600 to-purple-700 text-white shadow-xs'
                : 'text-slate-600 hover:text-purple-900 hover:bg-purple-50'
            }`}
          >
            <Database className="w-3.5 h-3.5 shrink-0" />
            <span>3. Dados Abertos & Buscas</span>
          </button>
        </div>
      </div>

      {partnerTab === 'widget' && <WidgetGenerator />}

      {partnerTab === 'cadastrar_ong' && (
        <section
          aria-label="Cadastrar nova ONG gratuita no banco de dados"
          className="bg-white rounded-3xl border border-slate-200/90 p-6 md:p-8 space-y-6 shadow-xs"
        >
          <div className="space-y-1.5">
            <h2 className="text-xl font-display font-bold text-slate-900">
              Cadastrar ONG Voltada para Mulheres
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-3xl">
              Todas as ONGs cadastradas são gravadas diretamente no banco de dados <code className="font-mono text-purple-900">public.ngos</code> com validação automática contra duplicatas (por nome normalizado e domínio do site) e bloqueio de serviços pagos.
            </p>
          </div>

          {liveDuplicate && (
            <div
              role="alert"
              className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex items-start gap-3 text-xs text-amber-950"
            >
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold">
                  ONG já cadastrada no banco: {liveDuplicate.name}
                </p>
                <p>
                  Já existe um registro com este mesmo nome ou site ({liveDuplicate.websiteUrl}). Para manter o banco limpo e sem repetições, não cadastramos ONGs duplicadas.
                </p>
              </div>
            </div>
          )}

          {feedback && (
            <div
              role="status"
              className={`rounded-2xl p-4 flex items-start gap-3 text-xs border ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                  : feedback.type === 'warning'
                  ? 'bg-amber-50 border-amber-200 text-amber-950'
                  : 'bg-red-50 border-red-200 text-red-950'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          <form onSubmit={handleSubmitNgo} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="ngoName" className="block text-xs font-semibold text-slate-800">
                  Nome da ONG *
                </label>
                <input
                  id="ngoName"
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Instituto Mulheres Livres"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ngoOrg" className="block text-xs font-semibold text-slate-800">
                  Organização / Rede Mantenedora
                </label>
                <input
                  id="ngoOrg"
                  type="text"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                  placeholder="Ex: Associação Mulheres Livres · BA"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ngoWebsite" className="block text-xs font-semibold text-slate-800">
                  Site oficial (com https://) *
                </label>
                <input
                  id="ngoWebsite"
                  type="url"
                  required
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://exemplo.org.br"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ngoArea" className="block text-xs font-semibold text-slate-800">
                  Área principal de atuação *
                </label>
                <select
                  id="ngoArea"
                  value={area}
                  onChange={(e) => setArea(e.target.value as Exclude<NgoHelpArea, 'todas'>)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  {(Object.keys(AREA_LABELS) as Array<Exclude<NgoHelpArea, 'todas'>>).map((k) => (
                    <option key={k} value={k}>
                      {AREA_LABELS[k]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ngoUf" className="block text-xs font-semibold text-slate-800">
                  Estado (UF) ou Nacional
                </label>
                <select
                  id="ngoUf"
                  value={stateUf}
                  onChange={(e) => setStateUf(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  <option value="">Todo o Brasil (Nacional / Online)</option>
                  {UF_OPTIONS.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ngoCity" className="block text-xs font-semibold text-slate-800">
                  Cidade / Região atendida
                </label>
                <input
                  id="ngoCity"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex: Salvador, São Paulo, Abaíra..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ngoCoverage" className="block text-xs font-semibold text-slate-800">
                  Descrição da abrangência
                </label>
                <input
                  id="ngoCoverage"
                  type="text"
                  value={coverage}
                  onChange={(e) => setCoverage(e.target.value)}
                  placeholder="Ex: Todo o Brasil (Online) ou Região Metropolitana"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ngoChannel" className="block text-xs font-semibold text-slate-800">
                  Canal de acesso (WhatsApp, formulário, presencial)
                </label>
                <input
                  id="ngoChannel"
                  type="text"
                  value={accessChannel}
                  onChange={(e) => setAccessChannel(e.target.value)}
                  placeholder="Ex: Formulário online gratuito ou atendimento presencial"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ngoSummary" className="block text-xs font-semibold text-slate-800">
                Resumo do apoio gratuito oferecido às mulheres *
              </label>
              <textarea
                id="ngoSummary"
                rows={3}
                required
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                placeholder="Descreva como a ONG acolhe, orienta ou atende gratuitamente mulheres na prática..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label htmlFor="ngoHowHelp" className="block text-xs font-semibold text-slate-800">
                  Principais frentes de ajuda (uma por linha)
                </label>
                <textarea
                  id="ngoHowHelp"
                  rows={2}
                  value={howHelpText}
                  onChange={(e) => setHowHelpText(e.target.value)}
                  placeholder="Acolhimento psicológico gratuito&#10;Orientação jurídica sobre Lei Maria da Penha"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ngoPrivacy" className="block text-xs font-semibold text-slate-800">
                  Nota de privacidade / endereço de atendimento
                </label>
                <textarea
                  id="ngoPrivacy"
                  rows={2}
                  value={privacyNote}
                  onChange={(e) => setPrivacyNote(e.target.value)}
                  placeholder="Ex: Atendimento sigiloso sem exigir boletim de ocorrência"
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-xs font-semibold text-slate-800">
                Categorias onde esta ONG deve aparecer nas buscas:
              </span>
              <div className="flex flex-wrap gap-2">
                {RELATED_CATEGORY_OPTIONS.map((opt) => {
                  const checked = relatedCategories.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleCategory(opt.id)}
                      className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors ${
                        checked
                          ? 'bg-purple-900 text-white border-purple-900'
                          : 'bg-slate-50 text-slate-700 border-slate-300 hover:border-purple-400'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <label className="flex items-start gap-2.5 text-xs text-slate-800 cursor-pointer bg-purple-50/70 border border-purple-200 rounded-xl p-3.5">
              <input
                type="checkbox"
                checked={isFreeConfirmed}
                onChange={(e) => setIsFreeConfirmed(e.target.checked)}
                className="mt-0.5 rounded border-purple-400 text-purple-700 focus:ring-purple-600"
              />
              <span>
                Confirmo que esta ONG oferece atendimento <strong>100% gratuito e voltado ao público feminino</strong> (sem cobranças, mensalidades ou convênios privados).
              </span>
            </label>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-500">
                Verificação automática anti-duplicidade ativa no cliente e no PostgreSQL.
              </span>
              <button
                type="submit"
                disabled={submitting || Boolean(liveDuplicate)}
                className="min-h-[44px] inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-pink-600 to-purple-700 hover:from-pink-700 hover:to-purple-800 disabled:from-slate-400 disabled:to-slate-400 text-white text-xs font-semibold transition-all shadow-xs"
              >
                {submitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <PlusCircle className="w-4 h-4" />
                )}
                <span>{submitting ? 'Salvando no banco...' : 'Salvar ONG no Banco de Dados'}</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {partnerTab === 'dados_github' && <GitHubIntegrationView />}

    </div>
  );
};

