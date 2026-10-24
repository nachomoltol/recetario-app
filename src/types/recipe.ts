import { Database, RolPlato, MomentoDia } from './database';

export type { RolPlato, MomentoDia };
export type Usuario = Database['public']['Tables']['usuarios']['Row'];
export type IngredienteMaestro = Database['public']['Tables']['ingredientes_maestro']['Row'];
export type Receta = Database['public']['Tables']['recetas']['Row'];
export type RecetaIngrediente = Database['public']['Tables']['receta_ingredientes']['Row'];
export type Paso = Database['public']['Tables']['pasos']['Row'];
export type DiarioCocinados = Database['public']['Tables']['diario_cocinados']['Row'];
export type PlanComida = Database['public']['Tables']['plan_comidas']['Row'];

/**
 * Entidad de Receta Completa con ingredientes y pasos anidados
 */
export interface RecetaCompleta extends Receta {
  ingredientes: (RecetaIngrediente & {
    ingrediente_maestro?: IngredienteMaestro | null;
  })[];
  pasos: Paso[];
  cocinados?: DiarioCocinados[];
}

/**
 * Filtros para la búsqueda y exploración de recetas
 */
export interface FiltrosRecetas {
  query?: string;
  categoria?: string;
  dificultad?: Receta['dificultad'];
  tiempoMaximo?: number;
  soloFavoritas?: boolean;
  fuenteTipo?: Receta['fuente_tipo'];
  rolPlato?: RolPlato;
  momentoDia?: string;
  soloFavoritoMenu?: boolean;
}
