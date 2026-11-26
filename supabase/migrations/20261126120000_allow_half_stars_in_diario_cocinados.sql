-- Permitir medias estrellas (0.5 a 5.0 en incrementos de 0.5) en diario_cocinados.calificacion
-- Mantiene compatibilidad total con los registros enteros existentes (1 a 5) y valores NULL.

ALTER TABLE public.diario_cocinados
  DROP CONSTRAINT IF EXISTS diario_cocinados_calificacion_check;

ALTER TABLE public.diario_cocinados
  ALTER COLUMN calificacion TYPE numeric(2,1) USING calificacion::numeric(2,1);

ALTER TABLE public.diario_cocinados
  ADD CONSTRAINT diario_cocinados_calificacion_check
  CHECK (
    calificacion IS NULL
    OR (
      calificacion >= 0.5
      AND calificacion <= 5.0
      AND (calificacion * 2) = round(calificacion * 2)
    )
  );
