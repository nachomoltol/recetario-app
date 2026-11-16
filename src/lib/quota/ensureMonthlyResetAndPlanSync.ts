import { getAdminClient } from '@/lib/supabase/server';
import Stripe from 'stripe';

export interface SyncResult {
  usuario: {
    id: string;
    plan_suscripcion: 'gratis' | 'pro';
    capturas_mes_actual: number;
    creditos_anuncio: number;
    antiguedad_ciclos_mes: number;
    fecha_ultimo_reinicio: string;
    pro_expires_at: string | null;
    stripe_subscription_id: string | null;
  } | null;
  wasReset: boolean;
  wasDowngraded: boolean;
}

/**
 * Comprueba si la fecha del último reinicio corresponde a un mes anterior
 * respecto a la fecha actual del sistema.
 */
export function isNewMonth(lastResetDateStr: string | null | undefined): boolean {
  if (!lastResetDateStr) return false;
  const lastReset = new Date(lastResetDateStr);
  const now = new Date();
  if (isNaN(lastReset.getTime())) return false;
  return (
    now.getFullYear() > lastReset.getFullYear() ||
    now.getMonth() > lastReset.getMonth()
  );
}

/**
 * Sincroniza atómicamente el estado del usuario:
 * 1. Reinicio mensual de capturas y créditos de anuncio al cambiar de mes.
 * 2. Comprobación de caducidad y estado en Stripe para usuarios PRO.
 * 3. Ejecución segura mediante cliente administrativo con service_role.
 */
