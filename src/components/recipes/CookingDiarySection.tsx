'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Camera,
  Image as ImageIcon,
  Star,
  Clock,
  Plus,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
  Trash2,
  Pencil,
  Save,
} from 'lucide-react';
import {
  addCookEntryAction,
  deleteDiaryEntryAction,
  updateDiaryEntryAction,
} from '@/app/actions/diary';
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
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [calificacion, setCalificacion] = useState<number>(5);
  const [hoverCalificacion, setHoverCalificacion] = useState<number | null>(null);
  const [tiempoEmpleadoMin, setTiempoEmpleadoMin] = useState<string>('');
  const [notas, setNotas] = useState<string>('');
  const [modificaciones, setModificaciones] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [localEntries, setLocalEntries] = useState<DiarioCocinados[]>(entradas);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Estados de edición in-line de notas existentes
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editNotas, setEditNotas] = useState<string>('');
  const [editModificaciones, setEditModificaciones] = useState<string>('');
  const [isEditingPending, startEditingTransition] = useTransition();

  useEffect(() => {
    setLocalEntries(entradas);
  }, [entradas]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFile = e.target.files?.[0];
    if (!rawFile) {
      setSelectedImageFile(null);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      return;
    }

    e.target.value = '';
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const url = URL.createObjectURL(rawFile);
    setSelectedImageFile(rawFile);
    setPreviewUrl(url);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const formData = new FormData(e.currentTarget);
    formData.set('recetaId', recetaId);
    formData.set('calificacion', calificacion.toString());
    formData.set('tiempoEmpleadoMin', tiempoEmpleadoMin);
    formData.set('notas', notas);
    formData.set('modificaciones', modificaciones);
    if (selectedImageFile) {
      formData.set('foto', selectedImageFile);
    }

    startTransition(async () => {
      const res = await addCookEntryAction(formData);
      if (res.error) {
        setError(res.error);
      } else if (res.success) {
        setPreviewUrl(null);
        setTiempoEmpleadoMin('');
        setNotas('');
        setModificaciones('');
        formRef.current?.reset();
        setIsOpen(false);
        setError(null);
        setSuccess(null);
        router.refresh();
      }
    });
  };

  const handleDeleteEntry = async (entryId: string) => {
    if (!window.confirm('¿Seguro que deseas eliminar esta valoración y sus notas?')) {
      return;
    }

    setDeletingId(entryId);
    setLocalEntries((prev) => prev.filter((item) => item.id !== entryId));

    const res = await deleteDiaryEntryAction(entryId, recetaId);
    setDeletingId(null);

    if (res.error) {
      setError(res.error);
      router.refresh();
    } else {
      router.refresh();
    }
  };

  const handleStartEdit = (entry: DiarioCocinados) => {
    setEditingEntryId(entry.id);
    setEditNotas(entry.notas_cocinero || '');
    setEditModificaciones(entry.modificaciones_realizadas || '');
  };

  const handleCancelEdit = () => {
    setEditingEntryId(null);
    setEditNotas('');
    setEditModificaciones('');
  };

  const handleSaveEdit = (entry: DiarioCocinados) => {
    startEditingTransition(async () => {
      const res = await updateDiaryEntryAction({
        entryId: entry.id,
        recetaId,
        notas: editNotas,
        modificaciones: editModificaciones,
      });

      if (res.success) {
        setLocalEntries((prev) =>
          prev.map((item) =>
            item.id === entry.id
              ? {
                  ...item,
                  notas_cocinero: editNotas.trim() || null,
                  modificaciones_realizadas: editModificaciones.trim() || null,
                }
              : item
          )
        );
        setEditingEntryId(null);
      } else if (res.error) {
        setError(res.error);
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
                <span>Elegir de galería</span>
              </button>
            )}

            {/* Botón de Añadir Nota y Valoración */}
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="min-h-[44px] px-4 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold text-stone-800 bg-[#f4efe6] hover:bg-[#e7dfd5] transition flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <Plus className="w-4 h-4 text-[#a86224]" />
              <span>{isOpen ? 'Cerrar formulario' : 'Añadir valoración / notas'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Formulario Desplegable para Registrar Cocinado */}
      {isOpen && (
        <div className="p-6 sm:p-7 rounded-3xl bg-white border border-[#e7dfd5] shadow-xs animate-fade-in space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-[#f4efe6]">
            <div>
              <h4 className="text-lg font-bold font-serif-recipe text-stone-900">
                Registrar nuevo cocinado
              </h4>
              <p className="text-xs text-stone-500">
                Guarda tu experiencia, tiempo real y ajustes en las notas
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 rounded-full bg-[#f4efe6] text-stone-600 flex items-center justify-center hover:bg-[#e7dfd5] transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            {/* Foto del resultado con capture="environment" y accept="image/*" */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-semibold text-stone-800">
                Fotografía de tu plato (Opcional)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[48px] px-5 py-3 rounded-2xl border border-dashed border-[#d8cbba] hover:border-[#a86224] text-xs sm:text-sm font-medium text-stone-700 bg-[#faf7f2] hover:bg-[#f4efe6] transition flex items-center gap-2.5 cursor-pointer"
                >
                  <Camera className="w-5 h-5 text-[#a86224]" />
                  <span>{previewUrl ? 'Cambiar fotografía' : 'Tomar foto (Cámara trasera) o galería'}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  name="foto"
                  accept="image/*"
                  capture="environment"
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

            {/* Calificación por estrellas */}
            <div className="space-y-2">
              <label className="block text-xs sm:text-sm font-semibold text-stone-800">
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
                    className="p-1 rounded-lg transition hover:scale-110 cursor-pointer focus:outline-none"
                  >
                    <Star
                      className={`w-7 h-7 sm:w-8 sm:h-8 ${
                        (hoverCalificacion !== null ? star <= hoverCalificacion : star <= calificacion)
                          ? 'fill-[#f59e0b] text-[#f59e0b]'
                          : 'text-stone-300'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm font-bold text-stone-700">
                  {calificacion} de 5 estrellas
                </span>
              </div>
            </div>

            {/* Tiempo empleado */}
            <div className="space-y-1.5">
              <label htmlFor="tiempoEmpleadoMin" className="block text-xs sm:text-sm font-semibold text-stone-800">
                Tiempo real empleado (minutos)
              </label>
              <div className="relative max-w-xs">
                <input
                  id="tiempoEmpleadoMin"
                  name="tiempoEmpleadoMin"
                  type="number"
                  min="1"
                  max="720"
                  placeholder="Ej. 35"
                  value={tiempoEmpleadoMin}
                  onChange={(e) => setTiempoEmpleadoMin(e.target.value)}
                  className="w-full min-h-[48px] pl-10 pr-4 py-2.5 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-sm sm:text-base text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:border-[#a86224]"
                />
                <Clock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Notas del cocinero */}
            <div className="space-y-1.5">
              <label htmlFor="notas" className="block text-xs sm:text-sm font-semibold text-stone-800">
                Notas del cocinero / Reseña
              </label>
              <textarea
                id="notas"
                name="notas"
                rows={3}
                placeholder="Ej. Quedó muy jugoso. Para la próxima añadiré un poco más de pimienta..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
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
                value={modificaciones}
                onChange={(e) => setModificaciones(e.target.value)}
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
                <span>Guardar valoración</span>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Historial de valoraciones y preparaciones anteriores de esta receta */}
      {localEntries.length > 0 && (
        <div className="space-y-4 pt-4">
          <h4 className="text-base font-bold font-serif-recipe text-stone-900">
            Historial de valoraciones y preparaciones de esta receta
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {localEntries.map((entry) => {
              const isEditingThis = editingEntryId === entry.id;

              return (
                <div
                  key={entry.id}
                  className="rounded-3xl border border-[#e7dfd5] bg-white overflow-hidden shadow-2xs flex flex-col group relative"
                >
                  {/* Botones de acción en la esquina superior derecha: Editar (Lápiz) y Eliminar (Papelera) */}
                  <div className="absolute top-3.5 right-3.5 z-10 flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => (isEditingThis ? handleCancelEdit() : handleStartEdit(entry))}
                      title={isEditingThis ? 'Cancelar edición' : 'Editar nota y comentarios'}
                      className="w-8 h-8 rounded-xl bg-white/95 hover:bg-[#faf7f2] text-stone-500 hover:text-[#a86224] border border-[#e7dfd5] shadow-2xs backdrop-blur-xs flex items-center justify-center transition cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEntry(entry.id)}
                      disabled={deletingId === entry.id}
                      title="Eliminar valoración"
                      className="w-8 h-8 rounded-xl bg-white/95 hover:bg-red-50 text-stone-400 hover:text-red-600 border border-[#e7dfd5] shadow-2xs backdrop-blur-xs flex items-center justify-center transition cursor-pointer disabled:opacity-50"
                    >
                      {deletingId === entry.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-red-500" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  {entry.foto_resultado_url && (
                    <div className="w-full h-52 relative overflow-hidden culinary-photo bg-[#f4efe6]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={entry.foto_resultado_url}
                        alt="Resultado real de la receta"
                        className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                      />
                    </div>
                  )}

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between pr-20">
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

                      {/* Modo Edición In-Line del Comentario/Nota */}
                      {isEditingThis ? (
                        <div className="space-y-3 pt-2 animate-fade-in">
                          <div>
                            <label className="block text-[11px] font-bold uppercase text-[#a86224] tracking-wider mb-1">
                              Editar nota personal
                            </label>
                            <textarea
                              rows={3}
                              value={editNotas}
                              onChange={(e) => setEditNotas(e.target.value)}
                              placeholder="Actualiza tu comentario sobre la receta..."
                              className="w-full p-3 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5] text-xs sm:text-sm text-stone-900 focus:bg-white focus:outline-none focus:border-[#a86224] resize-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold uppercase text-stone-500 tracking-wider mb-1">
                              Modificaciones realizadas
                            </label>
                            <input
                              type="text"
                              value={editModificaciones}
                              onChange={(e) => setEditModificaciones(e.target.value)}
                              placeholder="Ej: Usé harina de avena en vez de trigo"
                              className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-[#faf7f2] border border-[#e7dfd5] text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-[#a86224]"
                            />
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(entry)}
                              disabled={isEditingPending}
                              className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-[#a86224] hover:bg-[#8e511c] text-white text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition cursor-pointer disabled:opacity-50"
                            >
                              {isEditingPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Save className="w-3.5 h-3.5" />
                              )}
                              <span>Guardar cambios</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              disabled={isEditingPending}
                              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium transition cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
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
                        </>
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
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
