'use client';

import { useState, useEffect, useTransition } from 'react';
import {
  ChefHat,
  BookOpen,
  Calendar,
  Heart,
  Check,
  User,
  Mail,
  Sparkles,
  Award,
  AlertCircle,
  Save,
  Lock,
  ShieldCheck,
  HeartPulse,
  Loader2,
  ChevronDown,
} from 'lucide-react';
import { updateUserProfileAction } from '@/app/actions/userPreferences';
import { useProfileStore } from '@/stores/useProfileStore';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { ProSubscriptionModal } from '@/components/subscription/ProSubscriptionModal';
import {
  OBJETIVOS_CLINICOS,
  PATRONES_ALIMENTARIOS,
} from '@/lib/clinicalDictionary';

interface ChefStats {
  totalRecetas: number;
  totalPlanificadas: number;
  totalCocinados: number;
  totalFavoritas: number;
}

interface ProfileFormProps {
  initialProfile: {
    id: string;
    email: string;
    nombre: string | null;
    nivel_culinario?: string | null;
    preferencias_dieteticas?: string[] | null;
    alergenos?: string[] | null;
    plan_suscripcion?: 'gratis' | 'pro' | null;
    created_at?: string;
  };
  stats: ChefStats;
}

const NIVELES_CULINARIOS = [
  {
    id: 'Principiante',
    label: 'Principiante',
    labelEn: 'Beginner',
    badge: '🌱',
    desc: 'Aprendiendo técnicas básicas, cortes y recetas sencillas paso a paso.',
    descEn: 'Learning basic knife skills, cuts, and simple step-by-step recipes.',
  },
  {
    id: 'Intermedio',
    label: 'Intermedio',
    labelEn: 'Intermediate',
    badge: '🍳',
    desc: 'Manejo cómodo de sofritos, puntos de cocción y combinación de sabores.',
    descEn: 'Comfortable with sautés, cooking temperatures, and balancing flavors.',
  },
  {
    id: 'Avanzado',
    label: 'Avanzado',
    labelEn: 'Advanced',
    badge: '👨‍🍳',
    desc: 'Dominio de técnicas complejas, emulsiones, fondos y creatividad culinaria.',
    descEn: 'Mastery of complex culinary techniques, emulsions, stocks, and plating.',
  },
];

