'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
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
import { MomentoDia, RolPlato } from '@/types/database';
import { RecipeWakeLock } from './RecipeWakeLock';
import { RecipeRatingHeader } from './RecipeRatingHeader';
const RecipeCategorizeDrawer = dynamic(
  () => import('./RecipeCategorizeDrawer').then((m) => m.RecipeCategorizeDrawer),
  { ssr: false }
);
import { RecipeClassificationRow } from './RecipeClassificationRow';
import { updateRecipeClassificationAction } from '@/app/actions/recipeClassification';
const RecipeAdaptationSection = dynamic(
  () => import('./RecipeAdaptationSection').then((m) => m.RecipeAdaptationSection),
  { ssr: false }
);
import { AdaptacionCulinaria } from '@/app/actions/adaptRecipeAction';
import { FormattedText } from '@/components/ui/FormattedText';
import { RecipeNutritionAccordion } from './RecipeNutritionAccordion';
import { RecipeInteractiveSections } from './RecipeInteractiveSections';
import { CookingDiarySection } from './CookingDiarySection';
const PhotoCropModal = dynamic(
  () => import('./PhotoCropModal').then((m) => m.PhotoCropModal),
  { ssr: false }
);
import { updateRecipeAction, updateRecipePhotoAction } from '@/app/actions/recipeUpdate';
import { saveRecipeAdaptationAction, revertRecipeAdaptationAction } from '@/app/actions/saveRecipeAdaptationAction';
import { replaceIngredientInText } from '@/lib/culinary/textReplacer';
import { createClient } from '@/lib/supabase/client';
import { compressImageClient } from '@/lib/utils/imageCompress';
import { useLanguageStore } from '@/stores/useLanguageStore';
import { cleanIngredientName } from '@/lib/nutrition/formatQuantity';
import { SubstituteOption } from '@/app/actions/suggestSubstitute';
import { normalizeSubstituteQuantityAndUnit } from '@/lib/culinary/scaler';

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
  recipeDataForAdapt: any;
  diarioEntries: DiarioCocinados[];
  initialServings?: number;
  isNewRecipe?: boolean;
}

