-- ==============================================================================
-- Migración: Añadir 'postre' a la restricción CHECK de rol_plato en public.recetas
-- ==============================================================================

ALTER TABLE public.recetas DROP CONSTRAINT IF EXISTS recetas_rol_plato_check;

ALTER TABLE public.recetas
ADD CONSTRAINT recetas_rol_plato_check
CHECK (rol_plato IN ('completo', 'primero', 'segundo', 'desayuno_snack', 'postre'));

COMMENT ON COLUMN public.recetas.rol_plato IS 'Rol culinario en el menú: completo, primero, segundo, desayuno_snack, postre';
