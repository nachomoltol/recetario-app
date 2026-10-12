import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

export const dynamic = 'force-dynamic';

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

  // Manejo del evento checkout.session.completed
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const clientReferenceId = session.client_reference_id;

    if (!clientReferenceId) {
      console.warn(
        'Webhook checkout.session.completed recibido sin client_reference_id:',
        session.id
      );
      return NextResponse.json(
        { error: 'No se encontró client_reference_id en la sesión.' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error(
        'Faltan variables de entorno de Supabase Service Role para el webhook.'
      );
      return NextResponse.json(
        { error: 'Error de configuración de Supabase en el servidor.' },
        { status: 500 }
      );
    }

    const adminClient = createAdminClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { data: updatedRows, error: updateError } = await adminClient
      .from('usuarios')
      .update({
        plan_suscripcion: 'pro',
        updated_at: new Date().toISOString(),
      })
      .eq('id', clientReferenceId)
      .select();

    if (updateError) {
      console.error(
        'Error al actualizar el usuario a plan PRO en Supabase:',
        updateError
      );
      return NextResponse.json(
        { error: 'Error al actualizar el usuario en la base de datos.' },
        { status: 500 }
      );
    }

    if (!updatedRows || updatedRows.length === 0) {
      console.warn(
        'No se encontró el usuario con id para actualizar a PRO:',
        clientReferenceId
      );
      return NextResponse.json(
        { error: 'Usuario no encontrado en la base de datos.' },
        { status: 404 }
      );
    }

    console.log(
      `Plan PRO activado exitosamente para el usuario ${clientReferenceId} mediante Stripe Checkout.`
    );
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
