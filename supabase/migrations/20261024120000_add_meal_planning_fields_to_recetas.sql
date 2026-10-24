-- ==============================================================================
-- MIGRACIÓN: Añadir campos de planificación de menús y momentos del día a recetas
-- ==============================================================================

-- 1. Añadir columnas a public.recetas
ALTER TABLE public.recetas
ADD COLUMN IF NOT EXISTS momentos_dia TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS rol_plato TEXT DEFAULT 'completo',
ADD COLUMN IF NOT EXISTS es_favorito_menu BOOLEAN DEFAULT false;

-- 2. Restricción CHECK para rol_plato ('completo', 'primero', 'segundo', 'desayuno_snack')
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'recetas_rol_plato_check'
    ) THEN
        ALTER TABLE public.recetas
        ADD CONSTRAINT recetas_rol_plato_check
        CHECK (rol_plato IN ('completo', 'primero', 'segundo', 'desayuno_snack'));
    END IF;
END $$;

-- 3. Índice GIN para búsquedas eficientes en arrays de momentos_dia
CREATE INDEX IF NOT EXISTS idx_recetas_momentos_dia ON public.recetas USING GIN (momentos_dia);

-- 4. Índices para acelerar filtrados de menú semanal por rol de plato y recetas destacadas
CREATE INDEX IF NOT EXISTS idx_recetas_rol_plato ON public.recetas(rol_plato);
CREATE INDEX IF NOT EXISTS idx_recetas_es_favorito_menu ON public.recetas(es_favorito_menu);

COMMENT ON COLUMN public.recetas.momentos_dia IS 'Array de momentos recomendados del día (ej: desayuno, almuerzo, cena, snack)';
COMMENT ON COLUMN public.recetas.rol_plato IS 'Rol culinario en el menú: completo, primero, segundo, desayuno_snack';
COMMENT ON COLUMN public.recetas.es_favorito_menu IS 'Indica si la receta está marcada como favorita para selección en planificador de menús';
