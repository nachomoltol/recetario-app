-- ==============================================================================
-- Migración: Añadir 'porciones' a public.plan_comidas
-- Permite almacenar los comensales específicos asignados a cada comida
-- ==============================================================================

ALTER TABLE public.plan_comidas
ADD COLUMN IF NOT EXISTS porciones INTEGER DEFAULT 2;

COMMENT ON COLUMN public.plan_comidas.porciones IS 'Número de comensales/porciones asignadas a este slot';
