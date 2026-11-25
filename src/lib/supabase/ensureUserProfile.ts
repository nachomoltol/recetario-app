import { getAdminClient } from '@/lib/supabase/server';

export interface AuthUserLike {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}

/**
 * Red de seguridad autorreparadora para perfiles de usuario.
 *
 * Garantiza que todo usuario autenticado en Supabase Auth (`auth.users`)
 * disponga de su ficha correspondiente en `public.usuarios` antes de consultar
 * cuotas o insertar en tablas relacionadas como `public.recetas`.
 *
 * - Usa exclusivamente la llave administrativa de servidor (`SUPABASE_SERVICE_ROLE_KEY`).
 * - Si la fila ya existe, retorna de inmediato sin sobrescribir ningún dato.
 * - Si no existe, la crea de forma idempotente (`ignoreDuplicates: true`)
 *   respetando todos los valores por defecto de la base de datos.
 */
export async function ensureUserProfileExists(
  user: AuthUserLike | null | undefined
): Promise<boolean> {
  if (!user?.id) {
    return false;
  }

  try {
    const adminClient = getAdminClient();
    if (!adminClient) {
      console.warn(
        '[ensureUserProfileExists] No hay cliente administrativo disponible (SUPABASE_SERVICE_ROLE_KEY); se omite la autorreparación.'
      );
      return false;
    }

    // 1. Comprobación rápida de solo lectura para evitar escrituras innecesarias
    const { data: existing, error: checkError } = await adminClient
      .from('usuarios')
      .select('id')
      .eq('id', user.id)
      .maybeSingle();

    if (checkError) {
      console.warn(
        `[ensureUserProfileExists] Error consultando existencia de perfil para ${user.id}:`,
        checkError.message
      );
    }

    if (existing?.id) {
      return true;
    }

    // 2. El usuario autenticado no tiene fila en public.usuarios -> crearla automáticamente
    const rawEmail = typeof user.email === 'string' ? user.email.trim() : '';
    const email = rawEmail || `${user.id}@migaapp.local`;
    const meta = (user.user_metadata || {}) as Record<string, unknown>;

    const rawNombre =
      (typeof meta.nombre === 'string' && meta.nombre.trim()) ||
      (typeof meta.full_name === 'string' && meta.full_name.trim()) ||
      (rawEmail.includes('@') ? rawEmail.split('@')[0] : '') ||
      'Cocinero';

    const avatarUrl =
      typeof meta.avatar_url === 'string' && meta.avatar_url.trim().length > 0
        ? meta.avatar_url.trim()
        : null;

    const { error: upsertError } = await adminClient
      .from('usuarios')
      .upsert(
        {
          id: user.id,
          email,
          nombre: rawNombre,
          avatar_url: avatarUrl,
        },
        {
          onConflict: 'id',
          ignoreDuplicates: true,
        }
      );

    if (upsertError) {
      console.error(
        `[ensureUserProfileExists] Error creando ficha autorreparada en public.usuarios para ${user.id}:`,
        upsertError.message
      );
      return false;
    }

    console.log(
      `[ensureUserProfileExists] Ficha autorreparada automáticamente en public.usuarios para ${user.id} (${email}).`
    );
    return true;
  } catch (err) {
    console.error('[ensureUserProfileExists] Excepción inesperada:', err);
    return false;
  }
}
