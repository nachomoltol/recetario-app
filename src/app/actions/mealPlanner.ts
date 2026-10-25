'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { PlanComida, Receta, RecetaIngrediente } from '@/types/recipe';
import { classifyIngredientAisle } from '@/lib/culinary/aisles';
import { generateShoppingListFromPlans } from '@/lib/culinary/shoppingListGenerator';

export type MealSlot = 'desayuno' | 'almuerzo' | 'almuerzo_1' | 'almuerzo_2' | 'cena' | 'snack_postre';

export interface PlannedSlotItem extends PlanComida {
  porciones?: number | null;
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

    let { data, error } = await supabase
      .from('plan_comidas')
      .select(`
        id,
        usuario_id,
        receta_id,
        fecha,
        slot,
        porciones,
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

    // Fallback de resiliencia si la columna 'porciones' aún no se ha ejecutado en Supabase
    if (error && (error.code === '42703' || error.message?.includes('porciones'))) {
      const fallback = await supabase
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
      data = fallback.data as any;
      error = fallback.error;
    }

    if (error) {
      console.error('[mealPlanner] Error al consultar plan semanal:', error);
      return { success: false, error: error.message };
    }

    const mapped = (data || []).map((row: any) => ({
      ...row,
      receta: Array.isArray(row.recetas) ? (row.recetas[0] || null) : (row.recetas || null),
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
  porciones,
}: {
  fecha: string;
  slot: MealSlot;
  recetaId: string;
  porciones?: number;
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

    // Si no se especifican porciones, consultar raciones_defecto del usuario
    let finalPorciones = porciones;
    if (!finalPorciones) {
      const { data: userProfile } = await supabase
        .from('usuarios')
        .select('raciones_defecto')
        .eq('id', user.id)
        .maybeSingle();
      finalPorciones = (userProfile as any)?.porciones_por_defecto ?? userProfile?.raciones_defecto ?? 4;
    }

    const rowToUpsert: any = {
      usuario_id: user.id,
      fecha,
      slot,
      receta_id: recetaId,
      porciones: finalPorciones,
      updated_at: new Date().toISOString(),
    };

    let { error } = await supabase.from('plan_comidas').upsert(
      rowToUpsert,
      { onConflict: 'usuario_id,fecha,slot' }
    );

    // Resiliencia si la columna porciones no existe en la BD
    if (error && (error.code === '42703' || error.message?.includes('porciones'))) {
      const { porciones: _, ...rowWithoutPorciones } = rowToUpsert;
      const retry = await supabase.from('plan_comidas').upsert(
        rowWithoutPorciones,
        { onConflict: 'usuario_id,fecha,slot' }
      );
      error = retry.error;
    }

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
  items: { fecha: string; slot: MealSlot; recetaId: string; porciones?: number }[]
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

    // 2. Respeto Estricto de los Comensales del Usuario (porciones):
    // Leer número de porciones configurado en el perfil del usuario (perfil.raciones_defecto o comensales)
    const { data: userProfile } = await supabase
      .from('usuarios')
      .select('raciones_defecto')
      .eq('id', user.id)
      .maybeSingle();

    const userServings = (userProfile as any)?.porciones_por_defecto ?? userProfile?.raciones_defecto ?? 4;

    // Deduplicar ítems por clave compuesta (fecha + slot) para evitar error de PostgreSQL:
    // "ON CONFLICT DO UPDATE command cannot affect row a second time"
    const uniqueItemsMap = new Map<string, (typeof items)[0]>();
    for (const it of items) {
      uniqueItemsMap.set(`${it.fecha}___${it.slot}`, it);
    }
    const uniqueItems = Array.from(uniqueItemsMap.values());

    const rows = uniqueItems.map((it) => ({
      usuario_id: user.id,
      fecha: it.fecha,
      slot: it.slot,
      receta_id: it.recetaId,
      porciones: userServings && userServings > 0 ? userServings : (it.porciones && it.porciones > 0 ? it.porciones : 4),
      updated_at: new Date().toISOString(),
    }));

    // Limpieza de slots incompatibles de almuerzo (Plato Único 'almuerzo' vs Doble Plato 'almuerzo_1'/'almuerzo_2')
    const datesWithPlatoUnico = Array.from(
      new Set(uniqueItems.filter((it) => it.slot === 'almuerzo').map((it) => it.fecha))
    );
    if (datesWithPlatoUnico.length > 0) {
      await supabase
        .from('plan_comidas')
        .delete()
        .eq('usuario_id', user.id)
        .in('fecha', datesWithPlatoUnico)
        .in('slot', ['almuerzo_1', 'almuerzo_2']);
    }

    const datesWithDosPlatos = Array.from(
      new Set(uniqueItems.filter((it) => it.slot === 'almuerzo_1' || it.slot === 'almuerzo_2').map((it) => it.fecha))
    );
    if (datesWithDosPlatos.length > 0) {
      await supabase
        .from('plan_comidas')
        .delete()
        .eq('usuario_id', user.id)
        .in('fecha', datesWithDosPlatos)
        .eq('slot', 'almuerzo');
    }

    let { error } = await supabase.from('plan_comidas').upsert(
      rows,
      { onConflict: 'usuario_id,fecha,slot' }
    );

    // Resiliencia si la columna porciones no existe en la BD
    if (error && (error.code === '42703' || error.message?.includes('porciones'))) {
      const rowsWithout = rows.map(({ porciones, ...rest }) => rest);
      const retry = await supabase.from('plan_comidas').upsert(
        rowsWithout,
        { onConflict: 'usuario_id,fecha,slot' }
      );
      error = retry.error;
    }

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

/**
 * 5. Herramienta de Reseteo / Limpieza de Menús:
 * Vacía todas las comidas asignadas de la semana o rango de fechas seleccionado
 */
export async function clearWeeklyPlanAction(
  startDate: string,
  endDate: string
): Promise<{ success: boolean; error?: string; count?: number }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, error: 'No autenticado' };
    }

    const { error, count } = await supabase
      .from('plan_comidas')
      .delete({ count: 'exact' })
      .eq('usuario_id', user.id)
      .gte('fecha', startDate)
      .lte('fecha', endDate);

    if (error) {
      console.error('[mealPlanner] Error vaciando plan semanal:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/meal-planner');
    revalidatePath('/smart-menu');
    return { success: true, count: count ?? 0 };
  } catch (err: any) {
    console.error('[mealPlanner] Error no controlado en clearWeeklyPlanAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado al vaciar el plan.',
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

    // Consultar raciones por defecto del usuario
    const { data: userProfile } = await supabase
      .from('usuarios')
      .select('raciones_defecto')
      .eq('id', user.id)
      .maybeSingle();

    const userDefaultServings = (userProfile as any)?.porciones_por_defecto ?? userProfile?.raciones_defecto ?? 4;

    // 1. Obtener los slots que tienen receta asignada en el rango, aplicando filtros interactivos
    let query = supabase
      .from('plan_comidas')
      .select(`
        fecha,
        slot,
        receta_id,
        porciones,
        recetas:receta_id (
          id,
          titulo,
          porciones
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

    let { data: plans, error: errPlans } = await query;

    // Resiliencia si la columna porciones no existe aún en la base de datos
    if (errPlans && (errPlans.code === '42703' || errPlans.message?.includes('porciones'))) {
      let fallbackQuery = supabase
        .from('plan_comidas')
        .select(`
          fecha,
          slot,
          receta_id,
          recetas:receta_id (
            id,
            titulo,
            porciones
          )
        `)
        .eq('usuario_id', user.id)
        .gte('fecha', startDate)
        .lte('fecha', endDate)
        .not('receta_id', 'is', null);

      if (options?.selectedDates && options.selectedDates.length > 0) {
        fallbackQuery = fallbackQuery.in('fecha', options.selectedDates);
      }
      if (options?.selectedSlots && options.selectedSlots.length > 0) {
        fallbackQuery = fallbackQuery.in('slot', options.selectedSlots);
      }
      const retry = await fallbackQuery;
      plans = retry.data as any;
      errPlans = retry.error;
    }

    if (errPlans) {
      console.error('[mealPlanner] Error obteniendo planes para lista de compras:', errPlans);
      return { success: false, error: errPlans.message };
    }

    const recipeIds = (plans || []).map((p) => p.receta_id).filter(Boolean);
    if (recipeIds.length === 0) {
      return { success: true, items: [] };
    }

    // 2. Traer todos los ingredientes de estas recetas seleccionadas
    const { data: rawIngredientes, error: errIng } = await supabase
      .from('receta_ingredientes')
      .select('*')
      .in('receta_id', Array.from(new Set(recipeIds)));

    if (errIng) {
      console.error('[mealPlanner] Error obteniendo ingredientes para lista unificada:', errIng);
      return { success: false, error: errIng.message };
    }

    // 3. Generar la lista de la compra proporcional según las porciones configuradas
    const items = generateShoppingListFromPlans(
      (plans || []) as any,
      (rawIngredientes || []) as any,
      userDefaultServings
    );

    return { success: true, items };
  } catch (err: any) {
    console.error('[mealPlanner] Error no controlado en generateUnifiedShoppingListAction:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Error inesperado generando la lista unificada.',
    };
  }
}
