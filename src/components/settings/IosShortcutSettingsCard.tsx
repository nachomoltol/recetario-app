'use client';

import { useState } from 'react';
import { Smartphone, Share2, ExternalLink, HelpCircle } from 'lucide-react';
import { IosShortcutTutorialModal } from '@/components/pwa/IosShortcutTutorialModal';

export function IosShortcutSettingsCard() {
  const [showTutorial, setShowTutorial] = useState(false);

  return (
    <>
      <div className="p-5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-0.5">
            <span className="text-sm font-semibold text-stone-900 flex items-center gap-2">
              <Share2 className="w-4 h-4 text-[#a86224]" /> Integración con Menú 'Compartir'
            </span>
            <p className="text-xs text-stone-500">
              Envía enlaces directamente desde TikTok, Instagram o YouTube sin copiar ni pegar
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
            PWA Activa
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-xs">
          <div className="p-3 rounded-xl bg-white border border-[#e7dfd5] space-y-1">
            <div className="flex items-center justify-between">
              <strong className="text-stone-800 font-semibold">Android (WebAPK)</strong>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                W3C Nativo
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              Aparece de forma nativa en la hoja de compartir del sistema al instalar la PWA.
            </p>
          </div>

          <div className="p-3 rounded-xl bg-white border border-[#e7dfd5] space-y-2">
            <div className="flex items-center justify-between">
              <strong className="text-stone-800 font-semibold flex items-center gap-1">
                <span>iOS (iPhone / iPad)</span>
              </strong>
              <span className="text-[10px] font-bold text-[#a86224] bg-[#f4efe6] px-2 py-0.5 rounded-full border border-[#e7dfd5]">
                Vía Atajo
              </span>
            </div>
            <p className="text-[11px] text-stone-500">
              Apple no soporta share_target en Safari. Requiere un Atajo de iOS.
            </p>
            <button
              type="button"
              onClick={() => setShowTutorial(true)}
              className="w-full py-1.5 px-2.5 rounded-lg bg-[#f4efe6] hover:bg-[#ebdcc9] text-[#a86224] font-semibold text-[11px] flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Configurar Atajo de iPhone</span>
            </button>
          </div>
        </div>
      </div>

      <IosShortcutTutorialModal
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
      />
    </>
  );
}
