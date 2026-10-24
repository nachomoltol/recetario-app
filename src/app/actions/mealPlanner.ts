'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { PlanComida, Receta, RecetaIngrediente } from '@/types/recipe';
import { classifyIngredientAisle } from '@/lib/culinary/aisles';

export type MealSlot = 'desayuno' | 'almuerzo_1' | 'almuerzo_2' | 'cena' | 'snack_postre';

export interface PlannedSlotItem extends PlanComida {
  receta?: Pick<Receta, 'id' | 'titulo' | 'tiempo_total_min' | 'porciones' | 'dificultad'> | null;
}

export interface UnifiedShoppingFilterOptions {
  selectedDates?: string[];
  selectedSlots?: MealSlot[];
}

export interface UnifiedShoppingItem {
  nombre: string;
  cantidadTotal: number;
  unidad: string;
  gramosTotal: number;
  pasillo_supermercado: string;
  recetasNombres: string[];
}

export async function getWeeklyPlanAction(
  startDate: string,
  endDate: string
): Promise<{ success: boolean; data?: PlannedSlotItem[]; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No autenticado' };
    }

    const { data, error } = await supabase
      .from('plan_comidas')
      .select(`
        id,
        usuario_id,
        receta_id,
        fecha,
        slot,
        notas,
        created_at,
        updated_at,
        recetas:receta_id (
          id,
          titulo,
          tiempo_total_min,
          porciones,
          dificultad
        )
      `)
      .eq('usuario_id', user.id)
      .gte('fecha', startDate)
      .lte('fecha', endDate);

    if (error) {
      console.error('[mealPlanner] Error al consultar plan semanal:', error);
      return { success: false, error: error.message };
    }

    const mapped = (data || []).map((row: any) => ({
      ...row,
      receta: row.recetas || null,
    })) as PlannedSlotItem[];

    return { success: true, data: mapped };
  } catch (err: any) {
    console.error('[mealPlanner] Error no controlado en getWeeklyPlanAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al cargar el plan de comidas.',
    };
  }
}

export async function assignMealSlotAction({
  fecha,
  slot,
  recetaId,
}: {
  fecha: string;
  slot: MealSlot;
  recetaId: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No autenticado' };
    }

    const { error } = await supabase.from('plan_comidas').upsert(
      {
        usuario_id: user.id,
        fecha,
        slot,
        receta_id: recetaId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'usuario_id,fecha,slot' }
    );

    if (error) {
      console.error('[mealPlanner] Error asignando plato al planificador:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/meal-planner');
    return { success: true };
  } catch (err: any) {
    console.error('[mealPlanner] Error no controlado en assignMealSlotAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al guardar en el planificador.',
    };
  }
}

