-- ==============================================================================
-- RECETARIO INTELIGENTE - ESQUEMA DE BASE DE DATOS SUPABASE (POSTGRESQL)
-- Migración Inicial: 20261011000000_schema_recetario_init.sql
-- ==============================================================================

-- 0. EXTENSIONES REQUERIDAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ------------------------------------------------------------------------------
-- 1. TABLA: usuarios (Perfiles vinculados a auth.users)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    nombre TEXT,
    avatar_url TEXT,
    preferencias_dieteticas TEXT[] DEFAULT '{}', -- Ej: ['mediterranea', 'vegetariana', 'keto', 'alta_proteina']
    alergenos TEXT[] DEFAULT '{}',              -- Ej: ['gluten', 'lactosa', 'frutos_secos', 'mariscos']
    objetivo_calorico_diario INTEGER,           -- Objetivo calórico opcional
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.usuarios IS 'Perfiles de usuario extendidos sincronizados con Supabase Auth';

-- ------------------------------------------------------------------------------
-- 2. TABLA: ingredientes_maestro (Diccionario clínico y nutricional canónico)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ingredientes_maestro (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL UNIQUE,
    nombre_normalizado TEXT NOT NULL,           -- Minúsculas y sin tildes para búsqueda indexada
    categoria TEXT NOT NULL,                     -- 'carnes', 'verduras', 'lacteos', 'grasas_aceites', 'cereales', etc.
    
    -- Perfil de macronutrientes por cada 100 gramos
    calorias_por_100g NUMERIC(6,2) NOT NULL DEFAULT 0,
    proteinas_por_100g NUMERIC(5,2) NOT NULL DEFAULT 0,
    carbohidratos_por_100g NUMERIC(5,2) NOT NULL DEFAULT 0,
    grasas_por_100g NUMERIC(5,2) NOT NULL DEFAULT 0,
    fibra_por_100g NUMERIC(5,2) DEFAULT 0,
    sodio_mg_por_100g NUMERIC(6,2) DEFAULT 0,
    
    -- Factor de densidad para conversión volumétrica (gramos por mililitro)
    -- Ejemplos: Agua/Leche = 1.0, Aceite = 0.92, Harina = 0.53, Miel = 1.42
    densidad_g_ml NUMERIC(4,3) NOT NULL DEFAULT 1.000,
    peso_unidad_promedio_g NUMERIC(6,2),         -- Para unidades discretas (ej. 1 huevo = 55g)
    
    -- Atributos para salud y sustituciones inteligentes
    es_ultraprocesado BOOLEAN NOT NULL DEFAULT false,
    alergenos TEXT[] DEFAULT '{}',               -- ['gluten', 'lactosa', 'huevo', etc.]
    sustitutos_saludables_ids UUID[] DEFAULT '{}', -- Referencias a otros ingredientes más saludables
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.ingredientes_maestro IS 'Catálogo maestro de ingredientes con densidad volumétrica y perfil macro';

-- ------------------------------------------------------------------------------
-- 3. TABLA: recetas (Entidad principal de recetas)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.recetas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    imagen_portada_url TEXT,
    
    -- Tiempos y rendimientos
    tiempo_preparacion_min INTEGER DEFAULT 0,
    tiempo_coccion_min INTEGER DEFAULT 0,
    tiempo_total_min INTEGER GENERATED ALWAYS AS (COALESCE(tiempo_preparacion_min, 0) + COALESCE(tiempo_coccion_min, 0)) STORED,
    porciones INTEGER NOT NULL DEFAULT 2 CHECK (porciones > 0),
    dificultad TEXT NOT NULL DEFAULT 'media' CHECK (dificultad IN ('facil', 'media', 'dificil', 'experto')),
    
    -- Origen multicanal
    fuente_tipo TEXT NOT NULL DEFAULT 'manual' CHECK (fuente_tipo IN ('manual', 'tiktok', 'instagram', 'youtube', 'audio', 'foto_manuscrita', 'pdf', 'web')),
    fuente_url TEXT,                            -- Enlace original si provino de redes o web
    
    -- Perfil nutricional consolidado por porción
    calorias_por_porcion NUMERIC(6,2) DEFAULT 0,
    proteinas_por_porcion NUMERIC(5,2) DEFAULT 0,
    carbohidratos_por_porcion NUMERIC(5,2) DEFAULT 0,
    grasas_por_porcion NUMERIC(5,2) DEFAULT 0,
    fibra_por_porcion NUMERIC(5,2) DEFAULT 0,
    
    -- Metadatos y taxonomía
    es_favorita BOOLEAN NOT NULL DEFAULT false,
    es_publica BOOLEAN NOT NULL DEFAULT false,
    etiquetas TEXT[] DEFAULT '{}',               -- ['cena_rapida', 'keto', 'mediterranea']
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.recetas IS 'Recetas guardadas con su metadata, origen multicanal y perfil por porción';

-- ------------------------------------------------------------------------------
-- 4. TABLA: receta_ingredientes (Composición desagregada de la receta)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.receta_ingredientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receta_id UUID NOT NULL REFERENCES public.recetas(id) ON DELETE CASCADE,
    ingrediente_maestro_id UUID REFERENCES public.ingredientes_maestro(id) ON DELETE SET NULL,
    
    nombre_crudo TEXT NOT NULL,                  -- Texto original extraído (ej: "2 cdas de aceite de oliva")
    nombre_limpio TEXT NOT NULL,                 -- Nombre canónico o limpio (ej: "Aceite de oliva virgen extra")
    cantidad NUMERIC(8,2) NOT NULL DEFAULT 1,    -- Cantidad numérica (ej: 2)
    unidad TEXT NOT NULL DEFAULT 'unidad',       -- 'g', 'ml', 'cucharada', 'cucharadita', 'taza', 'unidad', 'pizca'
    
    -- Peso neto calculado tras conversión volumétrica por densidad
    gramos_calculados NUMERIC(8,2) NOT NULL DEFAULT 0,
    
    notas TEXT,                                  -- Ej: "a temperatura ambiente", "cortado en cubos"
    es_opcional BOOLEAN NOT NULL DEFAULT false,
    orden INTEGER NOT NULL DEFAULT 1,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.receta_ingredientes IS 'Ingredientes específicos vinculados a cada receta con cálculo en gramos';

-- ------------------------------------------------------------------------------
-- 5. TABLA: pasos (Instrucciones secuenciales de cocinado)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pasos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receta_id UUID NOT NULL REFERENCES public.recetas(id) ON DELETE CASCADE,
    orden INTEGER NOT NULL CHECK (orden > 0),
    instruccion TEXT NOT NULL,
    
    -- Metadatos de asistencia culinaria
    tiempo_estimado_min INTEGER,
    temperatura_celsius INTEGER,
    utensilios_sugeridos TEXT[] DEFAULT '{}',   -- ['sarten_hierro', 'horno', 'batidora']
    consejo_pro TEXT,                           -- Tips del chef / IA para elevar el resultado
    imagen_paso_url TEXT,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_receta_paso_orden UNIQUE (receta_id, orden)
);

