-- Migration: Add instruccion_principiante to pasos for Phase 2.1 pedagogical calibration
ALTER TABLE public.pasos ADD COLUMN IF NOT EXISTS instruccion_principiante text;

COMMENT ON COLUMN public.pasos.instruccion_principiante IS 'Redacción pedagógica paso a paso con advertencias térmicas y precauciones claras para nivel Principiante (PRO)';

NOTIFY pgrst, 'reload schema';

