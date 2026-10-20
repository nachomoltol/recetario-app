'use client';

import { useRouter } from 'next/navigation';
import { AlertCircle, Sparkles, ShieldAlert, ArrowRight, X, Calendar } from 'lucide-react';
import { useLanguageStore } from '@/stores/useLanguageStore';

export type HardLimitType = 'FREE_LIMIT_REACHED' | 'DEVICE_LIMIT_REACHED' | 'PRO_LIMIT_REACHED';

interface HardLimitModalProps {
  isOpen: boolean;
  type: HardLimitType | null;
  onClose: () => void;
}

export function HardLimitModal({ isOpen, type, onClose }: HardLimitModalProps) {
  const router = useRouter();
  const language = useLanguageStore((s) => s.language);
  const isEn = language === 'en';

  if (!isOpen || !type) return null;

  const isProLimit = type === 'PRO_LIMIT_REACHED';
  const isDeviceLimit = type === 'DEVICE_LIMIT_REACHED';

  const handleUpgrade = () => {
    onClose();
    router.push('/billing');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-[#faf7f2] border border-[#e7dfd5] rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8 space-y-6 text-stone-900 animate-scale-in">
        {/* Botón Cerrar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-9 h-9 rounded-2xl bg-white hover:bg-stone-200 border border-[#e7dfd5] flex items-center justify-center text-stone-500 hover:text-stone-800 transition"
          title={isEn ? 'Close' : 'Cerrar'}
        >
          <X className="w-4 h-4" />
        </button>

        {/* Icono central de alerta estilizado */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div
            className={`w-14 h-14 rounded-3xl flex items-center justify-center shadow-md ${
              isProLimit
                ? 'bg-[#a86224] text-white'
                : 'bg-gradient-to-br from-amber-500 to-[#a86224] text-white'
            }`}
          >
            {isDeviceLimit ? (
              <ShieldAlert className="w-7 h-7" />
            ) : isProLimit ? (
              <Calendar className="w-7 h-7" />
            ) : (
              <AlertCircle className="w-7 h-7" />
            )}
          </div>

          {/* Badge */}
          <div className="inline-block px-3 py-1 rounded-full bg-[#f4efe6] border border-[#e7dfd5] text-[#a86224] text-[11px] font-bold tracking-wider uppercase">
            {isProLimit
              ? isEn
                ? 'PRO Monthly Quota (150/150)'
                : 'Cuota Mensual PRO (150/150)'
              : isDeviceLimit
                ? isEn
                  ? 'Device Quota Limit (50/50)'
                  : 'Límite de Dispositivo (50/50)'
                : isEn
                  ? 'Monthly Limit Reached (50/50)'
                  : 'Límite Mensual Alcanzado (50/50)'}
          </div>

          {/* Título */}
          <h2 className="text-xl sm:text-2xl font-bold font-serif-recipe text-stone-900 leading-snug">
            {isProLimit
              ? isEn
                ? 'Fair Use Limit Reached'
                : 'Límite mensual PRO alcanzado'
              : isDeviceLimit
                ? isEn
                  ? 'Device Limit Reached'
                  : 'Límite alcanzado en este dispositivo'
                : isEn
                  ? 'Monthly limit reached (50/50)'
                  : 'Límite mensual alcanzado (50/50)'}
          </h2>

          {/* Descripción */}
          <p className="text-xs sm:text-sm text-stone-600 leading-relaxed max-w-md">
            {isProLimit
              ? isEn
                ? 'You have reached the monthly fair-use limit of 150 recipes for your PRO subscription. Your quota will automatically reset on the 1st of next month.'
                : 'Has alcanzado el límite de 150 recetas de tu membresía PRO. Tu cuota se reiniciará automáticamente el día 1 del próximo mes.'
              : isDeviceLimit
                ? isEn
                  ? 'This physical device has reached the monthly quota of 50 free recipes. Quota resets on the 1st of each month, or you can unlock 150 recipes with a PRO membership.'
                  : 'Este dispositivo físico ha alcanzado la cuota de 50 recetas gratuitas del mes. El día 1 se reiniciará tu contador, o puedes desbloquear 150 recetas con una cuenta PRO.'
                : isEn
                  ? 'Monthly limit reached (50/50). Your counter resets on the 1st of next month. Upgrade to PRO to get up to 150 recipes with zero ads or waiting.'
                  : 'Límite mensual alcanzado (50/50). El día 1 se reiniciará tu contador. Mejora a PRO para obtener hasta 150 recetas sin esperas ni anuncios.'}
          </p>
        </div>

        {/* Tarjeta de ventajas PRO (si no es PRO) */}
        {!isProLimit && (
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-[#e7dfd5] shadow-2xs space-y-3 text-left">
            <div className="flex items-center gap-2 text-xs font-bold text-[#a86224]">
              <Sparkles className="w-4 h-4 text-[#a86224]" />
              <span>{isEn ? 'Included in PRO:' : 'Ventajas del Plan PRO:'}</span>
            </div>
            <ul className="text-xs text-stone-700 space-y-1.5 list-disc pl-4">
              <li>{isEn ? '150 recipes every month' : 'Hasta 150 recetas cada mes'}</li>
              <li>{isEn ? 'Zero sponsor wait or interstitial ads' : 'Cero esperas de patrocinador ni anuncios'}</li>
              <li>{isEn ? 'Clinical nutritional adaptation engine' : 'Motor clínico de adaptación de dietas y alérgenos'}</li>
            </ul>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          {!isProLimit ? (
            <>
              <button
                type="button"
                onClick={handleUpgrade}
                className="flex-1 py-3 px-5 rounded-2xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-[#a86224] to-[#c27835] hover:from-[#8e511c] hover:to-[#a86224] transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isEn ? 'Upgrade to PRO' : 'Mejorar a PRO'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="py-3 px-5 rounded-2xl font-semibold text-xs sm:text-sm text-stone-600 hover:text-stone-900 bg-white hover:bg-stone-100 border border-[#e7dfd5] transition-all cursor-pointer text-center"
              >
                {isEn ? 'Wait until 1st' : 'Esperar al día 1'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-3 px-5 rounded-2xl font-bold text-xs sm:text-sm text-white bg-[#a86224] hover:bg-[#8e511c] transition-all shadow-sm active:scale-95 text-center cursor-pointer"
            >
              {isEn ? 'Understood' : 'Entendido'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