COMMENT ON TABLE public.pasos IS 'Secuencia ordenada de instrucciones para elaborar el plato';

-- ------------------------------------------------------------------------------
-- 6. TABLA: diario_cocinados (Registro empírico y fotografía real del resultado)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.diario_cocinados (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receta_id UUID NOT NULL REFERENCES public.recetas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
    
    fecha_cocinado TIMESTAMPTZ NOT NULL DEFAULT now(),
    foto_resultado_url TEXT NOT NULL,            -- Fotografía propia del usuario del resultado final
    calificacion INTEGER CHECK (calificacion BETWEEN 1 AND 5), -- 1 a 5 estrellas
    notas_cocinero TEXT,                         -- Impresiones: sabor, textura, puntos a mejorar
    modificaciones_realizadas TEXT,              -- Variaciones aplicadas respecto a la receta original
    tiempo_empleado_min INTEGER,
    porciones_preparadas INTEGER,
    
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.diario_cocinados IS 'Diario culinario visual con registros empíricos y fotos reales del usuario';

-- ==============================================================================
-- 7. ÍNDICES DE RENDIMIENTO Y BÚSQUEDA
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON public.usuarios(email);
CREATE INDEX IF NOT EXISTS idx_ingredientes_maestro_normalizado ON public.ingredientes_maestro USING gin (nombre_normalizado gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_ingredientes_maestro_categoria ON public.ingredientes_maestro(categoria);

CREATE INDEX IF NOT EXISTS idx_recetas_usuario ON public.recetas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_recetas_fuente_tipo ON public.recetas(fuente_tipo);
CREATE INDEX IF NOT EXISTS idx_recetas_favorita ON public.recetas(usuario_id, es_favorita);
CREATE INDEX IF NOT EXISTS idx_recetas_etiquetas ON public.recetas USING gin(etiquetas);

CREATE INDEX IF NOT EXISTS idx_receta_ingredientes_receta ON public.receta_ingredientes(receta_id);
CREATE INDEX IF NOT EXISTS idx_receta_ingredientes_maestro ON public.receta_ingredientes(ingrediente_maestro_id);
CREATE INDEX IF NOT EXISTS idx_pasos_receta_orden ON public.pasos(receta_id, orden);

CREATE INDEX IF NOT EXISTS idx_diario_usuario ON public.diario_cocinados(usuario_id);
CREATE INDEX IF NOT EXISTS idx_diario_receta ON public.diario_cocinados(receta_id);
CREATE INDEX IF NOT EXISTS idx_diario_fecha ON public.diario_cocinados(usuario_id, fecha_cocinado DESC);

-- ==============================================================================
-- 8. TRIGGERS Y FUNCIONES AUTOMÁTICAS
-- ==============================================================================

-- Función genérica para actualizar 'updated_at'
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_usuarios_updated_at
BEFORE UPDATE ON public.usuarios
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_ingredientes_maestro_updated_at
BEFORE UPDATE ON public.ingredientes_maestro
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_recetas_updated_at
BEFORE UPDATE ON public.recetas
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE OR REPLACE TRIGGER trg_diario_cocinados_updated_at
BEFORE UPDATE ON public.diario_cocinados
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Sincronización automática de nuevo usuario registrado en auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.usuarios (id, email, nombre, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 9. SEGURIDAD: ROW LEVEL SECURITY (RLS)
-- ==============================================================================

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredientes_maestro ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recetas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receta_ingredientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pasos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diario_cocinados ENABLE ROW LEVEL SECURITY;

-- 9.1 Políticas para 'usuarios'
CREATE POLICY "Los usuarios pueden ver su propio perfil"
ON public.usuarios FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Los usuarios pueden actualizar su propio perfil"
ON public.usuarios FOR UPDATE
USING (auth.uid() = id);

-- 9.2 Políticas para 'ingredientes_maestro' (Catálogo de solo lectura para clientes autenticados)
CREATE POLICY "Cualquier usuario autenticado puede leer ingredientes maestro"
ON public.ingredientes_maestro FOR SELECT
TO authenticated
USING (true);

-- 9.3 Políticas para 'recetas'
CREATE POLICY "Los usuarios pueden ver sus recetas o las marcadas como públicas"
ON public.recetas FOR SELECT
USING (auth.uid() = usuario_id OR es_publica = true);

CREATE POLICY "Los usuarios pueden crear sus recetas"
ON public.recetas FOR INSERT
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden modificar sus recetas"
ON public.recetas FOR UPDATE
USING (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios pueden eliminar sus recetas"
ON public.recetas FOR DELETE
USING (auth.uid() = usuario_id);

-- 9.4 Políticas para 'receta_ingredientes' (Dependientes del propietario de la receta)
CREATE POLICY "Ver ingredientes de recetas accesibles"
ON public.receta_ingredientes FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.recetas r
        WHERE r.id = receta_ingredientes.receta_id
        AND (r.usuario_id = auth.uid() OR r.es_publica = true)
    )
);

CREATE POLICY "Insertar ingredientes en recetas propias"
ON public.receta_ingredientes FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.recetas r
        WHERE r.id = receta_ingredientes.receta_id
        AND r.usuario_id = auth.uid()
    )
);