export async function ensureMonthlyResetAndPlanSync(
  userId: string,
  deviceId?: string | null
): Promise<SyncResult> {
  const adminClient = getAdminClient();
  if (!adminClient) {
    console.warn(
      '[ensureMonthlyResetAndPlanSync] adminClient no disponible (falta SUPABASE_SERVICE_ROLE_KEY). Omitiendo sync administrativa.'
    );
    return { usuario: null, wasReset: false, wasDowngraded: false };
  }

  try {
    // 1. Obtener estado actual del usuario
    const { data: usuario, error } = await adminClient
      .from('usuarios')
      .select(
        'id, plan_suscripcion, capturas_mes_actual, creditos_anuncio, antiguedad_ciclos_mes, fecha_ultimo_reinicio, pro_expires_at, stripe_subscription_id'
      )
      .eq('id', userId)
      .single();

    if (error || !usuario) {
      console.warn('[ensureMonthlyResetAndPlanSync] No se pudo obtener el usuario:', error?.message);
      return { usuario: null, wasReset: false, wasDowngraded: false };
    }

    const now = new Date();
    let wasReset = false;
    let wasDowngraded = false;

    let currentPlan: 'gratis' | 'pro' = usuario.plan_suscripcion ?? 'gratis';
    let currentCapturas = Number(usuario.capturas_mes_actual) || 0;
    let currentCreditos = Number(usuario.creditos_anuncio) || 0;
    let currentCiclos = Number(usuario.antiguedad_ciclos_mes) || 0;
    let currentFechaReinicio = usuario.fecha_ultimo_reinicio || now.toISOString();
    let currentProExpiresAt = usuario.pro_expires_at || null;

    // 2. Control de Reinicio Mensual
    if (usuario.fecha_ultimo_reinicio && isNewMonth(usuario.fecha_ultimo_reinicio)) {
      wasReset = true;
      currentCiclos += 1;
      currentCapturas = 0;
      currentCreditos = 0; // Créditos de anuncio caducan con el ciclo mensual
      currentFechaReinicio = now.toISOString();

      console.log(
        `[ensureMonthlyResetAndPlanSync] Reinicio mensual aplicado para ${userId} (ciclo ${currentCiclos}).`
      );

      // Reiniciar también cuota de dispositivo físico si se proporciona
      if (deviceId && deviceId.trim().length >= 6) {
        await adminClient
          .from('dispositivos_cuotas')
          .update({
            capturas_mes_actual: 0,
            antiguedad_ciclos_mes: currentCiclos,
            fecha_ultimo_reinicio: currentFechaReinicio,
            updated_at: now.toISOString(),
          })
          .eq('device_id', deviceId);
      }
    } else if (!usuario.fecha_ultimo_reinicio) {
      currentFechaReinicio = now.toISOString();
      currentCiclos = 0;
    }

    // 3. Control de Caducidad y Verificación PRO
    if (currentPlan === 'pro') {
      let shouldCheckStripe = false;

      if (currentProExpiresAt) {
        const expiresAt = new Date(currentProExpiresAt);
        if (expiresAt < now) {
          shouldCheckStripe = true;
        }
      } else {
        // Usuario PRO sin fecha de expiración registrada: consultar Stripe para poblarla
        shouldCheckStripe = true;
      }

      if (shouldCheckStripe) {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
        if (stripeSecretKey && usuario.stripe_subscription_id) {
          try {
            const stripe = new Stripe(stripeSecretKey);
            const sub = await stripe.subscriptions.retrieve(usuario.stripe_subscription_id);

            if (sub && (sub.status === 'active' || sub.status === 'trialing')) {
              // Suscripción renovada o vigente en Stripe
              currentProExpiresAt = new Date((sub as any).current_period_end * 1000).toISOString();
            } else {
              // Suscripción cancelada, impagada o no activa
              currentPlan = 'gratis';
              currentProExpiresAt = null;
              wasDowngraded = true;
              console.log(
                `[ensureMonthlyResetAndPlanSync] Usuario PRO ${userId} degradado a GRATIS: suscripción no activa (${sub?.status}).`
              );
            }
          } catch (stripeErr) {
            console.warn(
              `[ensureMonthlyResetAndPlanSync] Error consultando suscripción Stripe ${usuario.stripe_subscription_id}:`,
              stripeErr
            );
            if (currentProExpiresAt && new Date(currentProExpiresAt) < now) {
              currentPlan = 'gratis';
              currentProExpiresAt = null;
              wasDowngraded = true;
            }
          }
        } else if (currentProExpiresAt && new Date(currentProExpiresAt) < now) {
          // Expirado y sin suscripción de Stripe activa
          currentPlan = 'gratis';
          currentProExpiresAt = null;
          wasDowngraded = true;
          console.log(
            `[ensureMonthlyResetAndPlanSync] Usuario PRO ${userId} degradado a GRATIS por expiración de periodo.`
          );
        }
      }
    }

    // 4. Persistir cambios si hubo reseteo, degradación o actualización de fechas
    const needsUpdate =
      wasReset ||
      wasDowngraded ||
      currentFechaReinicio !== usuario.fecha_ultimo_reinicio ||
      currentProExpiresAt !== usuario.pro_expires_at ||
      currentPlan !== usuario.plan_suscripcion;

    if (needsUpdate) {
      await adminClient
        .from('usuarios')
        .update({
          plan_suscripcion: currentPlan,
          capturas_mes_actual: currentCapturas,
          creditos_anuncio: currentCreditos,
          antiguedad_ciclos_mes: currentCiclos,
          fecha_ultimo_reinicio: currentFechaReinicio,
          pro_expires_at: currentProExpiresAt,
          updated_at: now.toISOString(),
        })
        .eq('id', userId);
    }

    return {
      usuario: {
        id: userId,
        plan_suscripcion: currentPlan,
        capturas_mes_actual: currentCapturas,
        creditos_anuncio: currentCreditos,
        antiguedad_ciclos_mes: currentCiclos,
        fecha_ultimo_reinicio: currentFechaReinicio,
        pro_expires_at: currentProExpiresAt,
        stripe_subscription_id: usuario.stripe_subscription_id ?? null,
      },
      wasReset,
      wasDowngraded,
    };
  } catch (err) {
    console.error('[ensureMonthlyResetAndPlanSync] Error inesperado:', err);
    return { usuario: null, wasReset: false, wasDowngraded: false };
  }
}
