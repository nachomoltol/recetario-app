'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Pencil,
  Save,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChefHat,
  Clock,
  Users,
  Camera,
} from 'lucide-react';
import { Receta, RecetaIngrediente, Paso, DiarioCocinados } from '@/types/recipe';
import { RecipeWakeLock } from './RecipeWakeLock';
import { RecipeRatingHeader } from './RecipeRatingHeader';
import { RecipeAdaptationSection } from './RecipeAdaptationSection';
import { AdaptacionCulinaria } from '@/app/actions/adaptRecipeAction';
import { FormattedText } from '@/components/ui/FormattedText';
import { RecipeNutritionAccordion } from './RecipeNutritionAccordion';
import { RecipeInteractiveSections } from './RecipeInteractiveSections';
import { CookingDiarySection } from './CookingDiarySection';
import { updateRecipeAction, updateRecipePhotoAction } from '@/app/actions/recipeUpdate';
import { saveRecipeAdaptationAction, revertRecipeAdaptationAction } from '@/app/actions/saveRecipeAdaptationAction';
import { replaceIngredientInText } from '@/lib/culinary/textReplacer';
import { createClient } from '@/lib/supabase/client';
import { compressImageClient } from '@/lib/utils/imageCompress';

interface EditableIngredient {
  id: string;
  nombre_limpio: string;
  cantidad: number;
  unidad: string;
  orden: number;
  notas?: string | null;
  pasillo_supermercado?: string;
}

interface RecipeDetailViewProps {
  receta: Receta;
  ingredientes: RecetaIngrediente[];
  pasos: Paso[];
  userProfile: any;
  userRacionesDefecto?: number;
  recipeDataForAdapt: any;
  diarioEntries: DiarioCocinados[];
}

