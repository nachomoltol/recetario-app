import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

export const runtime = 'nodejs';

// Configuración estricta de enrutamiento
const SYSTEM_RECIPIENT = 'migarecetasredes@gmail.com';
const SYSTEM_FROM_DEFAULT = 'Miga App <onboarding@resend.dev>';

export async function POST(req: NextRequest) {
  try {
    // 1. Proteger endpoint mediante la sesión autenticada de Supabase
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

    // 3. Variables de enrutamiento estrictas (sin cruce de variables)
    // - to: Únicamente el correo del equipo de soporte
    // - from: Sistema verificado (NUNCA el correo del usuario)
    // - reply_to: El correo del usuario para respuesta directa desde Gmail
    // - subject: [Soporte Miga] - {Categoría} - {Correo del Usuario}
    const userEmail = user.email;
    const userName =
      user.user_metadata?.nombre ||
      user.user_metadata?.full_name ||
      userEmail.split('@')[0];

    const subject = `[Soporte Miga] - ${category} - ${userEmail}`;

    const systemSenderEmail =
      process.env.RESEND_FROM?.trim() ||
      process.env.EMAIL_FROM?.trim() ||
      SYSTEM_FROM_DEFAULT;

    const textContent = `
[SOPORTE MIGA] NUEVO MENSAJE DE FEEDBACK
==================================================

• Remitente (Usuario): ${userName} <${userEmail}>
• Categoría: ${category}
• ID de Usuario: ${user.id}
• Fecha: ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}

==================================================
MENSAJE DETALLADO:
==================================================
${trimmedMessage}
==================================================

* Para responder al usuario, pulsa "Responder" en tu cliente de correo (Reply-To configurado para ${userEmail}).
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
    <!-- Cabecera -->
    <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; border-bottom: 1px solid #f4efe6; padding-bottom: 16px;">
      <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #a86224;">Miga App · Soporte y Feedback</h2>
      <span style="display: inline-block; padding: 4px 12px; font-size: 12px; font-weight: 600; border-radius: 9999px; background-color: #f4efe6; color: #a86224; border: 1px solid #e7dfd5;">
        ${category}
      </span>
    </div>

    <!-- Datos del remitente / usuario -->
    <div style="background-color: #faf7f2; border: 1px solid #e7dfd5; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: #1c1917;">
        <strong>Usuario:</strong> ${userName} &lt;<a href="mailto:${userEmail}" style="color: #a86224; text-decoration: underline; font-weight: 600;">${userEmail}</a>&gt;
      </p>
      <p style="margin: 0 0 6px 0; font-size: 12px; color: #78716c;">
        <strong>Categoría:</strong> ${category}
      </p>
      <p style="margin: 0 0 6px 0; font-size: 12px; color: #a8a29e;">
        <strong>ID de Usuario Supabase:</strong> ${user.id}
      </p>
      <p style="margin: 0; font-size: 12px; color: #a8a29e;">
        <strong>Fecha:</strong> ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}
      </p>
    </div>

    <!-- Mensaje detallado -->
    <div style="margin-bottom: 28px;">
      <h3 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em; color: #78716c; margin-bottom: 10px;">
        Mensaje detallado:
      </h3>
      <div style="background-color: #ffffff; border-left: 4px solid #a86224; padding: 16px; font-size: 14px; line-height: 1.6; color: #1c1917; white-space: pre-wrap; border-radius: 4px; border-top: 1px solid #f4efe6; border-right: 1px solid #f4efe6; border-bottom: 1px solid #f4efe6;">
        ${trimmedMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;')}
      </div>
    </div>

    <!-- Pie de contestación directa -->
    <div style="border-top: 1px solid #f4efe6; padding-top: 16px; font-size: 12px; color: #78716c; text-align: center; background-color: #faf7f2; border-radius: 8px; padding: 12px;">
      💡 Pulsa <strong>Responder</strong> en tu cliente de correo para responder directamente a <a href="mailto:${userEmail}" style="color: #a86224; font-weight: 600;">${userEmail}</a>.
    </div>
  </div>
</body>
</html>
`.trim();

    let sent = false;
    let lastError: string | null = null;

    // 4. Intento A: Resend API (si existe RESEND_API_KEY)
    const resendApiKey = process.env.RESEND_API_KEY;
    if (resendApiKey) {
      try {
        const resend = new Resend(resendApiKey);

        const resendResult = await resend.emails.send({
          from: systemSenderEmail,
          to: [SYSTEM_RECIPIENT],
          replyTo: userEmail,
          subject,
          text: textContent,
          html: htmlContent,
          headers: {
            'Reply-To': userEmail,
          },
        });

        if (resendResult.data?.id) {
          sent = true;
          console.log('[Feedback] Correo enviado vía Resend con éxito:', resendResult.data.id);
        } else if (resendResult.error) {
          lastError = resendResult.error.message || JSON.stringify(resendResult.error);
          console.warn('[Feedback] Error devuelto por Resend API:', resendResult.error);
        }
      } catch (resendErr: any) {
        lastError = resendErr?.message || 'Error de conexión con Resend';
        console.warn('[Feedback] Excepción en llamada a Resend:', resendErr);
      }
    }

    // 5. Intento B: SMTP (si no se envió con Resend y existen variables de SMTP)
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

        const smtpSenderEmail =
          process.env.SMTP_FROM?.trim() ||
          process.env.EMAIL_FROM?.trim() ||
          process.env.SMTP_USER?.trim() ||
          systemSenderEmail;

        await transporter.sendMail({
          from: smtpSenderEmail,
          to: SYSTEM_RECIPIENT,
          replyTo: userEmail,
          subject,
          text: textContent,
          html: htmlContent,
          headers: {
            'Reply-To': userEmail,
          },
        });

        sent = true;
        console.log('[Feedback] Correo enviado vía SMTP con éxito a', SYSTEM_RECIPIENT);
      } catch (smtpErr: any) {
        lastError = smtpErr?.message || 'Error de conexión SMTP';
        console.warn('[Feedback] Excepción en llamada SMTP:', smtpErr);
      }
    }

    // 6. Si no se pudo enviar el correo
    if (!sent) {
      // Modo desarrollo local sin credenciales configuradas
      if (!resendApiKey && !process.env.SMTP_HOST && !process.env.SMTP_USER && process.env.NODE_ENV !== 'production') {
        console.warn(
          '[Feedback] Modo desarrollo: Simulando envío satisfactorio (sin RESEND_API_KEY ni SMTP configurados):',
          {
            to: SYSTEM_RECIPIENT,
            from: systemSenderEmail,
            replyTo: userEmail,
            subject,
          }
        );
        return NextResponse.json({
          success: true,
          message: '¡Muchas gracias! Tu mensaje ha sido simulado en desarrollo.',
        });
      }

      console.error('[Feedback] Falló el envío de correo de feedback:', lastError);
      return NextResponse.json(
        {
          error:
            lastError ||
            `No se pudo enviar el correo de soporte. Por favor, escribe directamente a ${SYSTEM_RECIPIENT}.`,
        },
        { status: 502 }
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
