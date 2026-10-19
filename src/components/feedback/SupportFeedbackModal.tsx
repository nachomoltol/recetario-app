'use client';

import { useState } from 'react';
import {
  X,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  MessageSquare,
  BadgeCheck,
  LifeBuoy,
} from 'lucide-react';
import { useAuthStore } from '@/stores/useAuthStore';
import { useProfileStore } from '@/stores/useProfileStore';

interface SupportFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type FeedbackCategory =
  | 'Informar de un error'
  | 'Sugerencia'
  | 'Duda técnica'
  | 'Otro';

const CATEGORIES: { label: FeedbackCategory; icon: typeof AlertCircle }[] = [
  { label: 'Informar de un error', icon: AlertCircle },
  { label: 'Sugerencia', icon: Sparkles },
  { label: 'Duda técnica', icon: HelpCircle },
  { label: 'Otro', icon: MessageSquare },
];

export function SupportFeedbackModal({ isOpen, onClose }: SupportFeedbackModalProps) {
  const user = useAuthStore((s) => s.user);
  const profile = useProfileStore((s) => s.profile);

  const [category, setCategory] = useState<FeedbackCategory>('Informar de un error');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const displayName = profile?.nombre || user?.user_metadata?.nombre || user?.email?.split('@')[0] || 'Chef';
  const displayEmail = user?.email || 'usuario@migaapp.com';
  const initials = displayName.slice(0, 2).toUpperCase();

  const charCount = message.length;
  const isMessageValid = charCount >= 5 && charCount <= 500;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMessageValid || isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          category,
          message: message.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || 'No se pudo enviar el mensaje. Inténtalo más tarde.');
      }

      setIsSuccess(true);
      setTimeout(() => {
        handleResetAndClose();
      }, 2200);
    } catch (err: any) {
      setError(err?.message || 'Error de conexión al enviar el mensaje.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetAndClose = () => {
    setMessage('');
    setCategory('Informar de un error');
    setError(null);
    setIsSuccess(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          handleResetAndClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg rounded-3xl bg-white border border-[#e7dfd5] shadow-2xl p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Botón Cerrar (X) */}
        <button
          type="button"
          onClick={handleResetAndClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-2 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-[#faf7f2] transition cursor-pointer disabled:opacity-50"
          aria-label="Cerrar modal"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          /* Vista de Éxito */
          <div className="py-8 text-center space-y-4 animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-xl font-bold font-serif text-stone-900">
                ¡Mensaje recibido!
              </h3>
              <p className="text-sm text-stone-600 max-w-sm mx-auto">
                Muchas gracias por tu reporte. Te responderemos directamente a{' '}
                <strong className="text-stone-800">{displayEmail}</strong> con la mayor rapidez posible.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetAndClose}
              className="mt-4 px-6 py-2.5 rounded-2xl bg-[#a86224] hover:bg-[#8e511c] text-white text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              Entendido
            </button>
          </div>
        ) : (
          /* Formulario Principal de Soporte */
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Cabecera */}
            <div className="space-y-1 pr-8">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-[#f4efe6] text-[#a86224] border border-[#e7dfd5] mb-1">
                <LifeBuoy className="w-3.5 h-3.5" />
                <span>Atención personalizada</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif text-stone-900 leading-tight">
                Soporte y Feedback
              </h2>
              <p className="text-xs sm:text-sm text-stone-600 leading-relaxed font-light">
                ¿Tienes alguna duda, problema o sugerencia? Cuéntanoslo y te ayudaremos con rapidez.
              </p>
            </div>

            {/* Bloque de Usuario (Supabase auth + Badge Verificado) */}
            <div className="p-3.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] flex items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-white border border-[#e7dfd5] text-[#a86224] flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-stone-900 truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-stone-500 truncate" title={displayEmail}>
                    {displayEmail}
                  </p>
                </div>
              </div>

              {/* Badge Visual Verificado */}
              <div className="shrink-0">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Verificado</span>
                </span>
              </div>
            </div>

            {/* Selector de Categoría (Chips interactivos) */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                Tipo de consulta
              </label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map(({ label, icon: Icon }) => {
                  const isSelected = category === label;
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => setCategory(label)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-2xl text-xs sm:text-sm font-medium transition cursor-pointer border text-left ${
                        isSelected
                          ? 'bg-[#a86224] text-white border-[#a86224] shadow-xs font-semibold'
                          : 'bg-white text-stone-700 border-[#e7dfd5] hover:bg-[#faf7f2] hover:border-stone-300'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-[#a86224]'}`} />
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Área de Texto con Contador de Caracteres */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="feedback-message" className="block text-xs font-semibold text-stone-700 uppercase tracking-wider">
                  Mensaje detallado
                </label>
                <span
                  className={`text-[11px] font-medium ${
                    charCount > 500
                      ? 'text-rose-600 font-bold'
                      : charCount >= 5
                      ? 'text-stone-500'
                      : 'text-amber-600'
                  }`}
                >
                  {charCount} / 500
                </span>
              </div>

              <textarea
                id="feedback-message"
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={500}
                placeholder="Explica detalladamente qué ha ocurrido, qué dudas tienes o qué sugerencia quieres compartir para mejorar Miga..."
                className="w-full px-3.5 py-3 rounded-2xl border border-[#e7dfd5] bg-white text-stone-900 text-xs sm:text-sm placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#a86224]/30 focus:border-[#a86224] transition resize-none leading-relaxed"
                disabled={isSubmitting}
              />

              {charCount > 0 && charCount < 5 && (
                <p className="text-[11px] text-amber-600 font-medium">
                  Por favor, escribe al menos 5 caracteres para que podamos entender tu consulta.
                </p>
              )}
            </div>

            {/* Mensaje de Error si ocurre */}
            {error && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                <span className="leading-tight">{error}</span>
              </div>
            )}

            {/* Botones de Acción */}
            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleResetAndClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-2xl border border-[#e7dfd5] bg-[#faf7f2] hover:bg-[#f4efe6] text-stone-700 text-xs sm:text-sm font-semibold transition cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={!isMessageValid || isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-[#a86224] hover:bg-[#8e511c] text-white text-xs sm:text-sm font-semibold transition cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Enviando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Mensaje</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
