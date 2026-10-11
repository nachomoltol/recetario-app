'use client';

import { useState, useTransition, useRef } from 'react';
import { Camera, Star, Clock, Plus, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { addCookEntryAction } from '@/app/actions/diary';
import { DiarioCocinados } from '@/types/recipe';

interface CookingDiarySectionProps {
  recetaId: string;
  entradas: DiarioCocinados[];
}

export function CookingDiarySection({ recetaId, entradas }: CookingDiarySectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [calificacion, setCalificacion] = useState<number>(5);
  const [hoverCalificacion, setHoverCalificacion] = useState<number | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    formData.set('recetaId', recetaId);
    formData.set('calificacion', calificacion.toString());

    startTransition(async () => {
      const res = await addCookEntryAction(formData);
      if (res.error) {
        setError(res.error);
      } else if (res.success) {
        setSuccess('¡Fotografía y notas guardadas en tu diario culinario!');
        setPreviewUrl(null);
        formRef.current?.reset();
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(null);
        }, 1500);
      }
    });
  };

  return (
    <section className="space-y-6 pt-8 border-t border-stone-800/60">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[11px] uppercase tracking-widest text-amber-500 font-semibold block">
            Registro Empírico Culinario
          </span>
          <h2 className="text-2xl font-bold font-serif-recipe text-stone-100">
            Diario de Cocinados ({entradas.length})
          </h2>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium text-stone-950 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-md shadow-amber-500/10 transition cursor-pointer"
        >
          {isOpen ? (
            <>
              <X className="w-4 h-4" />
              <span>Cerrar Formulario</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              <span>Añadir Mi Cocinado</span>
            </>
          )}
        </button>
      </div>

      {/* Formulario de subida desplegable */}
      {isOpen && (
        <div className="p-6 rounded-2xl border border-stone-800 bg-stone-900/30 backdrop-blur-sm space-y-5 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-stone-800/60 pb-3">
            <h3 className="text-base font-semibold font-serif-recipe text-stone-200">
              Registrar Resultado Real
            </h3>
            <span className="text-xs text-stone-400">Sube una foto y documenta tus notas de cata</span>
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
            {/* Selector de Foto */}
            <div className="space-y-2">
              <label className="block text-xs font-medium text-stone-300">
                Fotografía del Plato Real *
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl border border-dashed border-stone-700 hover:border-amber-500/50 text-xs text-stone-300 hover:text-white transition flex items-center gap-2 cursor-pointer bg-charcoal-950"
                >
                  <Camera className="w-4 h-4 text-amber-400" />
                  <span>{previewUrl ? 'Cambiar fotografía' : 'Seleccionar foto desde galería o cámara'}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  name="foto"
                  accept="image/*"
                  required
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              {previewUrl && (
                <div className="mt-3 relative w-48 h-36 rounded-xl overflow-hidden border border-stone-700 culinary-photo">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Vista previa del plato"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            {/* Calificación por estrellas */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-stone-300">
                Puntuación del Plato
              </label>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setCalificacion(star)}
                    onMouseEnter={() => setHoverCalificacion(star)}
                    onMouseLeave={() => setHoverCalificacion(null)}
                    className="p-1 transition cursor-pointer"
                  >
                    <Star
                      className={`w-6 h-6 ${
                        (hoverCalificacion !== null ? star <= hoverCalificacion : star <= calificacion)
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-stone-600'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs text-stone-400 ml-2 font-medium">
                  {calificacion} de 5 estrellas
                </span>
              </div>
            </div>

            {/* Tiempo empleado */}
            <div className="space-y-1.5">
              <label htmlFor="tiempoEmpleadoMin" className="block text-xs font-medium text-stone-300">
                Tiempo Total Empleado (minutos)
              </label>
              <input
                id="tiempoEmpleadoMin"
                name="tiempoEmpleadoMin"
                type="number"
                min={1}
                placeholder="Ej. 45"
                className="w-full sm:w-48 px-3 py-2 rounded-xl bg-charcoal-950 border border-stone-700 text-sm text-stone-200 focus:outline-none focus:border-amber-500/80"
              />
            </div>

            {/* Notas de sabor */}
            <div className="space-y-1.5">
              <label htmlFor="notas" className="block text-xs font-medium text-stone-300">
                Notas del Cocinero (Sabor, Textura, Puntos a Mejorar)
              </label>
              <textarea
                id="notas"
                name="notas"
                rows={3}
                placeholder="Ej. La textura quedó cremosa y el punto de sal fue exacto. La próxima vez bajaré 3 minutos el horno..."
                className="w-full p-3 rounded-xl bg-charcoal-950 border border-stone-700 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/80 resize-none"
              />
            </div>

            {/* Modificaciones realizadas */}
            <div className="space-y-1.5">
              <label htmlFor="modificaciones" className="block text-xs font-medium text-stone-300">
                Modificaciones o Sustituciones Realizadas
              </label>
              <input
                id="modificaciones"
                name="modificaciones"
                type="text"
                placeholder="Ej. Sustituí la mantequilla por aceite de oliva virgen extra."
                className="w-full px-3 py-2 rounded-xl bg-charcoal-950 border border-stone-700 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-amber-500/80"
              />
            </div>

            {/* Botón de Enviar */}
            <button
              type="submit"
              disabled={isPending}
              className="py-2.5 px-5 rounded-xl font-medium text-xs text-stone-950 bg-amber-400 hover:bg-amber-300 transition flex items-center justify-center gap-2 shadow-md cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Subiendo fotografía y guardando entrada...</span>
                </>
              ) : (
                <>
                  <span>Guardar en Mi Diario</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Galería de cocinados existentes */}
      {entradas.length === 0 ? (
        <div className="p-8 text-center rounded-2xl border border-dashed border-stone-800 text-xs text-stone-500">
          Aún no has cocinado este plato. ¡Prepáralo, toma una foto real y sé el primero en evaluarlo!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {entradas.map((entry) => (
            <div
              key={entry.id}
              className="rounded-2xl border border-stone-800/80 bg-stone-900/30 overflow-hidden shadow-lg flex flex-col sm:flex-row group"
            >
              <div className="sm:w-48 h-48 relative overflow-hidden culinary-photo shrink-0 bg-stone-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.foto_resultado_url}
                  alt="Resultado real de la receta"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>

              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-3.5 h-3.5 ${
                            entry.calificacion && star <= entry.calificacion
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-stone-700'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-[11px] text-stone-500 font-mono">
                      {new Date(entry.fecha_cocinado).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {entry.notas_cocinero && (
                    <p className="text-xs text-stone-300 italic leading-relaxed">
                      &ldquo;{entry.notas_cocinero}&rdquo;
                    </p>
                  )}

                  {entry.modificaciones_realizadas && (
                    <p className="text-[11px] text-amber-300/80">
                      <span className="font-medium text-stone-400">Variación:</span>{' '}
                      {entry.modificaciones_realizadas}
                    </p>
                  )}
                </div>

                {entry.tiempo_empleado_min && (
                  <div className="flex items-center gap-1.5 text-[11px] text-stone-500 pt-2 border-t border-stone-800/40">
                    <Clock className="w-3 h-3 text-amber-500/80" />
                    <span>Tiempo real: {entry.tiempo_empleado_min} min</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
