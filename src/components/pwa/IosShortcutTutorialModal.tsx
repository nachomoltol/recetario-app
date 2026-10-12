'use client';

import { useState, useEffect } from 'react';
import {
  Share2,
  ExternalLink,
  Copy,
  Check,
  Sparkles,
  Smartphone,
  X,
  ArrowRight,
  Download,
  Info,
} from 'lucide-react';

interface IosShortcutTutorialModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function IosShortcutTutorialModal({ isOpen, onClose }: IosShortcutTutorialModalProps) {
  const [copied, setCopied] = useState(false);
  const [domain, setDomain] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setDomain(window.location.origin);
    }
  }, []);

  if (!isOpen) return null;

  const shareTargetEndpoint = `${domain || 'https://recetario-app.vercel.app'}/share-target?url=`;

  const handleCopyEndpoint = () => {
    navigator.clipboard.writeText(shareTargetEndpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Enlace oficial de plantilla de Atajo de iOS para Web Share
  // Si el usuario tiene la app Atajos instalada, este esquema o enlace la abre directamente
  const shortcutICloudUrl =
    'https://www.icloud.com/shortcuts/2d3587e9c57c4c778401340156d64d50';

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white border border-[#e7dfd5] shadow-2xl p-6 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto">
        {/* Cabecera con estética Lino / Terracotta */}
        <div className="flex items-start justify-between border-b border-[#f4efe6] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5] flex items-center justify-center shadow-2xs shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold font-serif-recipe text-stone-900 leading-tight">
                  Menú 'Compartir' en iPhone
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5]">
                  iOS Shortcut
                </span>
              </div>
              <p className="text-xs text-stone-500 font-light mt-0.5">
                Envía vídeos de TikTok, Reels o YouTube directamente a la app
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#faf7f2] hover:bg-[#f4efe6] text-stone-500 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Noticia explicativa sobre iOS */}
        <div className="p-3.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-xs text-stone-700 leading-relaxed flex items-start gap-2.5">
          <Info className="w-4 h-4 text-[#a86224] shrink-0 mt-0.5" />
          <div>
            <strong className="text-stone-900 font-semibold block mb-0.5">
              ¿Por qué es necesario en Apple?
            </strong>
            Safari de Apple no permite a las aplicaciones web instalarse de forma nativa en la hoja de compartir.
            Con este <strong>Atajo de iOS</strong> tendrás exactamente la misma experiencia con 1 solo toque.
          </div>
        </div>

        {/* Guía en 3 Pasos */}
        <div className="space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-[#a86224] block">
            Configuración en 30 segundos
          </span>

          {/* Paso 1 */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#e7dfd5] shadow-2xs space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
              <span className="w-5 h-5 rounded-full bg-[#a86224] text-white flex items-center justify-center text-[11px]">
                1
              </span>
              <span>Añade el Atajo a tu iPhone</span>
            </div>
            <p className="text-xs text-stone-600 pl-7 font-light">
              Descarga el atajo preconfigurado <strong>"Guardar en Recetario"</strong> en la app Atajos de Apple:
            </p>
            <div className="pl-7 pt-1">
              <a
                href={shortcutICloudUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#a86224] hover:bg-[#8e511c] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Instalar Atajo en iOS</span>
                <ExternalLink className="w-3 h-3 opacity-80" />
              </a>
            </div>
          </div>

          {/* Paso 2 */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#e7dfd5] shadow-2xs space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
              <span className="w-5 h-5 rounded-full bg-[#a86224] text-white flex items-center justify-center text-[11px]">
                2
              </span>
              <span>Comparte desde TikTok, Reels o YouTube</span>
            </div>
            <p className="text-xs text-stone-600 pl-7 font-light">
              Cuando veas una receta, toca el botón nativo <strong>Compartir</strong> de la red social y selecciona
              <strong> "Guardar en Recetario"</strong> de la lista de acciones.
            </p>
          </div>

          {/* Paso 3 */}
          <div className="p-3.5 rounded-2xl bg-white border border-[#e7dfd5] shadow-2xs space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-stone-900">
              <span className="w-5 h-5 rounded-full bg-[#a86224] text-white flex items-center justify-center text-[11px]">
                3
              </span>
              <span>Extracción Inteligente Automática</span>
            </div>
            <p className="text-xs text-stone-600 pl-7 font-light">
              La app se abrirá automáticamente e iniciará la extracción y deducción de ingredientes con Gemini sin que tengas que pegar nada a mano.
            </p>
          </div>
        </div>

        {/* Sección de configuración manual / URL del webhook */}
        <div className="p-3.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-stone-800">URL del endpoint de captura:</span>
            <button
              type="button"
              onClick={handleCopyEndpoint}
              className="text-[#a86224] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-600" />
                  <span className="text-emerald-700">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copiar URL</span>
                </>
              )}
            </button>
          </div>
          <code className="text-[11px] font-mono text-stone-600 bg-white px-2.5 py-1.5 rounded-xl border border-[#e7dfd5] block truncate select-all">
            {shareTargetEndpoint}
          </code>
        </div>

        {/* Botón de cierre */}
        <button
          type="button"
          onClick={onClose}
          className="w-full min-h-[44px] py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs transition cursor-pointer"
        >
          Entendido, cerrar tutorial
        </button>
      </div>
    </div>
  );
}
