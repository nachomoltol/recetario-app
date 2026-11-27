import fs from 'fs';
import os from 'os';
import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getAdminClient } from '@/lib/supabase/server';

const MAX_TEMP_AGE_MS = 24 * 60 * 60 * 1000; // 24 horas
const CLEANUP_THROTTLE_MS = 60 * 60 * 1000; // Máximo 1 limpieza prudencial por hora por instancia
let lastPrudentialCleanupAt = 0;

/**
 * Extrae la ruta interna del bucket a partir de una URL pública o firmada de Supabase Storage,
 * eliminando parámetros de consulta (?token=..., ?t=...) y fragmentos (#...).
 */
export function extractStoragePathFromUrl(
  url: string | null | undefined,
  bucket: string
): string | null {
  if (!url || typeof url !== 'string') return null;
  const marker = `/${bucket}/`;
  if (!url.includes(marker)) return null;

  const parts = url.split(marker);
  if (parts.length < 2 || !parts[1]) return null;

  const rawPath = parts[1].split('?')[0].split('#')[0].trim();
  if (!rawPath) return null;

  try {
    return decodeURIComponent(rawPath);
  } catch {
    return rawPath;
  }
}

/**
 * Elimina de forma segura una o varias URLs de un bucket de Supabase Storage,
 * deduplicando rutas y sin lanzar excepciones bloqueantes.
 */
export async function removeStorageUrlsSafely(
  supabase: SupabaseClient,
  bucket: string,
  urls: Array<string | null | undefined>
): Promise<void> {
  const paths = Array.from(
    new Set(
      urls
        .map((u) => extractStoragePathFromUrl(u, bucket))
        .filter((p): p is string => Boolean(p))
    )
  );

  if (paths.length === 0) return;

  try {
    const adminClient = getAdminClient();
    const client = adminClient || supabase;
    const { error } = await client.storage.from(bucket).remove(paths);
    if (error) {
      console.warn(`[storageCleanup] No se pudieron eliminar archivos en '${bucket}':`, error.message);
    }
  } catch (err) {
    console.warn(`[storageCleanup] Excepción eliminando archivos en '${bucket}':`, err);
  }
}

/**
 * Limpieza prudencial automática (máx. 24 h de antigüedad) de residuos temporales de captura:
 * 1) Archivos temporales huérfanos en os.tmpdir() ('upload_*', 'receta_*') si una petición se interrumpió.
 * 2) Posibles temporales en prefijos 'temp/' o 'captures_temp/' de los buckets de Supabase Storage.
 * Se ejecuta en segundo plano y con límite de frecuencia (1 vez/hora) para no añadir latencia.
 */
export async function cleanupStaleTemporaryCaptures(): Promise<void> {
  const now = Date.now();
  if (now - lastPrudentialCleanupAt < CLEANUP_THROTTLE_MS) {
    return;
  }
  lastPrudentialCleanupAt = now;

  // 1. Limpieza de disco temporal local (os.tmpdir)
  try {
    const tempDir = os.tmpdir();
    const entries = fs.readdirSync(tempDir);
    for (const name of entries) {
      if (!name.startsWith('upload_') && !name.startsWith('receta_')) continue;
      const fullPath = path.join(tempDir, name);
      try {
        const stat = fs.statSync(fullPath);
        if (stat.isFile() && now - stat.mtimeMs > MAX_TEMP_AGE_MS) {
          fs.unlinkSync(fullPath);
        }
      } catch {}
    }
  } catch {}

  // 2. Limpieza prudencial de prefijos temporales en Supabase Storage (si existieran)
  try {
    const adminClient = getAdminClient();
    if (!adminClient) return;

    const buckets = ['recetas_fotos', 'cooking-diary'];
    const tempPrefixes = ['temp', 'captures_temp'];

    for (const bucket of buckets) {
      for (const prefix of tempPrefixes) {
        try {
          const { data: files, error } = await adminClient.storage
            .from(bucket)
            .list(prefix, { limit: 100 });
          if (error || !files || files.length === 0) continue;

          const stalePaths = files
            .filter((f) => {
              if (!f.name || !f.created_at) return false;
              const ageMs = now - new Date(f.created_at).getTime();
              return Number.isFinite(ageMs) && ageMs > MAX_TEMP_AGE_MS;
            })
            .map((f) => `${prefix}/${f.name}`);

          if (stalePaths.length > 0) {
            await adminClient.storage.from(bucket).remove(stalePaths);
          }
        } catch {}
      }
    }
  } catch {}
}
