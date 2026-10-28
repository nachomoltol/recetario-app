-- Add rol_culinario column to receta_ingredientes
ALTER TABLE public.receta_ingredientes ADD COLUMN IF NOT EXISTS rol_culinario text;
COMMENT ON COLUMN public.receta_ingredientes.rol_culinario IS 'Rol culinario para escalado amortiguado: principal, sofrito_base, guarnicion, grasa_coccion, condimento, invariable';
