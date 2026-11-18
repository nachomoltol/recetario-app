-- Migración: Eximir usuarios PRO del incremento de cuota en dispositivos_cuotas
-- Fecha: 18 de Noviembre de 2026

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
  v_plan TEXT;
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
  RETURNING capturas_mes_actual, creditos_anuncio, plan_suscripcion INTO v_conteo, v_creditos, v_plan;

  -- Solo incrementar cuota de dispositivo para usuarios FREE (no PRO)
  IF COALESCE(v_plan, 'gratis') != 'pro' AND p_device_id IS NOT NULL AND LENGTH(TRIM(p_device_id)) >= 6 
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
