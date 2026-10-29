-- Migration: Add culinary level fields to pasos
ALTER TABLE public.pasos ADD COLUMN IF NOT EXISTS instruccion_avanzada text;
ALTER TABLE public.pasos ADD COLUMN IF NOT EXISTS descriptor_sensorial text;
ALTER TABLE public.pasos ADD COLUMN IF NOT EXISTS potencia_fuego text;

COMMENT ON COLUMN public.pasos.instruccion_avanzada IS 'Instrucción técnica y sintética para nivel Avanzado';
COMMENT ON COLUMN public.pasos.descriptor_sensorial IS 'Pistas visuales, de aroma o textura para nivel Principiante';
COMMENT ON COLUMN public.pasos.potencia_fuego IS 'Potencia de fuego o calor: suave, medio, medio-alto, alto, horno';

NOTIFY pgrst, 'reload schema';
