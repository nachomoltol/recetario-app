'use client';

import { useState, useEffect, useTransition } from 'react';
import { Users, Sparkles, Check, Minus, Plus, Flame, ShieldCheck } from 'lucide-react';
import { updateCookingSettingsAction } from '@/app/actions/userPreferences';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { useProfileStore } from '@/stores/useProfileStore';

interface CookingSettingsFormProps {
  initialServings: number;
}

export function CookingSettingsForm({ initialServings }: CookingSettingsFormProps) {
  const t = useLanguageStore((s) => s.t);
  const [servings, setServings] = useState(initialServings || 2);
  const [wakeLockEnabled, setWakeLockEnabled] = useState(true);
  const [wakeLockSupported, setWakeLockSupported] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Inicializar estado de wake lock desde localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedWakeLock = localStorage.getItem('recetario_wake_lock_enabled');
      if (storedWakeLock !== null) {
        setWakeLockEnabled(storedWakeLock === 'true');
      }
      setWakeLockSupported('wakeLock' in navigator);

      const storedServings = localStorage.getItem('recetario_default_servings');
      if (storedServings && !initialServings) {
        const val = parseInt(storedServings, 10);
        if (!isNaN(val) && val >= 1 && val <= 12) {
          setServings(val);
        }
      }
    }
  }, [initialServings]);

  const handleServingsChange = (newVal: number) => {
    const clamped = Math.max(1, Math.min(12, newVal));
    setServings(clamped);
    setSaveStatus('saving');

    if (typeof window !== 'undefined') {
      localStorage.setItem('recetario_default_servings', String(clamped));
    }

    startTransition(async () => {
      const res = await updateCookingSettingsAction({ raciones_defecto: clamped });
      if (res.success) {
        const currentProfile = useProfileStore.getState().profile;
        if (currentProfile) {
          useProfileStore.getState().setProfile({ ...currentProfile, raciones_defecto: clamped });
        }
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus('idle'), 2500);
      } else {
        setSaveStatus('idle');
      }
    });
  };

  const handleToggleWakeLock = () => {
    const nextVal = !wakeLockEnabled;
    setWakeLockEnabled(nextVal);
    if (typeof window !== 'undefined') {
      localStorage.setItem('recetario_wake_lock_enabled', String(nextVal));
    }
  };

  return (
    <div className="space-y-6">
      {/* TARJETA 1: Raciones por defecto */}
      <div className="p-6 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-[#a86224] shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold font-serif-recipe text-stone-900">
                {t('settings_servings_title')}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                {t('settings_servings_desc')}
              </p>
            </div>
          </div>

          {saveStatus === 'saved' && (
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 animate-fade-in flex items-center gap-1 shrink-0">
              <Check className="w-3 h-3" /> {t('settings_saved')}
            </span>
          )}
          {saveStatus === 'saving' && (
            <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 animate-pulse shrink-0">
              {t('settings_saving')}
            </span>
          )}
        </div>

        {/* Contador incremental centralizado y compacto sin botoneras predefinidas */}
        <div className="flex items-center justify-center p-3.5 sm:p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5]">
          <div className="inline-flex items-center gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => handleServingsChange(servings - 1)}
              disabled={servings <= 1 || isPending}
              className="w-10 h-10 rounded-xl bg-white border border-[#e7dfd5] hover:border-[#a86224] hover:bg-[#f4efe6] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-stone-700 transition cursor-pointer shadow-2xs shrink-0"
              aria-label="Disminuir raciones"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="min-w-[90px] text-center">
              <span className="text-2xl font-bold font-serif-recipe text-stone-900 block leading-tight">
                {servings}
              </span>
              <span className="text-xs text-stone-500 font-medium block">
                {servings === 1 ? t('settings_serving_singular') : t('settings_serving_plural')}
              </span>
            </div>

            <button
              type="button"
              onClick={() => handleServingsChange(servings + 1)}
              disabled={servings >= 12 || isPending}
              className="w-10 h-10 rounded-xl bg-white border border-[#e7dfd5] hover:border-[#a86224] hover:bg-[#f4efe6] disabled:opacity-40 disabled:pointer-events-none flex items-center justify-center text-stone-700 transition cursor-pointer shadow-2xs shrink-0"
              aria-label="Aumentar raciones"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* TARJETA 2: Modo Manos en la Masa (Wake Lock) */}
      <div className="p-6 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#f4efe6] border border-[#e7dfd5] flex items-center justify-center text-[#a86224] shrink-0">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold font-serif-recipe text-stone-900">
                  {t('settings_wakelock_title')}
                </h3>
                {wakeLockEnabled && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    {t('settings_wakelock_active')}
                  </span>
                )}
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                {t('settings_wakelock_subtitle')}
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={wakeLockEnabled}
            onClick={handleToggleWakeLock}
            className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#a86224] focus:ring-offset-2 ${
              wakeLockEnabled ? 'bg-[#a86224]' : 'bg-stone-300'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                wakeLockEnabled ? 'translate-x-6' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <p className="text-xs text-stone-600 leading-relaxed">
          {t('settings_wakelock_desc')}
        </p>

        {wakeLockSupported ? (
          <div className="flex items-center gap-2 text-[11px] text-stone-500 bg-[#faf7f2] px-3.5 py-2 rounded-xl border border-[#e7dfd5]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{t('settings_wakelock_supported')}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-[11px] text-stone-500 bg-[#faf7f2] px-3.5 py-2 rounded-xl border border-[#e7dfd5]">
            <span>{t('settings_wakelock_unsupported')}</span>
          </div>
        )}
      </div>
    </div>
  );
}