export async function batchAssignMealSlotsAction(
  items: { fecha: string; slot: MealSlot; recetaId: string }[]
): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    if (!items || items.length === 0) {
      return { success: true, count: 0 };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No autenticado' };
    }

    const rows = items.map((it) => ({
      usuario_id: user.id,
      fecha: it.fecha,
      slot: it.slot,
      receta_id: it.recetaId,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase.from('plan_comidas').upsert(
      rows,
      { onConflict: 'usuario_id,fecha,slot' }
    );

    if (error) {
      console.error('[mealPlanner] Error guardando lote en el planificador:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/meal-planner');
    return { success: true, count: rows.length };
  } catch (err: any) {
    console.error('[mealPlanner] Error no controlado en batchAssignMealSlotsAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al guardar el plan de comidas.',
    };
  }
}

export async function removeMealSlotAction({
  fecha,
  slot,
}: {
  fecha: string;
  slot: MealSlot;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No autenticado' };
    }

    const { error } = await supabase
      .from('plan_comidas')
      .delete()
      .eq('usuario_id', user.id)
      .eq('fecha', fecha)
      .eq('slot', slot);

    if (error) {
      console.error('[mealPlanner] Error eliminando comida del planificador:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/meal-planner');
    return { success: true };
  } catch (err: any) {
    console.error('[mealPlanner] Error no controlado en removeMealSlotAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al eliminar la comida.',
    };
  }
}

export async function generateUnifiedShoppingListAction(
  startDate: string,
  endDate: string,
  options?: UnifiedShoppingFilterOptions
): Promise<{ success: boolean; items?: UnifiedShoppingItem[]; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No autenticado' };
    }

    // 1. Obtener los slots que tienen receta asignada en el rango, aplicando filtros interactivos
    let query = supabase
      .from('plan_comidas')
      .select(`
        fecha,
        slot,
        receta_id,
        recetas:receta_id (
          id,
          titulo
        )
      `)
      .eq('usuario_id', user.id)
      .gte('fecha', startDate)
      .lte('fecha', endDate)
      .not('receta_id', 'is', null);

    if (options?.selectedDates && options.selectedDates.length > 0) {
      query = query.in('fecha', options.selectedDates);
    }

    if (options?.selectedSlots && options.selectedSlots.length > 0) {
      query = query.in('slot', options.selectedSlots);
    }

    const { data: plans, error: errPlans } = await query;

    if (errPlans) {
      console.error('[mealPlanner] Error obteniendo planes para lista de compras:', errPlans);
      return { success: false, error: errPlans.message };
    }

    const recipeMap = new Map<string, string>();
    const recipeIds: string[] = [];

    for (const p of plans || []) {
      if (p.receta_id) {
        recipeIds.push(p.receta_id);
        const titulo = (p.recetas as any)?.titulo || 'Receta';
        recipeMap.set(p.receta_id, titulo);
      }
    }

    if (recipeIds.length === 0) {
      return { success: true, items: [] };
    }

    // 2. Traer todos los ingredientes de estas recetas seleccionadas
    const { data: rawIngredientes, error: errIng } = await supabase
      .from('receta_ingredientes')
      .select('*')
      .in('receta_id', recipeIds);

    if (errIng) {
      console.error('[mealPlanner] Error obteniendo ingredientes para lista unificada:', errIng);
      return { success: false, error: errIng.message };
    }

    // 3. Motor de consolidación inteligente agrupado por pasillo y unidad compatible
    const consolidated = new Map<string, UnifiedShoppingItem>();

    for (const ing of (rawIngredientes || []) as (RecetaIngrediente & { pasillo_supermercado?: string })[]) {
      const rawName = (ing.nombre_limpio || ing.nombre_crudo || '').trim();
      const canonName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
      const unidad = (ing.unidad || 'unidad').trim().toLowerCase();
      const key = `${canonName.toLowerCase()}___${unidad}`;

      const cant = Number(ing.cantidad) || 0;
      const gramos = Number(ing.gramos_calculados) || 0;
      const recipeTitle = recipeMap.get(ing.receta_id) || 'Receta';
      const pasillo = classifyIngredientAisle(canonName, ing.pasillo_supermercado);

      if (consolidated.has(key)) {
        const existing = consolidated.get(key)!;
        existing.cantidadTotal = Math.round((existing.cantidadTotal + cant) * 10) / 10;
        existing.gramosTotal = Math.round(existing.gramosTotal + gramos);
        if (!existing.recetasNombres.includes(recipeTitle)) {
          existing.recetasNombres.push(recipeTitle);
        }
      } else {
        consolidated.set(key, {
          nombre: canonName,
          cantidadTotal: Math.round(cant * 10) / 10,
          unidad,
          gramosTotal: Math.round(gramos),
          pasillo_supermercado: pasillo,
          recetasNombres: [recipeTitle],
        });
      }
    }

    const items = Array.from(consolidated.values()).sort((a, b) => {
      return a.nombre.localeCompare(b.nombre, 'es');
    });

    return { success: true, items };
  } catch (err: any) {
    console.error('[mealPlanner] Error no controlado en generateUnifiedShoppingListAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado generando la lista unificada.',
    };
  }
}
