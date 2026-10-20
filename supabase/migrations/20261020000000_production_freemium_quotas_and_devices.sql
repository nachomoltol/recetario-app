-- ==============================================================================
-- MIGRACIÓN: MODELO FREEMIUM/PREMIUM DEFINITIVO Y ANTI-FRAUDE DE DISPOSITIVOS
-- Fecha: 2026-10-20
-- ==============================================================================

-- 1. Añadir columna antiguedad_ciclos_mes a la tabla usuarios
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS antiguedad_ciclos_mes INTEGER NOT NULL DEFAULT 0;

-- 2. Crear tabla dispositivos_cuotas para rastrear cuotas por dispositivo físico
CREATE TABLE IF NOT EXISTS public.dispositivos_cuotas (
  device_id TEXT PRIMARY KEY,
  capturas_mes_actual INTEGER NOT NULL DEFAULT 0,
  fecha_ultimo_reinicio TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  antiguedad_ciclos_mes INTEGER NOT NULL DEFAULT 0,
  primer_usuario_id UUID REFERENCES public.usuarios(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS en dispositivos_cuotas
ALTER TABLE public.dispositivos_cuotas ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para dispositivos_cuotas
DROP POLICY IF EXISTS "Permitir lectura de dispositivos a usuarios autenticados" ON public.dispositivos_cuotas;
CREATE POLICY "Permitir lectura de dispositivos a usuarios autenticados"
  ON public.dispositivos_cuotas
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Permitir insercion y actualizacion de dispositivos a usuarios autenticados" ON public.dispositivos_cuotas;
CREATE POLICY "Permitir insercion y actualizacion de dispositivos a usuarios autenticados"
  ON public.dispositivos_cuotas
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 3. Configurar pg_cron para el reinicio automático el día 1 de cada mes a las 00:00 UTC
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    BEGIN
      PERFORM cron.unschedule('miga-reset-monthly-quotas')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'miga-reset-monthly-quotas');
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;

    BEGIN
      PERFORM cron.schedule(
        'miga-reset-monthly-quotas',
        '0 0 1 * *',
        $cron$
          UPDATE public.usuarios
          SET capturas_mes_actual = 0,
              antiguedad_ciclos_mes = antiguedad_ciclos_mes + 1,
              fecha_ultimo_reinicio = timezone('utc'::text, now());

          UPDATE public.dispositivos_cuotas
          SET capturas_mes_actual = 0,
              antiguedad_ciclos_mes = antiguedad_ciclos_mes + 1,
              fecha_ultimo_reinicio = timezone('utc'::text, now());
        $cron$
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Aviso de programación pg_cron: %', SQLERRM;
    END;
  END IF;
END
$$;