export function RecipeDetailView({
  receta,
  ingredientes,
  pasos,
  userProfile,
  userRacionesDefecto,
  recipeDataForAdapt,
  diarioEntries,
}: RecipeDetailViewProps) {
  const router = useRouter();

  // Estados de visualización y edición
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Estados de datos
  const [currentTitulo, setCurrentTitulo] = useState(receta.titulo);
  const [editTitulo, setEditTitulo] = useState(receta.titulo);

  const [currentIngredientes, setCurrentIngredientes] = useState<RecetaIngrediente[]>(ingredientes);
  const [currentPasos, setCurrentPasos] = useState<Paso[]>(pasos);
  const [editIngredientes, setEditIngredientes] = useState<EditableIngredient[]>([]);

  // Estado de adaptación in-line a perfil: detecta persistencia previa en Supabase tras F5
  const [isAdapted, setIsAdapted] = useState(Boolean(receta.receta_original));
  const [adaptationSummary, setAdaptationSummary] = useState<string | null>(
    receta.receta_original ? 'Receta adaptada y sincronizada con tu perfil' : null
  );

  // Estados de fotografía
  const [currentFotoUrl, setCurrentFotoUrl] = useState<string | null>(
    receta.foto_url || receta.imagen_portada_url || null
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Notificación toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Temporizador para ocultar el toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => {
      setToast(null);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast]);

  // Guardar última receta vista para el acceso directo en Inicio
  useEffect(() => {
    if (typeof window !== 'undefined' && receta?.id) {
      try {
        localStorage.setItem('ultima_receta_vista_id', receta.id);
      } catch {}
    }
  }, [receta?.id]);

  // Sincronizar estado local con props cuando la receta es actualizada desde servidor
  useEffect(() => {
    setCurrentTitulo(receta.titulo);
    setCurrentIngredientes(ingredientes);
    setCurrentPasos(pasos);
    setIsAdapted(Boolean(receta.receta_original));
    if (receta.receta_original) {
      setAdaptationSummary('Receta adaptada y sincronizada con tu perfil');
    }
  }, [receta.id, receta.updated_at, receta.receta_original]);

  const handleApplyAdaptation = async (data: AdaptacionCulinaria) => {
    const adaptedIngs: RecetaIngrediente[] = data.ingredientes.map((ai, index) => {
      const orig = ingredientes[index];
      const cleanNombre = ai.nombre_limpio.replace(/<\/?mark>/gi, '').trim();
      return {
        id: orig?.id || `adapted-ing-${index}`,
        receta_id: receta.id,
        ingrediente_maestro_id: orig?.ingrediente_maestro_id || null,
        nombre_crudo: cleanNombre,
        nombre_limpio: cleanNombre,
        cantidad: ai.cantidad,
        unidad: ai.unidad,
        gramos_calculados: orig?.gramos_calculados || 0,
        pasillo_supermercado: ai.pasillo_supermercado || orig?.pasillo_supermercado || 'Despensa y Especias',
        notas: ai.notas || orig?.notas || null,
        es_opcional: orig?.es_opcional || false,
        orden: index + 1,
        created_at: orig?.created_at || new Date().toISOString(),
      };
    });

    const adaptedP: Paso[] = data.pasos.map((ap, index) => {
      const orig = pasos[index];
      return {
        id: orig?.id || `adapted-paso-${index}`,
        receta_id: receta.id,
        orden: ap.orden || index + 1,
        instruccion: ap.instruccion,
        tiempo_estimado_min:
          ap.tiempo_estimado_min !== undefined ? ap.tiempo_estimado_min : orig?.tiempo_estimado_min || null,
        temperatura_celsius:
          ap.temperatura_celsius !== undefined ? ap.temperatura_celsius : orig?.temperatura_celsius || null,
        utensilios_sugeridos: orig?.utensilios_sugeridos || [],
        consejo_pro: ap.consejo_pro !== undefined ? ap.consejo_pro : orig?.consejo_pro || null,
        imagen_paso_url: orig?.imagen_paso_url || null,
        created_at: orig?.created_at || new Date().toISOString(),
      };
    });

    if (data.titulo) {
      setCurrentTitulo(data.titulo);
    }
    setCurrentIngredientes(adaptedIngs);
    setCurrentPasos(adaptedP);
    setIsAdapted(true);
    setAdaptationSummary(data.resumen_adaptacion);

    // Persistir adaptación en Supabase (sobrescribe JSON con respaldo en receta_original)
    try {
      const res = await saveRecipeAdaptationAction({
        recetaId: receta.id,
        titulo: data.titulo || currentTitulo,
        descripcion: data.resumen_adaptacion || receta.descripcion,
        ingredientes: adaptedIngs.map((i, idx) => ({
          id: i.id,
          nombre_limpio: i.nombre_limpio,
          nombre_crudo: i.nombre_crudo,
          cantidad: i.cantidad,
          unidad: i.unidad,
          gramos_calculados: i.gramos_calculados,
          pasillo_supermercado: i.pasillo_supermercado,
          notas: i.notas,
          orden: idx + 1,
        })),
        pasos: adaptedP.map((p, idx) => ({
          id: p.id,
          orden: p.orden || idx + 1,
          instruccion: p.instruccion,
          tiempo_estimado_min: p.tiempo_estimado_min,
          temperatura_celsius: p.temperatura_celsius,
          consejo_pro: p.consejo_pro,
        })),
      });

      if (res.success) {
        setToast({ message: 'Adaptación guardada en tu recetario', type: 'success' });
      } else if (res.error) {
        setToast({ message: res.error, type: 'error' });
      }
    } catch (e) {
      console.error('Error guardando adaptación en Supabase:', e);
      setToast({ message: 'Error persistiendo la adaptación en la base de datos', type: 'error' });
    }
  };

  const handleRevertAdaptation = async () => {
    try {
      const res = await revertRecipeAdaptationAction(receta.id);
      if (res.success && res.originalData) {
        setCurrentTitulo(res.originalData.titulo);
        setCurrentIngredientes(res.originalData.ingredientes);
        setCurrentPasos(res.originalData.pasos);
        setIsAdapted(false);
        setAdaptationSummary(null);
        setToast({ message: 'Receta restaurada a su versión original', type: 'success' });
      } else {
        // Fallback a los props originales
        setCurrentTitulo(receta.titulo);
        setCurrentIngredientes(ingredientes);
        setCurrentPasos(pasos);
        setIsAdapted(false);
        setAdaptationSummary(null);
        if (res.error) {
          setToast({ message: res.error, type: 'error' });
        }
      }
    } catch (e) {
      console.error('Error al revertir receta en Supabase:', e);
      setCurrentTitulo(receta.titulo);
      setCurrentIngredientes(ingredientes);
      setCurrentPasos(pasos);
      setIsAdapted(false);
      setAdaptationSummary(null);
    }
  };

  // Persistir sustitución de un ingrediente y actualizar pasos reactivos en Supabase
  const handleSubstitutePersist = async (oldName: string, newName: string | null) => {
    const cleanOldName = oldName.replace(/<\/?[^>]+(>|$)/g, '').trim().toLowerCase();
    const cleanNewName = newName ? newName.replace(/<\/?[^>]+(>|$)/g, '').trim() : null;

    const updatedIngs = currentIngredientes.map((ing) => {
      const ingName = (ing.nombre_limpio || ing.nombre_crudo).replace(/<\/?[^>]+(>|$)/g, '').trim().toLowerCase();
      if (ingName === cleanOldName) {
        if (!cleanNewName) {
          return {
            ...ing,
            nombre_limpio: (ing.nombre_crudo || ing.nombre_limpio).replace(/<\/?[^>]+(>|$)/g, '').trim(),
            notas: null,
          };
        } else {
          return {
            ...ing,
            nombre_limpio: cleanNewName,
            notas: `Sustituido por ${cleanNewName}`,
          };
        }
      }
      return ing;
    });

    const updatedPasos = currentPasos.map((paso) => {
      if (!cleanNewName) {
        const targetIng = currentIngredientes.find(
          (i) => (i.nombre_limpio || i.nombre_crudo).replace(/<\/?[^>]+(>|$)/g, '').trim().toLowerCase() === cleanOldName
        );
        const revertTo = targetIng?.nombre_crudo?.replace(/<\/?[^>]+(>|$)/g, '').trim();
        if (revertTo && revertTo.toLowerCase() !== cleanOldName) {
          return {
            ...paso,
            instruccion: replaceIngredientInText(paso.instruccion, oldName, revertTo),
            consejo_pro: paso.consejo_pro ? replaceIngredientInText(paso.consejo_pro, oldName, revertTo) : null,
          };
        }
        return paso;
      }
      return {
        ...paso,
        instruccion: replaceIngredientInText(paso.instruccion, oldName, cleanNewName),
        consejo_pro: paso.consejo_pro ? replaceIngredientInText(paso.consejo_pro, oldName, cleanNewName) : null,
      };
    });

    try {
      const res = await saveRecipeAdaptationAction({
        recetaId: receta.id,
        titulo: currentTitulo,
        ingredientes: updatedIngs.map((i, idx) => ({
          id: i.id,
          nombre_limpio: i.nombre_limpio,
          nombre_crudo: i.nombre_crudo,
          cantidad: i.cantidad,
          unidad: i.unidad,
          gramos_calculados: i.gramos_calculados,
          pasillo_supermercado: i.pasillo_supermercado,
          notas: i.notas,
          orden: idx + 1,
        })),
        pasos: updatedPasos.map((p, idx) => ({
          id: p.id,
          orden: p.orden || idx + 1,
          instruccion: p.instruccion,
          tiempo_estimado_min: p.tiempo_estimado_min,
          temperatura_celsius: p.temperatura_celsius,
          consejo_pro: p.consejo_pro,
        })),
      });

      if (res.success) {
        setCurrentIngredientes(updatedIngs);
        setCurrentPasos(updatedPasos);
        setIsAdapted(true);
        setToast({
          message: newName ? `Sustitución guardada: ${newName}` : 'Ingrediente restaurado y guardado',
          type: 'success',
        });
      }
    } catch (e) {
      console.error('Error persistiendo sustitución en Supabase:', e);
    }
  };

  // Captura y subida de fotografía del plato
  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);

    try {
      // 1. Comprimir/redimensionar en cliente
      const compressedBlob = await compressImageClient(file, 1600, 1600, 0.82);

      // 2. Obtener usuario actual para nombre único (userId-timestamp.jpg)
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const userId = user?.id || 'usuario';
      const timestamp = Date.now();
      const fileName = `${userId}-${timestamp}.jpg`;
      const filePath = `${fileName}`;

      // 3. Subir imagen usando supabase.storage.from('recetas_fotos').upload(path, file)
      const { error: uploadError } = await supabase.storage
        .from('recetas_fotos')
        .upload(filePath, compressedBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error('Error subiendo imagen a recetas_fotos:', uploadError);
        setToast({ message: `Error al subir la imagen: ${uploadError.message}`, type: 'error' });
        setIsUploadingPhoto(false);
        return;
      }

      // 4. Obtener URL pública con getPublicUrl()
      const {
        data: { publicUrl },
      } = supabase.storage.from('recetas_fotos').getPublicUrl(filePath);

      // 5. Guardar URL en recetas.foto_url
      const resUpdate = await updateRecipePhotoAction({
        recetaId: receta.id,
        fotoUrl: publicUrl,
      });

      if (resUpdate.error) {
        setToast({ message: resUpdate.error, type: 'error' });
        setIsUploadingPhoto(false);
        return;
      }

      // 6. Actualizar vista local, coronar la receta y mostrar toast
      setCurrentFotoUrl(publicUrl);
      setToast({ message: 'Fotografía guardada con éxito', type: 'success' });
      router.refresh();
    } catch (err) {
      console.error('Error al procesar la fotografía:', err);
      setToast({ message: 'Error inesperado al procesar la fotografía', type: 'error' });
    } finally {
      setIsUploadingPhoto(false);
      if (cameraInputRef.current) {
        cameraInputRef.current.value = '';
      }
      if (galleryInputRef.current) {
        galleryInputRef.current.value = '';
      }
    }
  };

  // Iniciar modo edición
  const handleStartEdit = () => {
    setEditTitulo(currentTitulo);
    setEditIngredientes(
      currentIngredientes.map((i, idx) => ({
        id: i.id || `temp-${idx}`,
        nombre_limpio: i.nombre_limpio || i.nombre_crudo || '',
        cantidad: typeof i.cantidad === 'number' ? i.cantidad : parseFloat(String(i.cantidad)) || 1,
        unidad: i.unidad || 'unidad',
        orden: i.orden || idx + 1,
        notas: i.notas,
        pasillo_supermercado: i.pasillo_supermercado,
      }))
    );
    setIsEditing(true);
  };

  // Cancelar modo edición
  const handleCancelEdit = () => {
    setEditTitulo(currentTitulo);
    setIsEditing(false);
  };

  // Manejar cambio en un ingrediente
  const handleIngredientChange = (
    index: number,
    field: 'nombre_limpio' | 'cantidad' | 'unidad',
    value: string | number
  ) => {
    setEditIngredientes((prev) => {
      const next = [...prev];
      next[index] = {
        ...next[index],
        [field]: value,
      };
      return next;
    });
  };

  // Añadir un nuevo ingrediente
  const handleAddIngredient = () => {
    setEditIngredientes((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        nombre_limpio: '',
        cantidad: 1,
        unidad: 'unidad',
        orden: prev.length + 1,
      },
    ]);
  };

  // Eliminar un ingrediente
  const handleRemoveIngredient = (index: number) => {
    setEditIngredientes((prev) => prev.filter((_, idx) => idx !== index));
  };

  // Guardar cambios en el backend (Supabase)
  const handleSaveEdit = async () => {
    const cleanTitle = editTitulo.trim();
    if (!cleanTitle) {
      setToast({ message: 'El título no puede estar vacío', type: 'error' });
      return;
    }

    if (editIngredientes.length === 0) {
      setToast({ message: 'La receta debe tener al menos un ingrediente', type: 'error' });
      return;
    }

    setIsSaving(true);

    try {
      const res = await updateRecipeAction({
        recetaId: receta.id,
        titulo: cleanTitle,
        ingredientes: editIngredientes.map((ing, idx) => ({
          id: ing.id.startsWith('temp-') || ing.id.startsWith('new-') ? undefined : ing.id,
          nombre_limpio: ing.nombre_limpio.trim() || `Ingrediente ${idx + 1}`,
          cantidad: Number(ing.cantidad) > 0 ? Number(ing.cantidad) : 1,
          unidad: ing.unidad.trim() || 'unidad',
          orden: idx + 1,
          notas: ing.notas || null,
          pasillo_supermercado: ing.pasillo_supermercado,
        })),
      });

      setIsSaving(false);

      if (res.error) {
        setToast({ message: res.error, type: 'error' });
        return;
      }

      // Éxito: actualizar estados locales y salir del modo edición
      setCurrentTitulo(cleanTitle);

      const updatedLocalIngredientes: RecetaIngrediente[] = editIngredientes.map((ing, idx) => ({
        id: ing.id,
        receta_id: receta.id,
        nombre_crudo: ing.nombre_limpio.trim() || `Ingrediente ${idx + 1}`,
        nombre_limpio: ing.nombre_limpio.trim() || `Ingrediente ${idx + 1}`,
        cantidad: Number(ing.cantidad) > 0 ? Number(ing.cantidad) : 1,
        unidad: ing.unidad.trim() || 'unidad',
        orden: idx + 1,
        gramos_calculados: 0,
        ingrediente_maestro_id: null,
        pasillo_supermercado: ing.pasillo_supermercado || 'Despensa y Especias',
        notas: ing.notas || null,
        es_opcional: false,
        created_at: new Date().toISOString(),
      }));

      setCurrentIngredientes(updatedLocalIngredientes);
      setIsEditing(false);
      setToast({ message: 'Receta actualizada correctamente', type: 'success' });

      // Sincronizar Server Component en segundo plano
      router.refresh();
    } catch (err) {
      console.error('Error al guardar la edición de la receta:', err);
      setIsSaving(false);
      setToast({ message: 'Error de conexión al guardar los cambios', type: 'error' });
    }
  };

  return (
    <>
      {/* Toast Flotante de Notificación */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`fixed bottom-6 right-6 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 transition-all duration-300 animate-in slide-in-from-bottom border ${
            toast.type === 'success'
              ? 'bg-stone-900 text-white border-emerald-500/40'
              : 'bg-rose-900 text-white border-rose-500/40'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="text-xs sm:text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Inputs de archivo invisibles para cámara y galería */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handlePhotoCapture}
        className="hidden"
        id="recipe-photo-camera-input"
      />
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoCapture}
        className="hidden"
        id="recipe-photo-gallery-input"
      />

      {/* FOTOGRAFÍA CORONANDO LA RECETA (solo si existe foto_url) */}
      {currentFotoUrl && (
        <div className="relative w-full h-64 sm:h-80 md:h-[420px] rounded-3xl overflow-hidden border border-[#e7dfd5] shadow-sm group bg-[#f4efe6]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={currentFotoUrl}
            alt={currentTitulo}
            className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
          <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="min-h-[44px] px-4 py-2.5 rounded-2xl bg-white/95 hover:bg-white text-stone-900 text-xs sm:text-sm font-semibold flex items-center gap-2 shadow-lg backdrop-blur-md transition cursor-pointer disabled:opacity-50"
            >
              {isUploadingPhoto ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#a86224]" />
                  <span>Subiendo y procesando imagen...</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 text-[#a86224]" />
                  <span>Cambiar fotografía</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Cabecera Editorial Limpia */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-[#a86224]">
            <ChefHat className="w-4 h-4" />
            <span>Ficha Culinaria Estandarizada</span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Botón de Modo Edición */}
            {isEditing ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="min-h-[40px] px-3.5 py-1.5 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Cancelar</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="min-h-[40px] px-4 py-1.5 rounded-2xl bg-[#a86224] hover:bg-[#8e511c] text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar cambios</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartEdit}
                className="min-h-[40px] px-3.5 py-1.5 rounded-2xl bg-white hover:bg-[#faf7f2] border border-[#e7dfd5] hover:border-[#a86224] text-xs font-semibold text-stone-700 hover:text-[#a86224] transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-[#a86224]" />
                <span>Editar receta</span>
              </button>
            )}

            {/* Modo Manos en la Masa: Wake Lock para que no se apague la pantalla */}
            <RecipeWakeLock />

            {/* Sistema de Valoración y Favoritos Interactivo */}
            <RecipeRatingHeader
              recetaId={receta.id}
              initialFavorite={receta.es_favorita || false}
              initialRating={receta.puntuacion || 0}
            />
          </div>
        </div>

        {/* Título: Editable en modo edición o Título editorial H1 */}
        {isEditing ? (
          <div className="space-y-1.5 pt-1 animate-fade-in">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#a86224]">
              Título del plato
            </label>
            <input
              type="text"
              value={editTitulo}
              onChange={(e) => setEditTitulo(e.target.value)}
              disabled={isSaving}
              placeholder="Nombre de la receta..."
              className="w-full p-3.5 sm:p-4 rounded-2xl bg-white border-2 border-[#a86224] text-stone-900 font-serif-recipe font-bold text-2xl sm:text-4xl focus:outline-none focus:ring-4 focus:ring-[#a86224]/20 shadow-xs transition"
            />
          </div>
        ) : (
          <h1 className="text-3xl sm:text-5xl font-bold font-serif-recipe tracking-tight text-stone-900 leading-tight">
            {currentTitulo}
          </h1>
        )}

        {receta.descripcion && (
          <p className="text-base sm:text-lg text-stone-700 font-light leading-relaxed max-w-2xl">
            {receta.descripcion}
          </p>
        )}

        {/* Motor de Adaptación Culinaria In-Line (Capa Clínica y de Nivel) */}
        <RecipeAdaptationSection
          recipe={{
            ...recipeDataForAdapt,
            titulo: currentTitulo,
            ingredientes: currentIngredientes.map((i) => ({
              nombre_limpio: i.nombre_limpio,
              cantidad: i.cantidad,
              unidad: i.unidad,
              pasillo_supermercado: i.pasillo_supermercado,
            })),
          }}
          userProfile={userProfile}
          isAdapted={isAdapted}
          adaptationSummary={adaptationSummary}
          onApplyAdaptation={handleApplyAdaptation}
          onRevertAdaptation={handleRevertAdaptation}
        />

        {/* Tiempos y Rendimiento en Modo Cocina: Siempre en una sola línea horizontal */}
        <div className="pt-5 flex flex-row items-center justify-start gap-8 sm:gap-12 text-xs sm:text-sm text-stone-600 border-t border-[#e7dfd5]">
          <div className="flex items-center gap-2.5 shrink-0">
            <Clock className="w-5 h-5 text-[#a86224] shrink-0" />
            <div>
              <span className="text-[10px] uppercase text-stone-500 font-medium block leading-none">
                Tiempo Total
              </span>
              <span className="text-base font-bold text-stone-900 mt-0.5 block whitespace-nowrap">
                {receta.tiempo_total_min || 15} min
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Users className="w-5 h-5 text-[#a86224] shrink-0" />
            <div>
              <span className="text-[10px] uppercase text-stone-500 font-medium block leading-none">
                Base Receta
              </span>
              <span className="text-base font-bold text-stone-900 mt-0.5 block whitespace-nowrap">
                {receta.porciones} porciones
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Pestaña / Acordeón Plegable Compacto de Valores Nutricionales */}
      <RecipeNutritionAccordion
        calorias={receta.calorias_por_porcion}
        proteinas={receta.proteinas_por_porcion}
        carbohidratos={receta.carbohidratos_por_porcion}
        grasas={receta.grasas_por_porcion}
        fibra={receta.fibra_por_porcion}
      />

      {/* PANEL DE EDICIÓN DE INGREDIENTES EN MODO EDICIÓN */}
      {isEditing ? (
        <section className="rounded-3xl bg-white border-2 border-[#a86224] p-5 sm:p-7 shadow-sm space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e7dfd5] pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif-recipe text-stone-900">
                Editar Ingredientes
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Corrige las cantidades o nombres manuscritos capturados por la IA
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddIngredient}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-xl bg-[#f4efe6] hover:bg-[#e7dfd5] text-[#a86224] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir ingrediente</span>
            </button>
          </div>

          <div className="space-y-3">
            {editIngredientes.map((item, idx) => (
              <div
                key={item.id || idx}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 p-3 rounded-2xl bg-[#faf7f2] border border-[#e7dfd5]"
              >
                <div className="flex items-center gap-2 flex-1">
                  <span className="w-7 h-7 rounded-xl bg-white border border-[#e7dfd5] text-stone-400 font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <input
                    type="text"
                    value={item.nombre_limpio}
                    onChange={(e) => handleIngredientChange(idx, 'nombre_limpio', e.target.value)}
                    placeholder="Nombre del ingrediente (ej. Tomate triturado)"
                    disabled={isSaving}
                    className="flex-1 min-h-[42px] px-3.5 rounded-xl bg-white border border-[#e7dfd5] text-xs sm:text-sm text-stone-900 font-medium focus:outline-none focus:border-[#a86224] focus:ring-1 focus:ring-[#a86224] shadow-2xs"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <div className="w-24 sm:w-28">
                    <input
                      type="number"
                      step="any"
                      min="0.01"
                      value={item.cantidad}
                      onChange={(e) =>
                        handleIngredientChange(idx, 'cantidad', parseFloat(e.target.value) || 0)
                      }
                      placeholder="Cantidad"
                      disabled={isSaving}
                      className="w-full min-h-[42px] px-3 rounded-xl bg-white border border-[#e7dfd5] text-xs sm:text-sm text-stone-900 font-mono font-medium focus:outline-none focus:border-[#a86224] focus:ring-1 focus:ring-[#a86224] shadow-2xs"
                    />
                  </div>

                  <div className="w-24 sm:w-28">
                    <input
                      type="text"
                      value={item.unidad}
                      onChange={(e) => handleIngredientChange(idx, 'unidad', e.target.value)}
                      placeholder="Unidad (g, ml...)"
                      disabled={isSaving}
                      className="w-full min-h-[42px] px-3 rounded-xl bg-white border border-[#e7dfd5] text-xs sm:text-sm text-stone-900 font-medium focus:outline-none focus:border-[#a86224] focus:ring-1 focus:ring-[#a86224] shadow-2xs"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(idx)}
                    disabled={isSaving || editIngredientes.length <= 1}
                    title="Eliminar ingrediente"
                    className="w-9 h-9 rounded-xl text-stone-400 hover:text-rose-600 hover:bg-rose-50 flex items-center justify-center transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#e7dfd5]">
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={isSaving}
              className="min-h-[44px] px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs sm:text-sm font-semibold transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveEdit}
              disabled={isSaving}
              className="min-h-[44px] px-6 rounded-xl bg-[#a86224] hover:bg-[#8e511c] text-white text-xs sm:text-sm font-bold transition cursor-pointer flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Guardar cambios</span>
                </>
              )}
            </button>
          </div>
        </section>
      ) : (
        /* Acordeones Plegables con Escalado Inteligente y Modo Compra */
        <RecipeInteractiveSections
          recetaId={receta.id}
          tituloReceta={currentTitulo}
          basePorciones={receta.porciones || 2}
          tiempoCoccionMin={receta.tiempo_coccion_min}
          ingredientes={currentIngredientes}
          pasos={currentPasos}
          defaultServings={userRacionesDefecto}
          onSubstitutePersist={handleSubstitutePersist}
          isAdapted={isAdapted}
        />
      )}

      {/* Sección: Fotografía del plato, valoración y notas de la receta */}
      <CookingDiarySection
        recetaId={receta.id}
        entradas={diarioEntries}
        onTriggerCamera={() => cameraInputRef.current?.click()}
        onTriggerGallery={() => galleryInputRef.current?.click()}
        isUploadingPhoto={isUploadingPhoto}
      />
    </>
  );
}
