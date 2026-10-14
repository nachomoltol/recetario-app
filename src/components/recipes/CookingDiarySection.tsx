'use client';

import { useState, useTransition, useRef } from 'react';
import { Camera, Image as ImageIcon, Star, Clock, Plus, Loader2, CheckCircle2, AlertCircle, X } from 'lucide-react';
import { addCookEntryAction } from '@/app/actions/diary';
import { DiarioCocinados } from '@/types/recipe';

interface CookingDiarySectionProps {
  recetaId: string;
  entradas: DiarioCocinados[];
  onTriggerCamera?: () => void;
  onTriggerGallery?: () => void;
  isUploadingPhoto?: boolean;
}

export function CookingDiarySection({
  recetaId,
  entradas,
  onTriggerCamera,
  onTriggerGallery,
  isUploadingPhoto,
}: CookingDiarySectionProps) {
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
        setSuccess('¡Valoración y notas guardadas para esta receta!');
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
    <section className="space-y-6 pt-8 border-t border-[#e7dfd5]">
      {/* Botones de acción al final de la receta: Fotografía (Cámara / Galería) y Valoración/Notas */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold font-serif-recipe text-stone-900">
              ¿Has cocinado este plato?
            </h3>
            <p className="text-xs sm:text-sm text-stone-500">
              Fotografía tu resultado o añade tus valoraciones y notas personales
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Botón Fotografía con Cámara (capture="environment") */}
            {onTriggerCamera && (
              <button
                type="button"
                onClick={onTriggerCamera}
                disabled={isUploadingPhoto}
                className="min-h-[44px] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-white bg-[#a86224] hover:bg-[#8e511c] shadow-xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isUploadingPhoto ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Subiendo...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4 text-white" />
                    <span>Hacer foto (Cámara)</span>
                  </>
                )}
              </button>
            )}

            {/* Botón Fotografía desde Galería */}
            {onTriggerGallery && (
              <button
                type="button"
                onClick={onTriggerGallery}
                disabled={isUploadingPhoto}
                className="min-h-[44px] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-stone-700 bg-white hover:bg-[#faf7f2] border border-[#e7dfd5] hover:border-[#a86224] shadow-2xs transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ImageIcon className="w-4 h-4 text-[#a86224]" />
                <span>Galería</span>
              </button>
            )}

            {/* Botón Añadir Valoración y Notas */}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="min-h-[44px] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-stone-700 bg-white hover:bg-[#faf7f2] border border-[#e7dfd5] hover:border-[#a86224] transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              {isOpen ? (
                <>
                  <X className="w-4 h-4" />
                  <span>Cerrar notas</span>
                </>
              ) : (
                <>
                  <Star className="w-4 h-4 text-[#f59e0b]" />
                  <span>Valoración y notas</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Formulario de valoración y notas */}
      {isOpen && (
        <div className="p-6 sm:p-8 rounded-3xl border border-[#e7dfd5] bg-white shadow-xs space-y-6 animate-in fade-in duration-200">
          <div className="border-b border-[#e7dfd5] pb-3">
            <h3 className="text-lg font-bold font-serif-recipe text-stone-900">
              Valoración y Notas de la Receta
            </h3>
            <p className="text-xs sm:text-sm text-stone-500">
              Registra tu puntuación, notas de cata y modificaciones para esta receta
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
            {/* Selector de Foto */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-semibold text-stone-800">
                Fotografía del Plato *
              </label>
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[48px] px-5 py-3 rounded-2xl border border-dashed border-[#d8cbba] hover:border-[#a86224] text-xs sm:text-sm font-medium text-stone-700 bg-[#faf7f2] hover:bg-[#f4efe6] transition flex items-center gap-2.5 cursor-pointer"
                >
                  <Camera className="w-5 h-5 text-[#a86224]" />
                  <span>{previewUrl ? 'Cambiar fotografía' : 'Tomar foto o elegir de la galería'}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  name="foto"
                  accept="image/*"
                  capture="environment"
                  required
                  onChange={handleImageChange}
                  className="hidden"
                />
              </div>

              {previewUrl && (
                <div className="mt-4 relative w-56 h-40 rounded-2xl overflow-hidden border border-[#e7dfd5] culinary-photo shadow-2xs">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewUrl}
                    alt="Vista previa del plato"
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
            </div>

            {/* Calificación por estrellas con touch targets grandes */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-semibold text-stone-800">
                Puntuación del Plato
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setCalificacion(star)}
                    onMouseEnter={() => setHoverCalificacion(star)}
                    onMouseLeave={() => setHoverCalificacion(null)}
                    className="min-h-[48px] min-w-[48px] rounded-xl flex items-center justify-center transition cursor-pointer hover:bg-[#f4efe6] active:scale-90"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        (hoverCalificacion !== null ? star <= hoverCalificacion : star <= calificacion)
                          ? 'fill-[#f59e0b] text-[#f59e0b]'
                          : 'text-stone-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="text-xs sm:text-sm text-stone-600 ml-2 font-medium">
                  {calificacion} de 5 estrellas
                </span>
              </div>
            </div>

            {/* Tiempo empleado */}
            <div className="space-y-1.5">
              <label htmlFor="tiempoEmpleadoMin" className="block text-xs sm:text-sm font-semibold text-stone-800">
                Tiempo Total Empleado (minutos)
              </label>
              <input
                id="tiempoEmpleadoMin"
                name="tiempoEmpleadoMin"
                type="number"
                min={1}
                placeholder="Ej. 40"
                className="w-full sm:w-48 min-h-[48px] px-4 py-2.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-sm sm:text-base text-stone-900 focus:bg-white focus:outline-none focus:border-[#a86224]"
              />
            </div>

            {/* Notas de sabor */}
            <div className="space-y-1.5">
              <label htmlFor="notas" className="block text-xs sm:text-sm font-semibold text-stone-800">
                Notas del Cocinero (Sabor, Textura, Puntos a Mejorar)
              </label>
              <textarea
                id="notas"
                name="notas"
                rows={3}
                placeholder="Ej. Quedó muy jugoso. Para la próxima añadiré un poco más de pimienta..."
                className="w-full p-4 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-sm sm:text-base text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-[#a86224] resize-none"
              />
            </div>

            {/* Modificaciones realizadas */}
            <div className="space-y-1.5">
              <label htmlFor="modificaciones" className="block text-xs sm:text-sm font-semibold text-stone-800">
                Modificaciones o Sustituciones Realizadas
              </label>
              <input
                id="modificaciones"
                name="modificaciones"
                type="text"
                placeholder="Ej. Usé harina de avena en vez de trigo."
                className="w-full min-h-[48px] px-4 py-2.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-sm sm:text-base text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-[#a86224]"
              />
            </div>

            {/* Botón de Enviar */}
            <button
              type="submit"
              disabled={isPending}
              className="min-h-[50px] py-3.5 px-6 rounded-2xl font-semibold text-sm sm:text-base text-white bg-[#a86224] hover:bg-[#8e511c] transition flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-white" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <span>Guardar valoración</span>
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Historial de valoraciones y preparaciones anteriores de esta receta */}
      {entradas.length > 0 && (
        <div className="space-y-4 pt-4">
          <h4 className="text-base font-bold font-serif-recipe text-stone-900">
            Historial de valoraciones y preparaciones de esta receta
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {entradas.map((entry) => (
            <div
              key={entry.id}
              className="rounded-3xl border border-[#e7dfd5] bg-white overflow-hidden shadow-2xs flex flex-col group"
            >
              <div className="w-full h-52 relative overflow-hidden culinary-photo bg-[#f4efe6]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={entry.foto_resultado_url}
                  alt="Resultado real de la receta"
                  className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                />
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-4 h-4 ${
                            entry.calificacion && star <= entry.calificacion
                              ? 'fill-[#f59e0b] text-[#f59e0b]'
                              : 'text-stone-300'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-xs text-stone-500 font-medium">
                      {new Date(entry.fecha_cocinado).toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {entry.notas_cocinero && (
                    <p className="text-sm text-stone-800 italic leading-relaxed">
                      &ldquo;{entry.notas_cocinero}&rdquo;
                    </p>
                  )}

                  {entry.modificaciones_realizadas && (
                    <p className="text-xs text-[#a86224]">
                      <span className="font-semibold text-stone-700">Variación:</span>{' '}
                      {entry.modificaciones_realizadas}
                    </p>
                  )}
                </div>

                {entry.tiempo_empleado_min && (
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 pt-2 border-t border-[#f4efe6]">
                    <Clock className="w-3.5 h-3.5 text-[#a86224]" />
                    <span>Tiempo empleado: {entry.tiempo_empleado_min} min</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          </div>
        </div>
      )}
    </section>
  );
}