CREATE POLICY "Modificar ingredientes de recetas propias"
ON public.receta_ingredientes FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.recetas r
        WHERE r.id = receta_ingredientes.receta_id
        AND r.usuario_id = auth.uid()
    )
);

CREATE POLICY "Eliminar ingredientes de recetas propias"
ON public.receta_ingredientes FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.recetas r
        WHERE r.id = receta_ingredientes.receta_id
        AND r.usuario_id = auth.uid()
    )
);

-- 9.5 Políticas para 'pasos' (Dependientes del propietario de la receta)
CREATE POLICY "Ver pasos de recetas accesibles"
ON public.pasos FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.recetas r
        WHERE r.id = pasos.receta_id
        AND (r.usuario_id = auth.uid() OR r.es_publica = true)
    )
);

CREATE POLICY "Insertar pasos en recetas propias"
ON public.pasos FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.recetas r
        WHERE r.id = pasos.receta_id
        AND r.usuario_id = auth.uid()
    )
);

CREATE POLICY "Modificar pasos de recetas propias"
ON public.pasos FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.recetas r
        WHERE r.id = pasos.receta_id
        AND r.usuario_id = auth.uid()
    )
);

CREATE POLICY "Eliminar pasos de recetas propias"
ON public.pasos FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.recetas r
        WHERE r.id = pasos.receta_id
        AND r.usuario_id = auth.uid()
    )
);

-- 9.6 Políticas para 'diario_cocinados'
CREATE POLICY "Los usuarios gestionan su propio diario culinario (SELECT)"
ON public.diario_cocinados FOR SELECT
USING (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios gestionan su propio diario culinario (INSERT)"
ON public.diario_cocinados FOR INSERT
WITH CHECK (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios gestionan su propio diario culinario (UPDATE)"
ON public.diario_cocinados FOR UPDATE
USING (auth.uid() = usuario_id);

CREATE POLICY "Los usuarios gestionan su propio diario culinario (DELETE)"
ON public.diario_cocinados FOR DELETE
USING (auth.uid() = usuario_id);
