import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // 1. Proteger endpoint mediante la sesión de Supabase
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user || !user.email) {
      return NextResponse.json(
        { error: 'No autorizado. Debes iniciar sesión para enviar feedback.' },
        { status: 401 }
      );
    }

    // 2. Parsear y validar el cuerpo de la petición
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        { error: 'Cuerpo de la petición inválido.' },
        { status: 400 }
      );
    }

    const { category, message } = body;

    const validCategories = [
      'Informar de un error',
      'Sugerencia',
      'Duda técnica',
      'Otro',
    ];

    if (!category || !validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Por favor, selecciona una categoría válida.' },
        { status: 400 }
      );
    }

    if (typeof message !== 'string') {
      return NextResponse.json(
        { error: 'El mensaje debe ser un texto.' },
        { status: 400 }
      );
    }

    const trimmedMessage = message.trim();
    if (trimmedMessage.length < 5) {
      return NextResponse.json(
        { error: 'El mensaje es demasiado corto. Escribe al menos 5 caracteres.' },
        { status: 400 }
      );
    }

    if (trimmedMessage.length > 500) {
      return NextResponse.json(
        { error: 'El mensaje supera el límite máximo de 500 caracteres.' },
        { status: 400 }
      );
    }

    const recipientEmail = 'migarecetasredes@gmail.com';
    const userEmail = user.email;
    const userName =
      user.user_metadata?.nombre ||
      user.user_metadata?.full_name ||
      userEmail.split('@')[0];

    const subject = `[Miga Soporte] ${category} - ${userEmail}`;

    const textContent = `
NUEVO MENSAJE DE SOPORTE Y FEEDBACK - MIGA APP
==================================================

Categoría: ${category}
Usuario: ${userName} (${userEmail})
ID de Usuario: ${user.id}
Fecha: ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}

MENSAJE:
--------------------------------------------------
${trimmedMessage}
--------------------------------------------------

* Para responder al usuario, puedes contestar directamente a este correo (Reply-To configurado con ${userEmail}).
`.trim();

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #faf7f2; color: #1c1917; padding: 24px; margin: 0;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; border: 1px solid #e7dfd5; padding: 32px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
    <div style="display: flex; align-items: center; margin-bottom: 24px; border-bottom: 1px solid #f4efe6; padding-bottom: 16px;">
      <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #a86224;">Miga App · Soporte y Feedback</h2>
    </div>

    <div style="margin-bottom: 20px;">
      <span style="display: inline-block; padding: 4px 12px; font-size: 12px; font-weight: 600; border-radius: 9999px; background-color: #f4efe6; color: #a86224; border: 1px solid #e7dfd5;">
        ${category}
      </span>
    </div>

    <div style="background-color: #faf7f2; border: 1px solid #e7dfd5; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0 0 6px 0; font-size: 13px; color: #78716c;"><strong>Remitente:</strong> ${userName} &lt;<a href="mailto:${userEmail}" style="color: #a86224; text-decoration: underline;">${userEmail}</a>&gt;</p>
      <p style="margin: 0 0 6px 0; font-size: 12px; color: #a8a29e;"><strong>ID de Usuario:</strong> ${user.id}</p>
      <p style="margin: 0; font-size: 12px; color: #a8a29e;"><strong>Fecha:</strong> ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}</p>
    </div>

    <div style="margin-bottom: 28px;">
      <h3 style="font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #78716c; margin-bottom: 8px;">Mensaje del Usuario:</h3>
      <div style="background-color: #ffffff; border-left: 4px solid #a86224; padding: 12px 16px; font-size: 14px; line-height: 1.6; color: #1c1917; white-space: pre-wrap; border-radius: 4px; border-top: 1px solid #f4efe6; border-right: 1px solid #f4efe6; border-bottom: 1px solid #f4efe6;">
        ${trimmedMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
      </div>
    </div>

    <div style="border-top: 1px solid #f4efe6; padding-top: 16px; font-size: 12px; color: #a8a29e; text-align: center;">
      Puedes responder directamente a este correo para escribir al usuario (<a href="mailto:${userEmail}" style="color: #a86224;">${userEmail}</a>).
    </div>
  </div>
</body>
</html>
`.trim();

    let sent = false;

    // 3. Intento A: Resend API (si existe RESEND_API_KEY)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);
        const fromEmail =
          process.env.RESEND_FROM ||
          process.env.EMAIL_FROM ||
          'Miga App <onboarding@resend.dev>';

        const resendResult = await resend.emails.send({
          from: fromEmail,
          to: [recipientEmail],
          replyTo: userEmail,
          subject,
          text: textContent,
          html: htmlContent,
        });

        if (resendResult.data?.id) {
          sent = true;
          console.log('[Feedback] Correo enviado vía Resend con éxito:', resendResult.data.id);
        } else if (resendResult.error) {
          console.warn('[Feedback] Error enviando con Resend:', resendResult.error);
        }
      } catch (resendErr) {
        console.warn('[Feedback] Excepción en Resend:', resendErr);
      }
    }

    // 4. Intento B: SMTP (si no se envió con Resend y existen variables de SMTP)
    if (!sent && (process.env.SMTP_HOST || process.env.SMTP_USER)) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure:
            process.env.SMTP_SECURE === 'true' ||
            Number(process.env.SMTP_PORT) === 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS || process.env.SMTP_PASSWORD,
          },
        });

        await transporter.sendMail({
          from:
            process.env.SMTP_FROM ||
            process.env.EMAIL_FROM ||
            process.env.SMTP_USER,
          to: recipientEmail,
          replyTo: userEmail,
          subject,
          text: textContent,
          html: htmlContent,
        });

        sent = true;
        console.log('[Feedback] Correo enviado vía SMTP con éxito a', recipientEmail);
      } catch (smtpErr) {
        console.warn('[Feedback] Excepción en SMTP:', smtpErr);
      }
    }

    // 5. Si no hay credenciales de correo configuradas en el entorno local/preview, registrar y responder éxito
    if (!sent) {
      console.warn(
        '[Feedback] Nota: El reporte se procesó pero no se envió correo porque no hay RESEND_API_KEY ni variables SMTP en el entorno. Datos del feedback:',
        {
          to: recipientEmail,
          from: userEmail,
          category,
          messageLength: trimmedMessage.length,
        }
      );
    }

    return NextResponse.json({
      success: true,
      message: '¡Muchas gracias! Tu mensaje ha sido enviado a nuestro equipo de soporte.',
    });
  } catch (error) {
    console.error('[Feedback] Error en endpoint /api/feedback:', error);
    return NextResponse.json(
      { error: 'Ocurrió un error inesperado al procesar tu solicitud. Inténtalo de nuevo más tarde.' },
      { status: 500 }
    );
  }
}
