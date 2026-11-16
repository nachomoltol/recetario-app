-- ==============================================================================
-- MIGRACIÓN: Blindaje RLS Usuarios, Caducidad PRO y Cron Sincronizado
-- Migración: 20261116230000_security_pro_expiration_and_quotas.sql
-- ==============================================================================

-- 1. Añadir columna pro_expires_at a public.usuarios
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_usuarios_pro_expires_at 
ON public.usuarios(pro_expires_at) 
WHERE pro_expires_at IS NOT NULL;

COMMENT ON COLUMN public.usuarios.pro_expires_at IS 'Fecha y hora exacta de vencimiento del periodo pagado de suscripción PRO (sincronizada desde Stripe current_period_end)';

-- 2. Trigger de protección contra auto-modificación de columnas sensibles desde cliente autenticado
CREATE OR REPLACE FUNCTION public.protect_sensitive_usuario_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo interceptar si la petición proviene de un cliente con rol 'authenticated' (RLS / Supabase Client)
  -- service_role omite esta restricción porque current_setting('request.jwt.claim.role', true) es 'service_role' o NULL
  IF current_setting('request.jwt.claim.role', true) = 'authenticated' THEN
    IF (
      NEW.plan_suscripcion IS DISTINCT FROM OLD.plan_suscripcion OR
      NEW.capturas_mes_actual IS DISTINCT FROM OLD.capturas_mes_actual OR
      NEW.creditos_anuncio IS DISTINCT FROM OLD.creditos_anuncio OR
      NEW.antiguedad_ciclos_mes IS DISTINCT FROM OLD.antiguedad_ciclos_mes OR
      NEW.stripe_customer_id IS DISTINCT FROM OLD.stripe_customer_id OR
      NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id OR
      NEW.pro_expires_at IS DISTINCT FROM OLD.pro_expires_at
    ) THEN
      RAISE EXCEPTION 'Operación no permitida: las columnas de cuotas, suscripción y facturación solo pueden ser modificadas por el backend.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_sensitive_usuario_columns ON public.usuarios;
CREATE TRIGGER trg_protect_sensitive_usuario_columns
BEFORE UPDATE ON public.usuarios
FOR EACH ROW
EXECUTE FUNCTION public.protect_sensitive_usuario_columns();

-- 3. Revocar permiso de ejecución pública sobre increment_creditos_anuncio (solo service_role)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'increment_creditos_anuncio' 
      AND pronamespace = 'public'::regnamespace
  ) THEN
    REVOKE EXECUTE ON FUNCTION public.increment_creditos_anuncio(uuid) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.increment_creditos_anuncio(uuid) TO service_role;
  END IF;
END $$;

-- 4. Actualizar pg_cron para reinicio mensual y degradación automática de PRO expirados
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('miga-reset-monthly-quotas');
    
    PERFORM cron.schedule(
      'miga-reset-monthly-quotas',
      '0 0 1 * *',
      $cron$
        -- 1. Reiniciar cuotas y créditos de anuncios
        UPDATE public.usuarios
        SET 
          capturas_mes_actual = 0,
          creditos_anuncio = 0,
          antiguedad_ciclos_mes = COALESCE(antiguedad_ciclos_mes, 0) + 1,
          fecha_ultimo_reinicio = CURRENT_DATE,
          updated_at = NOW();

        UPDATE public.dispositivos_cuotas
        SET
          capturas_mes_actual = 0,
          antiguedad_ciclos_mes = COALESCE(antiguedad_ciclos_mes, 0) + 1,
          fecha_ultimo_reinicio = CURRENT_DATE,
          updated_at = NOW();

        -- 2. Degradar suscripciones PRO expiradas
        UPDATE public.usuarios
        SET
          plan_suscripcion = 'gratis',
          pro_expires_at = NULL,
          updated_at = NOW()
        WHERE plan_suscripcion = 'pro'
          AND pro_expires_at IS NOT NULL
          AND pro_expires_at < NOW();
      $cron$
    );
  END IF;
END $$;
