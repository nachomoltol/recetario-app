-- ==============================================================================
-- MIGRACIÓN: Bypass seguro y RPCs atómicas para cuotas y créditos de anuncios
-- Migración: 20261116233000_fix_quotas_and_server_bypass.sql
-- ==============================================================================

-- 1. Actualizar el trigger de protección para soportar bypass controlado por el backend
CREATE OR REPLACE FUNCTION public.protect_sensitive_usuario_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Si el backend o una función SECURITY DEFINER ha marcado el bypass, permitir la operación
  IF current_setting('app.bypass_quota_protection', true) = 'true' THEN
    RETURN NEW;
  END IF;

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

-- 2. Función atómica para incrementar capturas de usuario y deducir crédito de anuncio
CREATE OR REPLACE FUNCTION public.increment_user_capturas(
  p_user_id UUID,
  p_use_ad_credit BOOLEAN DEFAULT false,
  p_device_id TEXT DEFAULT NULL
)
RETURNS TABLE (
  nuevo_conteo INTEGER,
  nuevo_creditos INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conteo INTEGER;
  v_creditos INTEGER;
BEGIN
  PERFORM set_config('app.bypass_quota_protection', 'true', true);

  UPDATE public.usuarios
  SET 
    capturas_mes_actual = COALESCE(capturas_mes_actual, 0) + 1,
    creditos_anuncio = CASE 
      WHEN p_use_ad_credit AND COALESCE(creditos_anuncio, 0) > 0 
      THEN COALESCE(creditos_anuncio, 0) - 1 
      ELSE COALESCE(creditos_anuncio, 0) 
    END,
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING capturas_mes_actual, creditos_anuncio INTO v_conteo, v_creditos;

  IF p_device_id IS NOT NULL AND LENGTH(TRIM(p_device_id)) >= 6 
     AND p_device_id NOT IN ('web_unknown', 'server_fallback') THEN
    INSERT INTO public.dispositivos_cuotas (
      device_id,
      capturas_mes_actual,
      fecha_ultimo_reinicio,
      antiguedad_ciclos_mes,
      primer_usuario_id,
      created_at,
      updated_at
    )
    VALUES (
      p_device_id,
      1,
      NOW(),
      0,
      p_user_id,
      NOW(),
      NOW()
    )
    ON CONFLICT (device_id) DO UPDATE
    SET 
      capturas_mes_actual = COALESCE(dispositivos_cuotas.capturas_mes_actual, 0) + 1,
      updated_at = NOW();
  END IF;

  RETURN QUERY SELECT v_conteo, v_creditos;
END;
$$;

-- 3. Función atómica para acreditar saldo de anuncio bonificado
CREATE OR REPLACE FUNCTION public.claim_ad_reward_credit(
  p_user_id UUID
)
RETURNS TABLE (
  nuevo_saldo INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_saldo INTEGER;
  v_plan TEXT;
  v_capturas INTEGER;
BEGIN
  PERFORM set_config('app.bypass_quota_protection', 'true', true);

  SELECT plan_suscripcion, COALESCE(capturas_mes_actual, 0), COALESCE(creditos_anuncio, 0)
  INTO v_plan, v_capturas, v_saldo
  FROM public.usuarios
  WHERE id = p_user_id;

  IF v_plan = 'pro' THEN
    RAISE EXCEPTION 'Los usuarios PRO disfrutan de extracción directa sin necesidad de anuncios.';
  END IF;

  IF v_capturas >= 20 THEN
    RAISE EXCEPTION 'Has alcanzado el límite mensual de 20 recetas gratis.';
  END IF;

  IF v_saldo >= 2 THEN
    RAISE EXCEPTION 'Ya dispones de créditos de anuncio activos. Consúmelos antes de acumular más.';
  END IF;

  UPDATE public.usuarios
  SET 
    creditos_anuncio = v_saldo + 1,
    solicitud_recarga_pc = false,
    solicitud_recarga_pc_at = NULL,
    solicitud_recarga_url = NULL,
    updated_at = NOW()
  WHERE id = p_user_id
  RETURNING creditos_anuncio INTO v_saldo;

  RETURN QUERY SELECT v_saldo;
END;
$$;

-- 4. Función atómica para reinicio mensual seguro
CREATE OR REPLACE FUNCTION public.reset_monthly_user_quotas(
  p_user_id UUID,
  p_new_cycles INTEGER,
  p_device_id TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM set_config('app.bypass_quota_protection', 'true', true);

  UPDATE public.usuarios
  SET
    capturas_mes_actual = 0,
    creditos_anuncio = 0,
    antiguedad_ciclos_mes = p_new_cycles,
    fecha_ultimo_reinicio = NOW(),
    updated_at = NOW()
  WHERE id = p_user_id;

  IF p_device_id IS NOT NULL AND LENGTH(TRIM(p_device_id)) >= 6
     AND p_device_id NOT IN ('web_unknown', 'server_fallback') THEN
    UPDATE public.dispositivos_cuotas
    SET
      capturas_mes_actual = 0,
      antiguedad_ciclos_mes = p_new_cycles,
      fecha_ultimo_reinicio = NOW(),
      updated_at = NOW()
    WHERE device_id = p_device_id;
  END IF;
END;
$$;

-- 5. Permisos de ejecución
GRANT EXECUTE ON FUNCTION public.increment_user_capturas(UUID, BOOLEAN, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.claim_ad_reward_credit(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reset_monthly_user_quotas(UUID, INTEGER, TEXT) TO authenticated, service_role;