export function RecipeDetailView({
  receta,
  ingredientes,
  pasos,
  userProfile,
  recipeDataForAdapt,
  diarioEntries,
  initialServings,
  isNewRecipe,
}: RecipeDetailViewProps) {
  const router = useRouter();
  const t = useLanguageStore((s) => s.t);
  const language = useLanguageStore((s) => s.language);

  // Estados de visualización y edición
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Estados de datos
  const [currentTitulo, setCurrentTitulo] = useState(receta?.titulo || 'Receta');
  const [editTitulo, setEditTitulo] = useState(receta?.titulo || 'Receta');

  const [currentIngredientes, setCurrentIngredientes] = useState<RecetaIngrediente[]>(ingredientes || []);
  const [currentPasos, setCurrentPasos] = useState<Paso[]>(pasos || []);
  const [editIngredientes, setEditIngredientes] = useState<EditableIngredient[]>([]);

  // Estado de adaptación in-line a perfil: detecta persistencia previa en Supabase tras F5
  const [isAdapted, setIsAdapted] = useState(Boolean(receta?.receta_original));
  const [adaptationSummary, setAdaptationSummary] = useState<string | null>(
    receta?.receta_original ? 'Receta adaptada y sincronizada con tu perfil' : null
  );

  // Estados de fotografía
  const [currentFotoUrl, setCurrentFotoUrl] = useState<string | null>(
    receta?.foto_url || receta?.imagen_portada_url || null
  );
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Notificación toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Estados de categorización de menú y momentos del día
  const [currentMomentosDia, setCurrentMomentosDia] = useState<MomentoDia[]>(
    () => ((receta?.momentos_dia as MomentoDia[]) || [])
  );
  const [currentRolPlato, setCurrentRolPlato] = useState<RolPlato>(
    () => ((receta?.rol_plato as RolPlato) || 'completo')
  );
  const [currentEsFavoritoMenu, setCurrentEsFavoritoMenu] = useState<boolean>(
    () => Boolean(receta?.es_favorito_menu)
  );
  const [isCategorizeDrawerOpen, setIsCategorizeDrawerOpen] = useState(() => {
    if (typeof window !== 'undefined') {
      const recetaId = receta?.id;
      // 1. Si ya se descartó o guardó en esta sesión, bajo ningún concepto volver a abrir
      if (recetaId) {
        try {
          if (sessionStorage.getItem(`categorize_dismissed_${recetaId}`) === 'true') {
            return false;
          }
        } catch {}
      }

      let shouldAutoOpen = Boolean(isNewRecipe);
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('isNew') === 'true') {
        shouldAutoOpen = true;
      }
      try {
        if (recetaId && localStorage.getItem('receta_recien_creada_id') === recetaId) {
          shouldAutoOpen = true;
        }
      } catch {}

      if (shouldAutoOpen) {
        // Bloquear inmediatamente para que ningún re-render/revalidación futuro pueda volver a abrirlo
        if (recetaId) {
          try {
            sessionStorage.setItem(`categorize_dismissed_${recetaId}`, 'true');
            localStorage.removeItem('receta_recien_creada_id');
          } catch {}
        }
        try {
          if (urlParams.has('isNew')) {
            urlParams.delete('isNew');
            const searchStr = urlParams.toString();
            const cleanUrl = window.location.pathname + (searchStr ? `?${searchStr}` : '') + window.location.hash;
            window.history.replaceState({}, '', cleanUrl);
          }
        } catch {}
        return true;
      }
    }
    return false;
  });

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
    setCurrentTitulo(receta?.titulo || 'Receta');
    setCurrentIngredientes(ingredientes || []);
    setCurrentPasos(pasos || []);
    setIsAdapted(Boolean(receta?.receta_original));
    if (receta?.receta_original) {
      setAdaptationSummary('Receta adaptada y sincronizada con tu perfil');
    }
    setCurrentMomentosDia((receta?.momentos_dia as MomentoDia[]) || []);
    setCurrentRolPlato((receta?.rol_plato as RolPlato) || 'completo');
    setCurrentEsFavoritoMenu(Boolean(receta?.es_favorito_menu));
  }, [
    receta?.id,
    receta?.updated_at,
    receta?.receta_original,
    receta?.momentos_dia,
    receta?.rol_plato,
    receta?.es_favorito_menu,
  ]);

  // Limpieza estricta de estado para evitar re-aperturas del drawer de categorización
  const markCategorizationDismissed = useCallback(() => {
    if (typeof window === 'undefined') return;
    const recetaId = receta?.id;
    if (recetaId) {
      try {
        sessionStorage.setItem(`categorize_dismissed_${recetaId}`, 'true');
        localStorage.removeItem('receta_recien_creada_id');
      } catch {}
    }
    try {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.has('isNew')) {
        urlParams.delete('isNew');
        const searchStr = urlParams.toString();
        const cleanUrl = window.location.pathname + (searchStr ? `?${searchStr}` : '') + window.location.hash;
        window.history.replaceState({}, '', cleanUrl);
      }
    } catch {}
  }, [receta?.id]);

  const handleOpenChangeCategorizeDrawer = useCallback((open: boolean) => {
    setIsCategorizeDrawerOpen(open);
    if (!open) {
      markCategorizationDismissed();
    }
  }, [markCategorizationDismissed]);

  const handleSaveClassification = async (data: {
    momentos_dia: MomentoDia[];
    rol_plato: RolPlato;
    es_favorito_menu: boolean;
  }) => {
    // 1. Cierre inmediato y descarte garantizado
    setIsCategorizeDrawerOpen(false);
    markCategorizationDismissed();

    const prevMomentos = currentMomentosDia;
    const prevRol = currentRolPlato;
    const prevFav = currentEsFavoritoMenu;

    // Actualización optimista inmediata
    setCurrentMomentosDia(data.momentos_dia);
    setCurrentRolPlato(data.rol_plato);
    setCurrentEsFavoritoMenu(data.es_favorito_menu);

    try {
      if (!receta?.id) return;
      const res = await updateRecipeClassificationAction({
        recetaId: receta.id,
        momentos_dia: data.momentos_dia,
        rol_plato: data.rol_plato,
        es_favorito_menu: data.es_favorito_menu,
      });

      if (res.success) {
        setToast({ message: t('categorize_saved_toast'), type: 'success' });
        router.refresh();
      } else {
        // Revertir ante error
        setCurrentMomentosDia(prevMomentos);
        setCurrentRolPlato(prevRol);
        setCurrentEsFavoritoMenu(prevFav);
        setToast({ message: res.error || 'Error al guardar la clasificación', type: 'error' });
      }
    } catch (e) {
      console.error('Error al guardar clasificación:', e);
      setCurrentMomentosDia(prevMomentos);
      setCurrentRolPlato(prevRol);
      setCurrentEsFavoritoMenu(prevFav);
      setToast({ message: 'Error de conexión al guardar clasificación', type: 'error' });
    }
  };

  const handleApplyAdaptation = async (data: AdaptacionCulinaria) => {
    const adaptedIngs: RecetaIngrediente[] = (data?.ingredientes || []).map((ai, index) => {
      const orig = (ingredientes || [])[index];
      const sanitizedAiNombre = cleanIngredientName(ai?.nombre_limpio || '');
      const cleanNombre = sanitizedAiNombre.replace(/<\/?mark>/gi, '').trim() || 'Ingrediente';
      return {
        id: orig?.id || `adapted-ing-${index}`,
        receta_id: receta?.id || '',
        ingrediente_maestro_id: orig?.ingrediente_maestro_id || null,
        nombre_crudo: cleanNombre,
        nombre_limpio: cleanNombre,
        cantidad: Number(ai?.cantidad) || 1,
        unidad: ai?.unidad || orig?.unidad || 'unidad',
        gramos_calculados: orig?.gramos_calculados || 0,
        pasillo_supermercado: ai?.pasillo_supermercado || orig?.pasillo_supermercado || 'Despensa y Especias',
        notas: ai?.notas || orig?.notas || null,
        es_opcional: orig?.es_opcional || false,
        orden: index + 1,
        rol_culinario: ai?.rol_culinario || orig?.rol_culinario || null,
        created_at: orig?.created_at || new Date().toISOString(),
      };
    });

    const adaptedP: Paso[] = (data?.pasos || []).map((ap, index) => {
      const orig = (pasos || [])[index];
      return {
        id: orig?.id || `adapted-paso-${index}`,
        receta_id: receta?.id || '',
        orden: ap?.orden || index + 1,
        instruccion: ap?.instruccion || '',
        instruccion_principiante:
          ap?.instruccion_principiante !== undefined
            ? ap.instruccion_principiante
            : orig?.instruccion_principiante || null,
        instruccion_avanzada:
          ap?.instruccion_avanzada !== undefined
            ? ap.instruccion_avanzada
            : orig?.instruccion_avanzada || null,
        descriptor_sensorial:
          ap?.descriptor_sensorial !== undefined
            ? ap.descriptor_sensorial
            : orig?.descriptor_sensorial || null,
        potencia_fuego:
          ap?.potencia_fuego !== undefined
            ? ap.potencia_fuego
            : orig?.potencia_fuego || null,
        tiempo_estimado_min:
          ap?.tiempo_estimado_min !== undefined ? ap.tiempo_estimado_min : orig?.tiempo_estimado_min || null,
        temperatura_celsius:
          ap?.temperatura_celsius !== undefined ? ap.temperatura_celsius : orig?.temperatura_celsius || null,
        utensilios_sugeridos: orig?.utensilios_sugeridos || [],
        consejo_pro: ap?.consejo_pro !== undefined ? ap.consejo_pro : orig?.consejo_pro || null,
        imagen_paso_url: orig?.imagen_paso_url || null,
        created_at: orig?.created_at || new Date().toISOString(),
      };
    });

    if (data?.titulo) {
      setCurrentTitulo(data.titulo);
    }
    setCurrentIngredientes(adaptedIngs);
    setCurrentPasos(adaptedP);
    setIsAdapted(true);
    setAdaptationSummary(data?.resumen_adaptacion || null);

    // Persistir adaptación en Supabase (sobrescribe JSON con respaldo en receta_original)
    try {
      if (receta?.id) {
        const res = await saveRecipeAdaptationAction({
          recetaId: receta.id,
          titulo: data?.titulo || currentTitulo,
          descripcion: data?.resumen_adaptacion || receta?.descripcion,
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
            rol_culinario: (i as any).rol_culinario || null,
          })),
          pasos: adaptedP.map((p, idx) => ({
            id: p.id,
            orden: p.orden || idx + 1,
            instruccion: p.instruccion,
            instruccion_principiante: p.instruccion_principiante || null,
            instruccion_avanzada: p.instruccion_avanzada || null,
            descriptor_sensorial: p.descriptor_sensorial || null,
            potencia_fuego: p.potencia_fuego || null,
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
      }
    } catch (e) {
      console.error('Error guardando adaptación en Supabase:', e);
      setToast({ message: 'Error persistiendo la adaptación en la base de datos', type: 'error' });
    }
  };

  const handleRevertAdaptation = async () => {
    try {
      if (receta?.id) {
        const res = await revertRecipeAdaptationAction(receta.id);
        if (res.success && res.originalData) {
          setCurrentTitulo(res.originalData.titulo);
          setCurrentIngredientes(res.originalData.ingredientes);
          setCurrentPasos(res.originalData.pasos);
          setIsAdapted(false);
          setAdaptationSummary(null);
          setToast({ message: 'Receta restaurada a su versión original', type: 'success' });
          return;
        }
      }
      // Fallback a los props originales
      setCurrentTitulo(receta?.titulo || 'Receta');
      setCurrentIngredientes(ingredientes || []);
      setCurrentPasos(pasos || []);
      setIsAdapted(false);
      setAdaptationSummary(null);
    } catch (e) {
      console.error('Error al revertir receta en Supabase:', e);
      setCurrentTitulo(receta?.titulo || 'Receta');
      setCurrentIngredientes(ingredientes || []);
      setCurrentPasos(pasos || []);
      setIsAdapted(false);
      setAdaptationSummary(null);
    }
  };

  // Persistir sustitución de un ingrediente y actualizar pasos reactivos en Supabase
  const handleSubstitutePersist = async (
    currentTarget: string,
    newName: string | null,
    adaptedBaseName?: string,
    substituteOption?: SubstituteOption | null
  ) => {
    try {
      const cleanTarget = String(currentTarget || '').replace(/<\/?[^>]+(>|$)/g, '').trim();
      const cleanNew = newName ? String(newName).replace(/<\/?[^>]+(>|$)/g, '').trim() : null;
      const cleanBase = String(adaptedBaseName || cleanTarget).replace(/<\/?[^>]+(>|$)/g, '').trim();

      const targetLower = cleanTarget.toLowerCase();
      const baseLower = cleanBase.toLowerCase();

      const updatedIngs = (currentIngredientes || []).map((ing) => {
        const rawName = ing?.nombre_limpio || ing?.nombre_crudo || '';
        const ingClean = String(rawName).replace(/<\/?[^>]+(>|$)/g, '').trim().toLowerCase();
        if (ingClean === targetLower || ingClean === baseLower) {
          const isReverting = !cleanNew || cleanNew.toLowerCase() === baseLower;
          if (isReverting) {
            return {
              ...ing,
              nombre_limpio: cleanBase,
              notas: null,
            };
          }

          // Aplicar sustitución estructurada con normalización de densidad sensorial
          const rawQty = substituteOption?.cantidad_ajustada !== undefined && substituteOption.cantidad_ajustada > 0
            ? substituteOption.cantidad_ajustada
            : ing.cantidad;
          const rawUnit = substituteOption?.unidad_ajustada || ing.unidad;
          const rawRol = substituteOption?.rol_culinario_ajustado || (ing as any).rol_culinario;

          const normalized = normalizeSubstituteQuantityAndUnit(
            ingClean,
            cleanNew,
            rawQty,
            rawUnit,
            rawRol,
            ing.unidad,
            ing.cantidad
          );

          return {
            ...ing,
            nombre_limpio: cleanNew,
            cantidad: normalized.cantidad,
            unidad: normalized.unidad,
            rol_culinario: normalized.rol_culinario,
            notas: `Sustituido por ${cleanNew}`,
          };
        }
        return ing;
      });

      const replacement = cleanNew || cleanBase;
      const updatedPasos = (currentPasos || []).map((paso) => {
        return {
          ...paso,
          instruccion: replaceIngredientInText(paso.instruccion, currentTarget, replacement),
          instruccion_principiante: paso.instruccion_principiante
            ? replaceIngredientInText(paso.instruccion_principiante, currentTarget, replacement)
            : null,
          instruccion_avanzada: paso.instruccion_avanzada
            ? replaceIngredientInText(paso.instruccion_avanzada, currentTarget, replacement)
            : null,
          descriptor_sensorial: paso.descriptor_sensorial
            ? replaceIngredientInText(paso.descriptor_sensorial, currentTarget, replacement)
            : null,
          potencia_fuego: paso.potencia_fuego || null,
          consejo_pro: paso.consejo_pro
            ? replaceIngredientInText(paso.consejo_pro, currentTarget, replacement)
            : null,
        };
      });

      if (!receta?.id) return;
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
          rol_culinario: (i as any).rol_culinario || null,
        })),
        pasos: updatedPasos.map((p, idx) => ({
          id: p.id,
          orden: p.orden || idx + 1,
          instruccion: p.instruccion,
          instruccion_principiante: p.instruccion_principiante || null,
          instruccion_avanzada: p.instruccion_avanzada || null,
          descriptor_sensorial: p.descriptor_sensorial || null,
          potencia_fuego: p.potencia_fuego || null,
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

  // Captura y apertura de modal de encuadre interactivo
  const handlePhotoCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
    }
    const tempUrl = URL.createObjectURL(file);
    setCropImageSrc(tempUrl);
    setCropModalOpen(true);

    e.target.value = '';
  };

  const handleCloseCropModal = () => {
    setCropModalOpen(false);
    if (cropImageSrc) {
      URL.revokeObjectURL(cropImageSrc);
      setCropImageSrc(null);
    }
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setIsUploadingPhoto(true);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const userId = user?.id || 'usuario';
      const timestamp = Date.now();
      const fileName = `${userId}-${timestamp}.jpg`;
      const filePath = `${fileName}`;

      // 1. Subir imagen recortada y optimizada al Storage
      const { error: uploadError } = await supabase.storage
        .from('recetas_fotos')
        .upload(filePath, croppedBlob, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error('Error subiendo imagen a recetas_fotos:', uploadError);
        setToast({ message: `Error al subir la imagen: ${uploadError.message}`, type: 'error' });
        return;
      }

      // 2. Obtener URL pública con getPublicUrl()
      const {
        data: { publicUrl },
      } = supabase.storage.from('recetas_fotos').getPublicUrl(filePath);

      // 3. Guardar URL en recetas.foto_url
      if (!receta?.id) return;
      const resUpdate = await updateRecipePhotoAction({
        recetaId: receta.id,
        fotoUrl: publicUrl,
      });

      if (resUpdate.error) {
        setToast({ message: resUpdate.error, type: 'error' });
        return;
      }

      // 4. Actualizar vista local, coronar la receta y mostrar toast
      setCurrentFotoUrl(publicUrl);
      setToast({ message: t('recipe_photo_success'), type: 'success' });
      router.refresh();
    } catch (err) {
      console.error('Error al procesar la fotografía:', err);
      setToast({ message: t('recipe_photo_error'), type: 'error' });
    } finally {
      setIsUploadingPhoto(false);
      handleCloseCropModal();
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
      if (!receta?.id) return;
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
        receta_id: receta?.id || '',
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
      setToast({ message: t('recipe_edit_success'), type: 'success' });

      // Sincronizar Server Component en segundo plano
      router.refresh();
    } catch (err) {
      console.error('Error al guardar la edición de la receta:', err);
      setIsSaving(false);
      setToast({ message: t('recipe_edit_error_conn'), type: 'error' });
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
                  <span>{t('recipe_uploading_photo')}</span>
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 text-[#a86224]" />
                  <span>{t('recipe_change_photo')}</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Cabecera Editorial Limpia */}
      <section className="space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#a86224]">
            <ChefHat className="w-4 h-4 shrink-0" />
            <span className="truncate">{t('recipe_card_header')}</span>
          </div>

          {/* Barra compacta de acciones secundarias (36px / h-9) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Botón de Modo Edición */}
            {isEditing ? (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  disabled={isSaving}
                  className="h-9 px-3 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold transition cursor-pointer flex items-center gap-1 disabled:opacity-50"
                >
                  <X className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{t('recipe_cancel_btn')}</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="h-9 px-3.5 rounded-xl bg-[#a86224] hover:bg-[#8e511c] text-white text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="hidden sm:inline">{t('recipe_saving_btn')}</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{t('recipe_save_btn')}</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleStartEdit}
                title={t('recipe_edit_btn')}
                className="h-9 px-2.5 sm:px-3 rounded-xl bg-white hover:bg-[#faf7f2] border border-[#e7dfd5] hover:border-[#a86224] text-xs font-semibold text-stone-700 hover:text-[#a86224] transition-all flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Pencil className="w-3.5 h-3.5 text-[#a86224]" />
                <span className="hidden sm:inline">{t('recipe_edit_btn')}</span>
              </button>
            )}

            {/* Modo Manos en la Masa: Wake Lock para que no se apague la pantalla */}
            <RecipeWakeLock />

            {/* Sistema de Valoración y Favoritos Interactivo (h-9) */}
            <RecipeRatingHeader
              recetaId={receta?.id || ''}
              initialFavorite={receta?.es_favorita || false}
              initialRating={receta?.puntuacion || 0}
            />
          </div>
        </div>

        {/* Título: Editable en modo edición o Título editorial H1 con badge clínico */}
        {isEditing ? (
          <div className="space-y-1.5 pt-1 animate-fade-in">
            <label className="block text-xs font-bold uppercase tracking-wider text-[#a86224]">
              {t('recipe_edit_title_label')}
            </label>
            <input
              type="text"
              value={editTitulo}
              onChange={(e) => setEditTitulo(e.target.value)}
              disabled={isSaving}
              placeholder={t('recipe_edit_title_placeholder')}
              className="w-full p-3.5 sm:p-4 rounded-2xl bg-white border-2 border-[#a86224] text-stone-900 font-serif-recipe font-bold text-2xl sm:text-4xl focus:outline-none focus:ring-4 focus:ring-[#a86224]/20 shadow-xs transition"
            />
          </div>
        ) : (
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold font-serif-recipe tracking-tight text-stone-900 leading-tight">
              {currentTitulo}
            </h1>

            {/* Motor de Adaptación Culinaria In-Line: Badge minimalista de una sola línea */}
            <RecipeAdaptationSection
              recipe={{
                ...recipeDataForAdapt,
                titulo: currentTitulo,
                porciones: Number(receta?.porciones) || 2,
                ingredientes: (currentIngredientes || []).map((i) => ({
                  nombre_limpio: i?.nombre_limpio || i?.nombre_crudo || '',
                  cantidad: Number(i?.cantidad) || 1,
                  unidad: i?.unidad || 'unidad',
                  pasillo_supermercado: i?.pasillo_supermercado || 'Despensa y Especias',
                })),
              }}
              userProfile={userProfile}
              isAdapted={isAdapted}
              adaptationSummary={adaptationSummary}
              onApplyAdaptation={handleApplyAdaptation}
              onRevertAdaptation={handleRevertAdaptation}
            />
          </div>
        )}

        {receta?.descripcion && (
          <div className="text-xs sm:text-sm text-stone-600 font-light leading-relaxed max-w-2xl">
            <p className={!isDescriptionExpanded ? 'line-clamp-2' : ''}>
              {receta.descripcion}
            </p>
            {receta.descripcion.length > 90 && (
              <button
                type="button"
                onClick={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
                className="mt-1 text-xs font-semibold text-[#a86224] hover:underline cursor-pointer inline-flex items-center gap-0.5"
              >
                {isDescriptionExpanded
                  ? language === 'en'
                    ? 'Show less'
                    : 'Ver menos'
                  : language === 'en'
                  ? 'Show more'
                  : 'Ver más'}
              </button>
            )}
          </div>
        )}

        {/* Franja de metadatos fluida y 100% contenida (Tiempo, Porciones, Nivel) */}
        <div className="grid grid-cols-3 w-full gap-1 py-3 px-2 border-t border-[#e7dfd5] text-stone-600 text-center">
          <div className="flex flex-col items-center justify-center min-w-0">
            <div className="flex items-center justify-center gap-1.5 text-stone-500 mb-0.5 w-full">
              <Clock className="w-4 h-4 text-[#a86224] shrink-0" />
              <span className="text-[10px] uppercase font-medium truncate">
                {t('recipe_total_time')}
              </span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-stone-900 truncate w-full">
              {receta?.tiempo_total_min || 15} {t('planner_min')}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center min-w-0 border-x border-[#e7dfd5]/60 px-1">
            <div className="flex items-center justify-center gap-1.5 text-stone-500 mb-0.5 w-full">
              <Users className="w-4 h-4 text-[#a86224] shrink-0" />
              <span className="text-[10px] uppercase font-medium truncate">
                {t('recipe_base_servings')}
              </span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-stone-900 truncate w-full">
              {receta?.porciones || 2} {t('planner_servings')}
            </span>
          </div>

          <div className="flex flex-col items-center justify-center min-w-0">
            <div className="flex items-center justify-center gap-1.5 text-stone-500 mb-0.5 w-full">
              <ChefHat className="w-4 h-4 text-[#a86224] shrink-0" />
              <span className="text-[10px] uppercase font-medium truncate">
                {language === 'en' ? 'Level' : 'Nivel'}
              </span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-stone-900 capitalize truncate w-full">
              {receta?.dificultad ? (typeof receta.dificultad === 'string' ? receta.dificultad : String(receta.dificultad)) : (language === 'en' ? 'Medium' : 'Medio')}
            </span>
          </div>
        </div>

        {/* Fila permanente de edición de momentos del día y rol en el menú */}
        <RecipeClassificationRow
          momentos_dia={currentMomentosDia}
          rol_plato={currentRolPlato}
          es_favorito_menu={currentEsFavoritoMenu}
          onOpenDrawer={() => setIsCategorizeDrawerOpen(true)}
        />
      </section>

      {/* Pestaña / Acordeón Plegable Compacto de Valores Nutricionales */}
      <RecipeNutritionAccordion
        calorias={receta?.calorias_por_porcion}
        proteinas={receta?.proteinas_por_porcion}
        carbohidratos={receta?.carbohidratos_por_porcion}
        grasas={receta?.grasas_por_porcion}
        fibra={receta?.fibra_por_porcion}
      />

      {/* PANEL DE EDICIÓN DE INGREDIENTES EN MODO EDICIÓN */}
      {isEditing ? (
        <section className="rounded-3xl bg-white border-2 border-[#a86224] p-5 sm:p-7 shadow-sm space-y-5 animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e7dfd5] pb-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold font-serif-recipe text-stone-900">
                {t('recipe_edit_ingredients_title')}
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                {t('recipe_edit_ingredients_desc')}
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddIngredient}
              disabled={isSaving}
              className="px-3.5 py-2 rounded-xl bg-[#f4efe6] hover:bg-[#e7dfd5] text-[#a86224] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('recipe_edit_add_ingredient')}</span>
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
                    placeholder={t('recipe_edit_name_placeholder')}
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
                      placeholder={t('recipe_edit_qty_placeholder')}
                      disabled={isSaving}
                      className="w-full min-h-[42px] px-3 rounded-xl bg-white border border-[#e7dfd5] text-xs sm:text-sm text-stone-900 font-mono font-medium focus:outline-none focus:border-[#a86224] focus:ring-1 focus:ring-[#a86224] shadow-2xs"
                    />
                  </div>

                  <div className="w-24 sm:w-28">
                    <input
                      type="text"
                      value={item.unidad}
                      onChange={(e) => handleIngredientChange(idx, 'unidad', e.target.value)}
                      placeholder={t('recipe_edit_unit_placeholder')}
                      disabled={isSaving}
                      className="w-full min-h-[42px] px-3 rounded-xl bg-white border border-[#e7dfd5] text-xs sm:text-sm text-stone-900 font-medium focus:outline-none focus:border-[#a86224] focus:ring-1 focus:ring-[#a86224] shadow-2xs"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveIngredient(idx)}
                    disabled={isSaving || editIngredientes.length <= 1}
                    title={t('recipe_edit_delete_ingredient')}
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
              {t('recipe_cancel_btn')}
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
                  <span>{t('recipe_saving_btn')}</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{t('recipe_save_btn')}</span>
                </>
              )}
            </button>
          </div>
        </section>
      ) : (
        /* Acordeones Plegables con Escalado Inteligente y Modo Compra */
        <RecipeInteractiveSections
          recetaId={receta?.id || ''}
          tituloReceta={currentTitulo || ''}
          basePorciones={receta?.porciones || 2}
          tiempoCoccionMin={receta?.tiempo_coccion_min ?? null}
          ingredientes={currentIngredientes || []}
          pasos={currentPasos || []}
          defaultServings={initialServings}
          onSubstitutePersist={handleSubstitutePersist}
          rolPlato={receta?.rol_plato}
          categoriasGastronomicas={
            (receta as any)?.categorias_gastronomicas ||
            (receta?.receta_original as any)?.categorias_gastronomicas ||
            receta?.etiquetas
          }
          isAdapted={isAdapted}
          userProfile={userProfile}
        />
      )}

      {/* Sección: Fotografía del plato, valoración y notas de la receta */}
      <CookingDiarySection
        recetaId={receta?.id || ''}
        entradas={diarioEntries || []}
        onTriggerCamera={() => cameraInputRef.current?.click()}
        onTriggerGallery={() => galleryInputRef.current?.click()}
        isUploadingPhoto={isUploadingPhoto}
      />

      {/* Drawer de Categorización de Menú y Momentos (Vaul) */}
      <RecipeCategorizeDrawer
        isOpen={isCategorizeDrawerOpen}
        onOpenChange={handleOpenChangeCategorizeDrawer}
        isNew={false}
        receta={{
          id: receta?.id || '',
          titulo: currentTitulo,
          calorias_por_porcion: receta?.calorias_por_porcion,
          etiquetas: receta?.etiquetas,
          descripcion: receta?.descripcion,
          momentos_dia: currentMomentosDia,
          rol_plato: currentRolPlato,
          es_favorito_menu: currentEsFavoritoMenu,
        }}
        ingredientes={currentIngredientes}
        onSave={handleSaveClassification}
      />

      {/* Modal de Encuadre Interactivo de Fotografía */}
      {cropModalOpen && cropImageSrc && (
        <PhotoCropModal
          isOpen={cropModalOpen}
          imageSrc={cropImageSrc}
          onClose={handleCloseCropModal}
          onCropComplete={handleCropComplete}
          aspectRatio={16 / 9}
          outputWidth={1600}
          outputHeight={900}
          title="Encuadra tu plato"
          subtitle="Arrastra con el dedo y usa el zoom para centrar tu creación"
        />
      )}
    </>
  );
}
