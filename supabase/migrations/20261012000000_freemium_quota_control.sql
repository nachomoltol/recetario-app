-- Migración para control de cuotas Freemium en la tabla usuarios
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS plan_suscripcion TEXT NOT NULL DEFAULT 'gratis' CHECK (plan_suscripcion IN ('gratis', 'pro')),
ADD COLUMN IF NOT EXISTS capturas_mes_actual INTEGER NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS fecha_ultimo_reinicio TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
