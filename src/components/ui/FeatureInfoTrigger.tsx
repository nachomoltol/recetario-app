'use client';

import React, { useState } from 'react';
import { HelpCircle, X, Sparkles } from 'lucide-react';
import { Drawer } from 'vaul';

export interface FeatureInfoBullet {
  icon?: string;
  label: string;
  text: string;
  badge?: string;
}

export interface FeatureInfoTriggerProps {
  title: string;
  description: string;
  bullets?: FeatureInfoBullet[];
  footerNote?: string;
  align?: 'left' | 'right' | 'center';
  closeLabel?: string;
}

/**
 * Capa Informativa Dual (Fase 2.1):
 * - Escritorio (PC): Tooltip flotante al pasar el cursor (hover) que explica el propósito de la funcionalidad.
 * - Móvil: Botón táctil (?) de 24px que abre un bottom sheet explicativo (Drawer).
 */
export function FeatureInfoTrigger({
  title,
  description,
  bullets = [],
  footerNote,
  align = 'left',
  closeLabel = 'Entendido',
}: FeatureInfoTriggerProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const tooltipAlignClass =
    align === 'right'
      ? 'right-0'
      : align === 'center'
      ? 'left-1/2 -translate-x-1/2'
      : 'left-0';

  return (
    <div className="relative inline-flex items-center group/info shrink-0">
      {/* Botón táctil (?) de exactamente 24px (w-6 h-6) */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDrawerOpen(true);
        }}
        aria-label={title}
        className="w-6 h-6 min-w-[24px] min-h-[24px] rounded-full bg-[#f4efe6] hover:bg-[#a86224] text-[#a86224] hover:text-white border border-[#e7dfd5] hover:border-[#a86224] flex items-center justify-center transition-all cursor-pointer shadow-2xs active:scale-95 focus:outline-none focus:ring-2 focus:ring-[#a86224]/30"
      >
        <HelpCircle className="w-3.5 h-3.5 stroke-[2.2]" />
      </button>

      {/* ============================================================== */}
      {/* ESCRITORIO (PC >= 768px): Tooltip flotante al pasar el cursor   */}
      {/* ============================================================== */}
      <div
        role="tooltip"
        className={`hidden md:block pointer-events-none opacity-0 invisible group-hover/info:opacity-100 group-hover/info:visible group-focus-within/info:opacity-100 group-focus-within/info:visible transition-all duration-200 z-50 absolute top-full mt-2 w-80 sm:w-96 p-4 rounded-2xl bg-stone-900/95 backdrop-blur-md text-white shadow-xl border border-stone-700/80 text-left ${tooltipAlignClass}`}
      >
        <div className="space-y-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <h4 className="text-xs font-bold font-serif-recipe text-amber-100 leading-snug">
              {title}
            </h4>
          </div>
          <p className="text-[11px] text-stone-200 leading-relaxed font-light">
            {description}
          </p>

          {bullets.length > 0 && (
            <ul className="space-y-1.5 pt-1 border-t border-stone-700/70">
              {bullets.map((b, idx) => (
                <li key={idx} className="text-[11px] leading-snug text-stone-300 flex items-start gap-1.5">
                  {b.icon && <span className="shrink-0 mt-0.5">{b.icon}</span>}
                  <div>
                    <span className="font-semibold text-white">{b.label}</span>
                    {b.badge && (
                      <span className="ml-1.5 px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/30 uppercase">
                        {b.badge}
                      </span>
                    )}
                    <span className="text-stone-300">: {b.text}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {footerNote && (
            <p className="text-[10px] text-amber-300/90 font-medium pt-1 border-t border-stone-700/60">
              {footerNote}
            </p>
          )}
        </div>
      </div>

      {/* ============================================================== */}
      {/* MÓVIL Y CLIC TÁCTIL: Bottom Sheet explicativo (Vaul Drawer)     */}
      {/* ============================================================== */}
      <Drawer.Root open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <Drawer.Portal>
          <Drawer.Overlay
            className="fixed inset-0 bg-stone-900/50 backdrop-blur-xs z-50 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          />
          <Drawer.Content
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] bg-[#fbf9f5] rounded-t-[32px] border-t border-[#e7dfd5] shadow-2xl flex flex-col focus:outline-none max-w-lg mx-auto overflow-hidden"
          >
            <div className="w-12 h-1.5 rounded-full bg-stone-300 mx-auto mt-3 mb-1 shrink-0 cursor-grab active:cursor-grabbing" />

            <div className="px-5 py-3.5 border-b border-[#e7dfd5] flex items-center justify-between gap-3 shrink-0 bg-white">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-xl bg-[#f4efe6] border border-[#e7dfd5] text-[#a86224] flex items-center justify-center shrink-0">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <Drawer.Title className="text-base font-bold font-serif-recipe text-stone-900 leading-tight truncate">
                  {title}
                </Drawer.Title>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-[#f4efe6] hover:bg-[#eae1d2] text-stone-600 flex items-center justify-center transition cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-left">
              <Drawer.Description className="text-xs sm:text-sm text-stone-700 leading-relaxed font-light">
                {description}
              </Drawer.Description>

              {bullets.length > 0 && (
                <div className="space-y-2.5">
                  {bullets.map((b, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-white border border-[#e7dfd5] shadow-2xs flex items-start gap-2.5"
                    >
                      {b.icon && <span className="text-base leading-none mt-0.5 shrink-0">{b.icon}</span>}
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-bold font-serif-recipe text-stone-900">
                            {b.label}
                          </span>
                          {b.badge && (
                            <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-amber-100 text-[#a86224] border border-amber-300/80 uppercase">
                              {b.badge}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-stone-600 leading-snug font-light">
                          {b.text}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {footerNote && (
                <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#a86224] shrink-0" />
                  <span className="font-medium leading-snug">{footerNote}</span>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-[#e7dfd5] bg-white">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm text-white bg-[#a86224] hover:bg-[#8e511c] transition cursor-pointer"
              >
                {closeLabel}
              </button>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </div>
  );
}

