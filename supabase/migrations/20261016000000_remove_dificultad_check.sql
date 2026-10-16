-- Reversión de constraint de dificultad para admitir texto libre e internacionalización
ALTER TABLE public.recetas DROP CONSTRAINT IF EXISTS recetas_dificultad_check;
