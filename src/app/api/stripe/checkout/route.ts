import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

async function handleCheckout(req: NextRequest) {
  try {
    // 1. Verificar sesión del usuario actual mediante Supabase
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'No autorizado. Debes iniciar sesión.' },
        { status: 401 }
      );
    }

    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    const stripePriceId = process.env.STRIPE_PRO_PRICE_ID;

    if (!stripeSecretKey || !stripePriceId) {
      console.error('Faltan variables de entorno de Stripe en el servidor.');
      return NextResponse.json(
        { error: 'Configuración de pagos no disponible.' },
        { status: 500 }
      );
    }

    // 2. Instanciar Stripe
    const stripe = new Stripe(stripeSecretKey);

    // Obtener origen dinámicamente desde los headers de la petición
    const origin =
      req.headers.get('origin') ||
      req.headers.get('referer')?.split('/').slice(0, 3).join('/') ||
      'https://recetario-app.vercel.app';

    // 3. Crear sesión de Checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      allowed_payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      success_url: `${origin}/billing?success=true`,
      cancel_url: `${origin}/billing?canceled=true`,
      client_reference_id: user.id,
      customer_email: user.email || undefined,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: 'No se pudo generar la URL de pago de Stripe.' },
        { status: 500 }
      );
    }

    // 4. Retornar la URL de Checkout
    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error('Error al crear sesión de Checkout de Stripe:', error);
    const message =
      error instanceof Error ? error.message : 'Error interno al procesar el pago.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return handleCheckout(req);
}

export async function GET(req: NextRequest) {
  return handleCheckout(req);
}
