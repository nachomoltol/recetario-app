export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type DificultadReceta = string;
export type FuenteTipoReceta =
  | 'manual'
  | 'tiktok'
  | 'instagram'
  | 'youtube'
  | 'audio'
  | 'foto_manuscrita'
  | 'pdf'
  | 'web';
export type RolPlato = 'completo' | 'primero' | 'segundo' | 'desayuno_snack' | 'postre';
export type MomentoDia = 'desayuno' | 'almuerzo' | 'cena' | 'snack' | 'postre';
export type RolCulinario =
  | 'principal'
  | 'sofrito_base'
  | 'guarnicion'
  | 'grasa_coccion'
  | 'condimento'
  | 'invariable';

export interface Database {
  public: {
    Tables: {
      usuarios: {
        Row: {
          id: string;
          email: string;
          nombre: string | null;
          avatar_url: string | null;
          preferencias_dieteticas: string[];
          alergenos: string[];
          objetivo_calorico_diario: number | null;
          raciones_defecto: number;
          nivel_culinario: string;
          plan_suscripcion: 'gratis' | 'pro';
          capturas_mes_actual: number;
          fecha_ultimo_reinicio: string;
          antiguedad_ciclos_mes: number;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          nombre?: string | null;
          avatar_url?: string | null;
          preferencias_dieteticas?: string[];
          alergenos?: string[];
          objetivo_calorico_diario?: number | null;
          raciones_defecto?: number;
          nivel_culinario?: string;
          plan_suscripcion?: 'gratis' | 'pro';
          capturas_mes_actual?: number;
          fecha_ultimo_reinicio?: string;
          antiguedad_ciclos_mes?: number;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          nombre?: string | null;
          avatar_url?: string | null;
          preferencias_dieteticas?: string[];
          alergenos?: string[];
          objetivo_calorico_diario?: number | null;
          raciones_defecto?: number;
          nivel_culinario?: string;
          plan_suscripcion?: 'gratis' | 'pro';
          capturas_mes_actual?: number;
          fecha_ultimo_reinicio?: string;
          antiguedad_ciclos_mes?: number;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      dispositivos_cuotas: {
        Row: {
          device_id: string;
          capturas_mes_actual: number;
          fecha_ultimo_reinicio: string;
          antiguedad_ciclos_mes: number;
          primer_usuario_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          device_id: string;
          capturas_mes_actual?: number;
          fecha_ultimo_reinicio?: string;
          antiguedad_ciclos_mes?: number;
          primer_usuario_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          device_id?: string;
          capturas_mes_actual?: number;
          fecha_ultimo_reinicio?: string;
          antiguedad_ciclos_mes?: number;
          primer_usuario_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ingredientes_maestro: {
        Row: {
          id: string;
          nombre: string;
          nombre_normalizado: string;
          categoria: string;
          calorias_por_100g: number;
          proteinas_por_100g: number;
          carbohidratos_por_100g: number;
          grasas_por_100g: number;
          fibra_por_100g: number | null;
          sodio_mg_por_100g: number | null;
          densidad_g_ml: number;
          peso_unidad_promedio_g: number | null;
          es_ultraprocesado: boolean;
          alergenos: string[];
          sustitutos_saludables_ids: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          nombre: string;
          nombre_normalizado: string;
          categoria: string;
          calorias_por_100g?: number;
          proteinas_por_100g?: number;
          carbohidratos_por_100g?: number;
          grasas_por_100g?: number;
          fibra_por_100g?: number | null;
          sodio_mg_por_100g?: number | null;
          densidad_g_ml?: number;
          peso_unidad_promedio_g?: number | null;
          es_ultraprocesado?: boolean;
          alergenos?: string[];
          sustitutos_saludables_ids?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          nombre?: string;
          nombre_normalizado?: string;
          categoria?: string;
          calorias_por_100g?: number;
          proteinas_por_100g?: number;
          carbohidratos_por_100g?: number;
          grasas_por_100g?: number;
          fibra_por_100g?: number | null;
          sodio_mg_por_100g?: number | null;
          densidad_g_ml?: number;
          peso_unidad_promedio_g?: number | null;
          es_ultraprocesado?: boolean;
          alergenos?: string[];
          sustitutos_saludables_ids?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      recetas: {
        Row: {
          id: string;
          usuario_id: string;
          titulo: string;
          descripcion: string | null;
          imagen_portada_url: string | null;
          foto_url: string | null;
          tiempo_preparacion_min: number | null;
          tiempo_coccion_min: number | null;
          tiempo_total_min: number | null;
          porciones: number;
          dificultad: DificultadReceta;
          fuente_tipo: FuenteTipoReceta;
          fuente_url: string | null;
          calorias_por_porcion: number | null;
          proteinas_por_porcion: number | null;
          carbohidratos_por_porcion: number | null;
          grasas_por_porcion: number | null;
          fibra_por_porcion: number | null;
          es_favorita: boolean;
          puntuacion: number;
          es_publica: boolean;
          etiquetas: string[];
          momentos_dia: string[];
          rol_plato: RolPlato;
          es_favorito_menu: boolean;
          receta_original?: Record<string, any> | null;
          source_url_hash?: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          titulo: string;
          descripcion?: string | null;
          imagen_portada_url?: string | null;
          foto_url?: string | null;
          tiempo_preparacion_min?: number | null;
          tiempo_coccion_min?: number | null;
          porciones?: number;
          dificultad?: DificultadReceta;
          fuente_tipo?: FuenteTipoReceta;
          fuente_url?: string | null;
          calorias_por_porcion?: number | null;
          proteinas_por_porcion?: number | null;
          carbohidratos_por_porcion?: number | null;
          grasas_por_porcion?: number | null;
          fibra_por_porcion?: number | null;
          es_favorita?: boolean;
          puntuacion?: number;
          es_publica?: boolean;
          etiquetas?: string[];
          momentos_dia?: string[];
          rol_plato?: RolPlato;
          es_favorito_menu?: boolean;
          receta_original?: Record<string, any> | null;
          source_url_hash?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          usuario_id?: string;
          titulo?: string;
          descripcion?: string | null;
          imagen_portada_url?: string | null;
          foto_url?: string | null;
          tiempo_preparacion_min?: number | null;
          tiempo_coccion_min?: number | null;
          porciones?: number;
          dificultad?: DificultadReceta;
          fuente_tipo?: FuenteTipoReceta;
          fuente_url?: string | null;
          calorias_por_porcion?: number | null;
          proteinas_por_porcion?: number | null;
          carbohidratos_por_porcion?: number | null;
          grasas_por_porcion?: number | null;
          fibra_por_porcion?: number | null;
          es_favorita?: boolean;
          puntuacion?: number;
          es_publica?: boolean;
          etiquetas?: string[];
          momentos_dia?: string[];
          rol_plato?: RolPlato;
          es_favorito_menu?: boolean;
          receta_original?: Record<string, any> | null;
          source_url_hash?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "recetas_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          }
        ];
      };
      receta_ingredientes: {
        Row: {
          id: string;
          receta_id: string;
          ingrediente_maestro_id: string | null;
          nombre_crudo: string;
          nombre_limpio: string;
          cantidad: number;
          unidad: string;
          gramos_calculados: number;
          pasillo_supermercado: string;
          notas: string | null;
          es_opcional: boolean;
          orden: number;
          rol_culinario?: RolCulinario | string | null;
          seccion?: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          receta_id: string;
          ingrediente_maestro_id?: string | null;
          nombre_crudo: string;
          nombre_limpio: string;
          cantidad?: number;
          unidad?: string;
          gramos_calculados?: number;
          pasillo_supermercado?: string;
          notas?: string | null;
          es_opcional?: boolean;
          orden?: number;
          rol_culinario?: RolCulinario | string | null;
          seccion?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          receta_id?: string;
          ingrediente_maestro_id?: string | null;
          nombre_crudo?: string;
          nombre_limpio?: string;
          cantidad?: number;
          unidad?: string;
          gramos_calculados?: number;
          pasillo_supermercado?: string;
          notas?: string | null;
          es_opcional?: boolean;
          orden?: number;
          rol_culinario?: RolCulinario | string | null;
          seccion?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "receta_ingredientes_receta_id_fkey";
            columns: ["receta_id"];
            isOneToOne: false;
            referencedRelation: "recetas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "receta_ingredientes_ingrediente_maestro_id_fkey";
            columns: ["ingrediente_maestro_id"];
            isOneToOne: false;
            referencedRelation: "ingredientes_maestro";
            referencedColumns: ["id"];
          }
        ];
      };
      pasos: {
        Row: {
          id: string;
          receta_id: string;
          orden: number;
          instruccion: string;
          instruccion_principiante?: string | null;
          instruccion_avanzada?: string | null;
          descriptor_sensorial?: string | null;
          potencia_fuego?: 'suave' | 'medio' | 'medio-alto' | 'alto' | 'horno' | string | null;
          tiempo_estimado_min: number | null;
          temperatura_celsius: number | null;
          utensilios_sugeridos: string[];
          consejo_pro: string | null;
          imagen_paso_url: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          receta_id: string;
          orden: number;
          instruccion: string;
          instruccion_principiante?: string | null;
          instruccion_avanzada?: string | null;
          descriptor_sensorial?: string | null;
          potencia_fuego?: 'suave' | 'medio' | 'medio-alto' | 'alto' | 'horno' | string | null;
          tiempo_estimado_min?: number | null;
          temperatura_celsius?: number | null;
          utensilios_sugeridos?: string[];
          consejo_pro?: string | null;
          imagen_paso_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          receta_id?: string;
          orden?: number;
          instruccion?: string;
          instruccion_principiante?: string | null;
          instruccion_avanzada?: string | null;
          descriptor_sensorial?: string | null;
          potencia_fuego?: 'suave' | 'medio' | 'medio-alto' | 'alto' | 'horno' | string | null;
          tiempo_estimado_min?: number | null;
          temperatura_celsius?: number | null;
          utensilios_sugeridos?: string[];
          consejo_pro?: string | null;
          imagen_paso_url?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pasos_receta_id_fkey";
            columns: ["receta_id"];
            isOneToOne: false;
            referencedRelation: "recetas";
            referencedColumns: ["id"];
          }
        ];
      };
      diario_cocinados: {
        Row: {
          id: string;
          receta_id: string;
          usuario_id: string;
          fecha_cocinado: string;
          foto_resultado_url: string | null;
          calificacion: number | null;
          notas_cocinero: string | null;
          modificaciones_realizadas: string | null;
          tiempo_empleado_min: number | null;
          porciones_preparadas: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          receta_id: string;
          usuario_id: string;
          fecha_cocinado?: string;
          foto_resultado_url?: string | null;
          calificacion?: number | null;
          notas_cocinero?: string | null;
          modificaciones_realizadas?: string | null;
          tiempo_empleado_min?: number | null;
          porciones_preparadas?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          receta_id?: string;
          usuario_id?: string;
          fecha_cocinado?: string;
          foto_resultado_url?: string | null;
          calificacion?: number | null;
          notas_cocinero?: string | null;
          modificaciones_realizadas?: string | null;
          tiempo_empleado_min?: number | null;
          porciones_preparadas?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "diario_cocinados_receta_id_fkey";
            columns: ["receta_id"];
            isOneToOne: false;
            referencedRelation: "recetas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "diario_cocinados_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          }
        ];
      };
      plan_comidas: {
        Row: {
          id: string;
          usuario_id: string;
          receta_id: string | null;
          fecha: string;
          slot: 'desayuno' | 'almuerzo_1' | 'almuerzo_2' | 'cena' | 'snack_postre' | 'almuerzo' | 'snack';
          porciones?: number | null;
          notas: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          usuario_id: string;
          receta_id?: string | null;
          fecha: string;
          slot: 'desayuno' | 'almuerzo_1' | 'almuerzo_2' | 'cena' | 'snack_postre' | 'almuerzo' | 'snack';
          porciones?: number | null;
          notas?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          usuario_id?: string;
          receta_id?: string | null;
          fecha?: string;
          slot?: 'desayuno' | 'almuerzo_1' | 'almuerzo_2' | 'cena' | 'snack_postre' | 'almuerzo' | 'snack';
          porciones?: number | null;
          notas?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "plan_comidas_receta_id_fkey";
            columns: ["receta_id"];
            isOneToOne: false;
            referencedRelation: "recetas";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plan_comidas_usuario_id_fkey";
            columns: ["usuario_id"];
            isOneToOne: false;
            referencedRelation: "usuarios";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      dificultad_receta: DificultadReceta;
      fuente_tipo_receta: FuenteTipoReceta;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}
