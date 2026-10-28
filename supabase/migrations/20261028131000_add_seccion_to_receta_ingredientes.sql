-- Add seccion column to receta_ingredientes
ALTER TABLE public.receta_ingredientes ADD COLUMN IF NOT EXISTS seccion text;
COMMENT ON COLUMN public.receta_ingredientes.seccion IS 'Subreceta o sección funcional: Principal, Salsa, Guarnición, Masa, Relleno, etc.';