export function ProfileForm({ initialProfile, stats }: ProfileFormProps) {
  const setStoreProfile = useProfileStore((s) => s.setProfile);
  const currentStoreProfile = useProfileStore((s) => s.profile);
  const language = useLanguageStore((s) => s.language);
  const t = useLanguageStore((s) => s.t);

  const [nombre, setNombre] = useState(
    initialProfile.nombre || currentStoreProfile?.nombre || ''
  );
  const [nivelCulinario, setNivelCulinario] = useState(
    initialProfile.nivel_culinario || 'Principiante'
  );

  // Inicialización multiselección de Objetivos Clínicos y Patrón Alimentario desde las preferencias guardadas
  const initialPrefs = initialProfile.preferencias_dieteticas || [];
  const matchedObjetivos = OBJETIVOS_CLINICOS.filter((o) =>
    initialPrefs.some(
      (p) =>
        p.toLowerCase() === o.id.toLowerCase() ||
        p.toLowerCase() === o.label.toLowerCase() ||
        p.toLowerCase() === o.key.toLowerCase()
    )
  ).map((o) => o.id);

  const foundPatron = PATRONES_ALIMENTARIOS.find((pa) =>
    initialPrefs.some(
      (p) =>
        p.toLowerCase() === pa.id.toLowerCase() ||
        p.toLowerCase() === pa.label.toLowerCase() ||
        p.toLowerCase() === pa.key.toLowerCase()
    )
  );

  const [objetivosClinicos, setObjetivosClinicos] = useState<string[]>(
    matchedObjetivos.length > 0 ? matchedObjetivos : ['General']
  );
  const [patronAlimentario, setPatronAlimentario] = useState<string>(
    foundPatron?.id || 'Omnívora'
  );

  const [isVipUpgraded, setIsVipUpgraded] = useState(false);
  const [showProModal, setShowProModal] = useState(false);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);

  const isPro = initialProfile.plan_suscripcion === 'pro' || isVipUpgraded;

  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Redirección directa al checkout de Stripe para el botón PRO
  const handleUpgradeToPro = async () => {
    setIsCheckoutLoading(true);
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
        return;
      }
    } catch (err) {
      console.error('Error al iniciar Checkout de Stripe:', err);
    } finally {
      setIsCheckoutLoading(false);
    }
    // Fallback al modal si la llamada directa no devuelve URL
    setShowProModal(true);
  };

  const handleToggleObjetivo = (optId: string) => {
    setObjetivosClinicos((prev) => {
      if (optId === 'General') {
        return ['General'];
      }

      // Al marcar una patología específica, quitar 'General'
      const withoutGeneral = prev.filter((id) => id !== 'General');

      if (withoutGeneral.includes(optId)) {
        const next = withoutGeneral.filter((id) => id !== optId);
        return next.length > 0 ? next : ['General'];
      } else {
        return [...withoutGeneral, optId];
      }
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMessage(null);

    const preferenciasActualizadas = [...objetivosClinicos, patronAlimentario].filter(Boolean);

    startTransition(async () => {
      const res = await updateUserProfileAction({
        nombre: nombre.trim(),
        nivel_culinario: nivelCulinario,
        preferencias_dieteticas: preferenciasActualizadas,
      });

      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: t('clinical_success_msg'),
        });
        if (currentStoreProfile) {
          setStoreProfile({
            ...currentStoreProfile,
            nombre: nombre.trim(),
            nivel_culinario: nivelCulinario,
            preferencias_dieteticas: preferenciasActualizadas,
          });
        }
        setTimeout(() => setStatusMessage(null), 3500);
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Ocurrió un error al guardar los cambios.',
        });
      }
    });
  };

  const initials = (nombre || initialProfile.email.split('@')[0] || 'CH')
    .slice(0, 2)
    .toUpperCase();

  const formattedDate = initialProfile.created_at
    ? new Date(initialProfile.created_at).toLocaleDateString(
        language === 'en' ? 'en-US' : 'es-ES',
        {
          month: 'long',
          year: 'numeric',
        }
      )
    : '2026';

  const selectedObjectivesList = OBJETIVOS_CLINICOS.filter((o) => objetivosClinicos.includes(o.id));
  const selectedPatternObj = PATRONES_ALIMENTARIOS.find((p) => p.id === patronAlimentario);

  return (
    <>
      <form onSubmit={handleSave} className="space-y-6">
      {/* TARJETA 1: Información básica del Chef */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-5 border-b border-[#e7dfd5] pb-6">
          <div className="w-20 h-20 rounded-3xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-[#a86224] font-bold text-3xl shadow-2xs shrink-0">
            {initials}
          </div>
          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-bold font-serif-recipe text-stone-900 leading-tight">
                {nombre || (language === 'en' ? 'Chef' : 'Chef')}
              </h2>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5]">
                {nivelCulinario}
              </span>
              {isPro && (
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 flex items-center gap-1 shadow-2xs">
                  <Sparkles className="w-3 h-3 text-[#a86224]" /> PRO
                </span>
              )}
            </div>
            <p className="text-xs text-stone-500">
              {t('profile_member_since')} {formattedDate}
            </p>
          </div>
        </div>

        {/* Campos básicos editables */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="chef-nombre"
              className="text-xs font-semibold text-stone-700 flex items-center gap-2"
            >
              <User className="w-3.5 h-3.5 text-[#a86224]" />
              <span>{t('profile_chef_name')}</span>
            </label>
            <input
              id="chef-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder={language === 'en' ? 'Your chef name' : 'Tu nombre en la cocina'}
              className="w-full px-4 py-2.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-sm text-stone-900 focus:outline-none focus:border-[#a86224] focus:ring-1 focus:ring-[#a86224] transition"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-stone-700 flex items-center gap-2">
              <Mail className="w-3.5 h-3.5 text-[#a86224]" />
              <span>{t('profile_email')}</span>
            </label>
            <input
              type="email"
              value={initialProfile.email}
              disabled
              className="w-full px-4 py-2.5 rounded-2xl bg-stone-100 border border-stone-200 text-sm text-stone-500 cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* TARJETA 2: Estadísticas Reales de Chef */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-4">
        <div className="flex items-center gap-2.5">
          <Award className="w-5 h-5 text-[#a86224]" />
          <h3 className="text-lg font-bold font-serif-recipe text-stone-900">
            {t('profile_stats_title')}
          </h3>
        </div>
        <p className="text-xs text-stone-500">{t('profile_stats_desc')}</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          {/* Métrica 1: Recetas Guardadas */}
          <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] flex flex-col justify-between space-y-2">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#e7dfd5] flex items-center justify-center text-[#a86224]">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <span className="text-2xl font-bold font-serif-recipe text-stone-900 block leading-none">
                {stats.totalRecetas}
              </span>
              <span className="text-[11px] font-medium text-stone-500 mt-1 block">
                {t('profile_stat_recipes')}
              </span>
            </div>
          </div>

          {/* Métrica 2: Días planificados */}
          <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] flex flex-col justify-between space-y-2">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#e7dfd5] flex items-center justify-center text-emerald-700">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="text-2xl font-bold font-serif-recipe text-stone-900 block leading-none">
                {stats.totalPlanificadas}
              </span>
              <span className="text-[11px] font-medium text-stone-500 mt-1 block">
                {t('profile_stat_planned')}
              </span>
            </div>
          </div>

          {/* Métrica 3: Platos cocinados */}
          <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] flex flex-col justify-between space-y-2">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#e7dfd5] flex items-center justify-center text-amber-700">
              <ChefHat className="w-4 h-4" />
            </div>
            <div>
              <span className="text-2xl font-bold font-serif-recipe text-stone-900 block leading-none">
                {stats.totalCocinados}
              </span>
              <span className="text-[11px] font-medium text-stone-500 mt-1 block">
                {t('profile_stat_cooked')}
              </span>
            </div>
          </div>

          {/* Métrica 4: Recetas Favoritas */}
          <div className="p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] flex flex-col justify-between space-y-2">
            <div className="w-8 h-8 rounded-xl bg-white border border-[#e7dfd5] flex items-center justify-center text-rose-600">
              <Heart className="w-4 h-4" />
            </div>
            <div>
              <span className="text-2xl font-bold font-serif-recipe text-stone-900 block leading-none">
                {stats.totalFavoritas}
              </span>
              <span className="text-[11px] font-medium text-stone-500 mt-1 block">
                {t('profile_stat_favorites')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* TARJETA 3: Nivel Culinario */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ChefHat className="w-5 h-5 text-[#a86224]" />
            <div>
              <h3 className="text-lg font-bold font-serif-recipe text-stone-900">
                {t('level_title')}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">{t('level_desc')}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {NIVELES_CULINARIOS.map((nivel) => {
            const isSelected = nivelCulinario === nivel.id;
            return (
              <button
                key={nivel.id}
                type="button"
                onClick={() => setNivelCulinario(nivel.id)}
                className={`p-4 rounded-2xl text-left transition border flex flex-col justify-between gap-3 cursor-pointer ${
                  isSelected
                    ? 'bg-[#f4efe6] border-[#a86224] ring-1 ring-[#a86224]/40 shadow-2xs'
                    : 'bg-[#faf7f2] border-[#e7dfd5] hover:border-stone-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{nivel.badge}</span>
                  {isSelected && (
                    <span className="w-5 h-5 rounded-full bg-[#a86224] text-white flex items-center justify-center">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-bold font-serif-recipe text-stone-900">
                    {language === 'en' ? nivel.labelEn : nivel.label}
                  </h4>
                  <p className="text-[11px] text-stone-600 mt-1 leading-snug">
                    {language === 'en' ? nivel.descEn : nivel.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ============================================================== */}
      {/* TARJETA 4: ESCAPARATE PRO - MODELO CLÍNICO & PATRÓN ALIMENTARIO */}
      {/* ============================================================== */}
      <div className="p-6 sm:p-8 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-6">
        <div className="flex items-start justify-between gap-3 border-b border-[#e7dfd5] pb-4">
          <div className="flex items-center gap-2.5">
            <HeartPulse className="w-5 h-5 text-[#a86224]" />
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold font-serif-recipe text-stone-900">
                  {t('clinical_showcase_title')}
                </h3>
                {isPro && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />{' '}
                    {language === 'en' ? 'Firewall Active' : 'Cortafuegos Activo'}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                {t('clinical_showcase_desc')}
              </p>
            </div>
          </div>
        </div>

        {/* CONTENEDOR DE SELECTORES: VISIBLE E INTERACTIVO PARA TODOS (FLUJO FREEMIUM) */}
        <div className="space-y-6">
          {/* SELECTOR 1: OBJETIVOS CLÍNICOS (CHIPS MULTISELECCIÓN) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <span>{t('clinical_objective_label')}</span>
              </label>
              <span className="text-[11px] text-stone-500 font-medium">
                {objetivosClinicos.filter((id) => id !== 'General').length > 0
                  ? `${objetivosClinicos.filter((id) => id !== 'General').length} seleccionados`
                  : t('profile_conditions_count')}
              </span>
            </div>

            {/* Panel de chips multiselección interactivo */}
            <div className="flex flex-wrap gap-2 pt-1">
              {OBJETIVOS_CLINICOS.map((opt) => {
                const isSelected = objetivosClinicos.includes(opt.id);
                const badge =
                  opt.id === 'sin_gluten' ? '🌾' :
                  opt.id === 'sin_lactosa' ? '🥛' :
                  opt.id === 'fodmap' ? '🧅' :
                  opt.id === 'baja_histamina' ? '🧀' :
                  opt.id === 'diabetes' ? '🩸' :
                  opt.id === 'hipertension' ? '❤️' :
                  opt.id === 'hipercolesterolemia' ? '🫀' :
                  opt.id === 'enfermedad_renal' ? '🫘' :
                  opt.id === 'acido_urico_gota' ? '🥩' :
                  opt.id === 'reflujo_gastritis' ? '🍋' :
                  opt.id === 'blanda_gastrointestinal' ? '🥣' :
                  opt.id === 'antiinflamatoria' ? '🌿' : '✨';

                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleToggleObjetivo(opt.id)}
                    className={`min-h-[42px] px-3.5 py-2 rounded-2xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer select-none active:scale-95 ${
                      isSelected
                        ? 'bg-emerald-50 border-2 border-emerald-500 text-emerald-900 shadow-2xs'
                        : 'bg-white hover:bg-[#faf7f2] border border-[#e7dfd5] text-stone-700 hover:border-stone-400 font-medium'
                    }`}
                  >
                    <span className="text-base leading-none">{badge}</span>
                    <span>{language === 'en' ? opt.labelEn : opt.label}</span>
                    {isSelected && (
                      <span className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Descripciones contextuales de los objetivos marcados */}
            {selectedObjectivesList.filter((o) => o.id !== 'General').length > 0 ? (
              <div className="space-y-1.5 pt-1.5 border-t border-[#f4efe6]">
                {selectedObjectivesList
                  .filter((o) => o.id !== 'General')
                  .map((obj) => (
                    <p key={obj.id} className="text-xs text-stone-600 font-light px-1 flex items-start gap-1.5">
                      <span className="font-semibold text-emerald-800 shrink-0">{obj.label}:</span>
                      <span>{language === 'en' ? obj.descEn : obj.desc}</span>
                    </p>
                  ))}
              </div>
            ) : (
              <p className="text-xs text-stone-500 font-light px-1">
                {language === 'en'
                  ? 'No clinical restrictions selected. Tap any condition to activate nutritional firewall.'
                  : 'Sin restricciones clínicas activas. Pulsa sobre cualquier patología para activar su cortafuegos nutricional.'}
              </p>
            )}
          </div>

          {/* SELECTOR 2: PATRÓN ALIMENTARIO */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="select-patron-alimentario"
                className="text-xs font-bold text-stone-800 flex items-center gap-1.5"
              >
                <span>{t('clinical_pattern_label')}</span>
              </label>
              <span className="text-[11px] text-stone-500 font-medium">
                {t('profile_patterns_count')}
              </span>
            </div>

            <div className="relative">
              <select
                id="select-patron-alimentario"
                value={patronAlimentario}
                onChange={(e) => {
                  setPatronAlimentario(e.target.value);
                }}
                className="w-full appearance-none min-h-[46px] px-4 py-2.5 pr-10 rounded-2xl border border-[#e7dfd5] text-stone-900 text-sm font-semibold transition bg-[#faf7f2] focus:outline-none focus:border-[#a86224] focus:ring-1 focus:ring-[#a86224] cursor-pointer hover:border-stone-400"
              >
                {PATRONES_ALIMENTARIOS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {language === 'en' ? opt.labelEn : opt.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-stone-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>

            {selectedPatternObj && (
              <p className="text-xs text-stone-600 font-light px-1">
                {language === 'en' ? selectedPatternObj.descEn : selectedPatternObj.desc}
              </p>
            )}
          </div>
        </div>

        {/* ============================================================== */}
        {/* BLOQUEO FREEMIUM / ESCAPARATE DE CONVERSIÓN PRO                */}
        {/* ============================================================== */}
        {!isPro ? (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-50/95 via-[#fbf9f5] to-amber-100/60 border border-amber-200/90 shadow-sm space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#a86224] text-white flex items-center justify-center shrink-0 shadow-xs">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-stone-900 leading-snug">
                  {t('clinical_locked_title')}
                </h4>
                <p className="text-xs text-stone-700 leading-relaxed font-light">
                  {t('clinical_locked_desc')}
                </p>
              </div>
            </div>

            {/* Botón de Checkout de Stripe PRO */}
            <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="text-[11px] text-stone-500 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#a86224]" />
                <span>{t('profile_unlock_unlimited')}</span>
              </div>

              <button
                type="button"
                onClick={handleUpgradeToPro}
                disabled={isCheckoutLoading}
                className="min-h-[44px] px-6 py-2.5 rounded-2xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-[#a86224] to-[#c27835] hover:from-[#8e511c] hover:to-[#a86224] transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isCheckoutLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t('profile_connecting_stripe')}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-200" />
                    <span>{t('clinical_upgrade_btn')}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* VISTA PRO: Confirmación de Cortafuegos Clínico Activo (Sin exponer ingredientes ni chips) */
          <div className="p-4 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
            <p className="text-xs font-semibold text-emerald-900">
              {language === 'en'
                ? 'Clinical firewall active: AI recipes will strictly exclude pro-inflammatory ingredients and adapt to your health profile.'
                : 'Cortafuegos clínico activo: Nuestro algoritmo adaptará tus recetas excluyendo de forma estricta los ingredientes proinflamatorios según tu salud.'}
            </p>
          </div>
        )}
      </div>

      {/* Mensajes de feedback */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl flex items-center gap-3 text-xs font-semibold animate-fade-in ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Botón de Guardado */}
      <div className="pt-2">
        <button
          type="submit"
          disabled={isPending}
          className="w-full min-h-[50px] py-3.5 px-6 rounded-2xl font-semibold text-sm text-white bg-[#a86224] hover:bg-[#8e511c] transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
        >
          {isPending ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>{t('clinical_saving_btn')}</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>{t('clinical_save_btn')}</span>
            </>
          )}
        </button>
      </div>
    </form>

    {/* Modal flotante de suscripción PRO (Renderizado fuera del <form> principal para erradicar hydration errors de formularios anidados) */}
    <ProSubscriptionModal
      isOpen={showProModal}
      onClose={() => setShowProModal(false)}
      context="feature_locked"
      onVipSuccess={() => {
        setIsVipUpgraded(true);
      }}
    />
  </>
  );
}
