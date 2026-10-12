'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { PlanComida, Receta, RecetaIngrediente } from '@/types/recipe';

export type MealSlot = 'desayuno' | 'almuerzo' | 'cena' | 'snack';

export interface PlannedSlotItem extends PlanComida {
  receta?: Pick<Receta, 'id' | 'titulo' | 'tiempo_total_min' | 'porciones' | 'dificultad'> | null;
}

export interface UnifiedShoppingItem {
  nombre: string;
  cantidadTotal: number;
  unidad: string;
  gramosTotal: number;
  recetasNombres: string[];
}

export async function getWeeklyPlanAction(
  startDate: string,
  endDate: string
): Promise<{ success: boolean; data?: PlannedSlotItem[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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
    return { success: false, error: error.message };
  }

  const mapped = (data || []).map((row: any) => ({
    ...row,
    receta: row.recetas || null,
  })) as PlannedSlotItem[];

  return { success: true, data: mapped };
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
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
    return { success: false, error: error.message };
  }

  revalidatePath('/meal-planner');
  return { success: true };
}

export async function removeMealSlotAction({
  fecha,
  slot,
}: {
  fecha: string;
  slot: MealSlot;
}): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'No autenticado' };
  }

  const { error } = await supabase
    .from('plan_comidas')
    .delete()
    .eq('usuario_id', user.id)
    .eq('fecha', fecha)
    .eq('slot', slot);

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath('/meal-planner');
  return { success: true };
}

export async function generateUnifiedShoppingListAction(
  startDate: string,
  endDate: string
): Promise<{ success: boolean; items?: UnifiedShoppingItem[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: 'No autenticado' };
  }

  // 1. Obtener los slots que tienen receta asignada en el rango
  const { data: plans, error: errPlans } = await supabase
    .from('plan_comidas')
    .select(`
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

  if (errPlans) {
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

  // 2. Traer todos los ingredientes de estas recetas
  const { data: rawIngredientes, error: errIng } = await supabase
    .from('receta_ingredientes')
    .select('*')
    .in('receta_id', recipeIds);

  if (errIng) {
    return { success: false, error: errIng.message };
  }

  // 3. Motor de consolidación inteligente (agrupa por nombre canónico y unidad compatible)
  const consolidated = new Map<string, UnifiedShoppingItem>();

  for (const ing of (rawIngredientes || []) as RecetaIngrediente[]) {
    const rawName = (ing.nombre_limpio || ing.nombre_crudo || '').trim();
    const canonName = rawName.charAt(0).toUpperCase() + rawName.slice(1).toLowerCase();
    const unidad = (ing.unidad || 'unidad').trim().toLowerCase();
    const key = `${canonName.toLowerCase()}___${unidad}`;

    const cant = Number(ing.cantidad) || 0;
    const gramos = Number(ing.gramos_calculados) || 0;
    const recipeTitle = recipeMap.get(ing.receta_id) || 'Receta';

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
        recetasNombres: [recipeTitle],
      });
    }
  }

  const items = Array.from(consolidated.values()).sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es')
  );

  return { success: true, items };
}
