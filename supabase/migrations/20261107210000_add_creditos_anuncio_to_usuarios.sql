-- Migration: Add creditos_anuncio to usuarios for cross-device AdMob balance
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS creditos_anuncio integer DEFAULT 0;

COMMENT ON COLUMN public.usuarios.creditos_anuncio IS 'Saldo de créditos bonificados acumulados por visualización de anuncios AdMob para generar recetas gratis';

-- RPC para incremento atómico de créditos por anuncio
CREATE OR REPLACE FUNCTION public.increment_creditos_anuncio(p_user_id uuid, p_amount integer DEFAULT 1)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_nuevo_saldo integer;
BEGIN
  UPDATE public.usuarios
  SET creditos_anuncio = COALESCE(creditos_anuncio, 0) + p_amount,
      updated_at = NOW()
  WHERE id = p_user_id
  RETURNING creditos_anuncio INTO v_nuevo_saldo;

  RETURN COALESCE(v_nuevo_saldo, 0);
END;
$$;
