-- ==============================================================================
-- MIGRACIÓN FASE 1.75: Corrección Guardado Diario y 5 Slots Plan Semanal
-- ==============================================================================

-- 1. Permitir guardar valoraciones, notas y modificaciones sin foto obligatoria
ALTER TABLE public.diario_cocinados 
ALTER COLUMN foto_resultado_url DROP NOT NULL;

-- 2. Actualizar el CHECK constraint de 'slot' en 'plan_comidas'
-- Nueva estructura requerida:
-- a) Desayuno: 'desayuno'
-- b) Almuerzo (1er plato): 'almuerzo_1'
-- c) Almuerzo (2do plato): 'almuerzo_2'
-- d) Cena: 'cena'
-- e) Snack / Postre: 'snack_postre'
ALTER TABLE public.plan_comidas 
DROP CONSTRAINT IF EXISTS plan_comidas_slot_check;

ALTER TABLE public.plan_comidas 
ADD CONSTRAINT plan_comidas_slot_check
CHECK (slot = ANY (ARRAY[
  'desayuno'::text, 
  'almuerzo_1'::text, 
  'almuerzo_2'::text, 
  'cena'::text, 
  'snack_postre'::text, 
  'almuerzo'::text, 
  'snack'::text
]));

-- 3. Migración de datos existentes al nuevo esquema de slots
UPDATE public.plan_comidas SET slot = 'almuerzo_1' WHERE slot = 'almuerzo';
UPDATE public.plan_comidas SET slot = 'snack_postre' WHERE slot = 'snack';
