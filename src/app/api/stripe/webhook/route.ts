import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export const dynamic = 'force-dynamic';

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey || serviceRoleKey.includes('tu-service-role-key')) {
    console.error('Faltan variables de entorno de Supabase Service Role válidas para el webhook.');
    return null;
  }

  return createAdminClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    global: {
      fetch: (url, options) => fetch(url, { ...options, cache: 'no-store' }),
    },
  });
}

export async function POST(req: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey || !webhookSecret) {
    console.error('Faltan variables de entorno de Stripe en el webhook.');
    return NextResponse.json(
      { error: 'Configuración de Webhook de Stripe no disponible.' },
      { status: 500 }
    );
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json(
      { error: 'Cabecera stripe-signature no encontrada.' },
      { status: 400 }
    );
  }

  const rawBody = await req.text();
  const stripe = new Stripe(stripeSecretKey);

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Firma de webhook inválida';
    console.error('Error al verificar firma de Stripe webhook:', errorMessage);
    return NextResponse.json(
      { error: `Firma inválida: ${errorMessage}` },
      { status: 400 }
    );
  }

  const adminClient = getAdminClient();
  if (!adminClient) {
    return NextResponse.json(
      { error: 'Error de configuración de Supabase en el servidor.' },
      { status: 500 }
    );
  }

  try {
    switch (event.type) {
      // --------------------------------------------------------------------------
      // 1. Alta / Activación de Plan PRO tras completar Checkout
      // --------------------------------------------------------------------------
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const clientReferenceId = session.client_reference_id || session.metadata?.userId;
        const customerId =
          typeof session.customer === 'string'
            ? session.customer
            : session.customer?.id || null;
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : (session.subscription as any)?.id || null;

        if (!clientReferenceId) {
          console.warn(
            '[Stripe Webhook] checkout.session.completed sin client_reference_id ni userId:',
            session.id
          );
          break;
        }

        const { data: updatedRows, error: updateError } = await adminClient
          .from('usuarios')
          .update({
            plan_suscripcion: 'pro',
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            updated_at: new Date().toISOString(),
          })
          .eq('id', clientReferenceId)
          .select();

        if (updateError) {
          console.error('[Stripe Webhook] Error al activar PRO para el usuario:', updateError);
        } else {
          console.log(
            `[Stripe Webhook] Plan PRO activado exitosamente para usuario ${clientReferenceId}. Filas actualizadas: ${
              updatedRows?.length ?? 0
            }`
          );
        }
        break;
      }

      // --------------------------------------------------------------------------
      // 2. Baja / Cancelación definitiva de la suscripción
      // --------------------------------------------------------------------------
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id;
        const userId = subscription.metadata?.userId;
        const subscriptionId = subscription.id;

        console.log(
          `[Stripe Webhook] customer.subscription.deleted: sub=${subscriptionId}, cus=${customerId}, user=${userId}`
        );

        let query = adminClient.from('usuarios').update({
          plan_suscripcion: 'gratis',
          stripe_subscription_id: null,
          updated_at: new Date().toISOString(),
        });

        if (userId) {
          query = query.eq('id', userId);
        } else if (subscriptionId) {
          query = query.eq('stripe_subscription_id', subscriptionId);
        } else if (customerId) {
          query = query.eq('stripe_customer_id', customerId);
        } else {
          console.warn(
            '[Stripe Webhook] No se encontró ningún identificador para degradar suscripción:',
            subscriptionId
          );
          break;
        }

        const { data: downgradedRows, error: downgradeError } = await query.select();

        if (downgradeError) {
          console.error(
            '[Stripe Webhook] Error degradando usuario tras subscription.deleted:',
            downgradeError
          );
        } else {
          console.log(
            `[Stripe Webhook] Usuario degradado a GRATIS por cancelación. Filas actualizadas: ${
              downgradedRows?.length ?? 0
            }`
          );
        }
        break;
      }

      // --------------------------------------------------------------------------
      // 3. Pago mensual fallido (Impago / Tarjeta caducada / Fondos insuficientes)
      // --------------------------------------------------------------------------
      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        const customerId =
          typeof invoice.customer === 'string'
            ? invoice.customer
            : invoice.customer?.id;
        const subscriptionId =
          typeof invoice.subscription === 'string'
            ? invoice.subscription
            : invoice.subscription?.id;
        const userId =
          invoice.subscription_details?.metadata?.userId ||
          invoice.metadata?.userId;
        const customerEmail = invoice.customer_email;

        console.warn(
          `[Stripe Webhook] invoice.payment_failed: invoice=${invoice.id}, cus=${customerId}, email=${customerEmail}`
        );

        let query = adminClient.from('usuarios').update({
          plan_suscripcion: 'gratis',
          updated_at: new Date().toISOString(),
        });

        if (userId) {
          query = query.eq('id', userId);
        } else if (subscriptionId) {
          query = query.eq('stripe_subscription_id', subscriptionId);
        } else if (customerId) {
          query = query.eq('stripe_customer_id', customerId);
        } else if (customerEmail) {
          query = query.eq('email', customerEmail);
        } else {
          console.warn(
            '[Stripe Webhook] invoice.payment_failed sin identificador resoluble:',
            invoice.id
          );
          break;
        }

        const { data: failedRows, error: failedError } = await query.select();

        if (failedError) {
          console.error(
            '[Stripe Webhook] Error al degradar usuario por impago de factura:',
            failedError
          );
        } else {
          console.log(
            `[Stripe Webhook] Usuario degradado a GRATIS por fallo de pago. Filas: ${
              failedRows?.length ?? 0
            }`
          );
        }
        break;
      }

      // --------------------------------------------------------------------------
      // 4. Actualización de estado de la suscripción (reactivación o impago)
      // --------------------------------------------------------------------------
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const status = subscription.status;
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id;
        const userId = subscription.metadata?.userId;
        const subscriptionId = subscription.id;

        const isNowActive = status === 'active' || status === 'trialing';
        const newPlan = isNowActive ? 'pro' : 'gratis';

        let query = adminClient.from('usuarios').update({
          plan_suscripcion: newPlan,
          stripe_subscription_id: subscriptionId,
          updated_at: new Date().toISOString(),
        });

        if (userId) {
          query = query.eq('id', userId);
        } else if (subscriptionId) {
          query = query.eq('stripe_subscription_id', subscriptionId);
        } else if (customerId) {
          query = query.eq('stripe_customer_id', customerId);
        } else {
          break;
        }

        await query;
        console.log(
          `[Stripe Webhook] customer.subscription.updated: status=${status} -> plan=${newPlan}`
        );
        break;
      }

      default:
        break;
    }
  } catch (processError) {
    console.error('[Stripe Webhook] Error interno procesando evento:', processError);
  }

  // Responder siempre 200 para confirmar recepción a Stripe
  return NextResponse.json({ received: true }, { status: 200 });
}
