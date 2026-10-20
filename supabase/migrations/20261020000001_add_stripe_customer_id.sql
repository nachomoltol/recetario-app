-- Migración: Añadir identificadores de cliente y suscripción de Stripe para gestión de cancelaciones
ALTER TABLE public.usuarios
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;

CREATE INDEX IF NOT EXISTS idx_usuarios_stripe_customer_id ON public.usuarios(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_stripe_subscription_id ON public.usuarios(stripe_subscription_id);
