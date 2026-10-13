-- ==============================================================================
-- MIGRACIÓN SUPABASE: foto_url en recetas y bucket recetas_fotos
-- ==============================================================================

-- 1. Añadir columna foto_url a la tabla recetas
ALTER TABLE public.recetas 
ADD COLUMN IF NOT EXISTS foto_url TEXT NULL;

-- 2. Crear bucket público recetas_fotos en storage.buckets si no existe
INSERT INTO storage.buckets (id, name, public)
VALUES ('recetas_fotos', 'recetas_fotos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 3. Políticas RLS para storage.objects

-- Lectura pública para cualquier usuario (anónimo o autenticado)
DROP POLICY IF EXISTS "recetas_fotos_public_select" ON storage.objects;
CREATE POLICY "recetas_fotos_public_select"
ON storage.objects FOR SELECT
USING (bucket_id = 'recetas_fotos');

-- Inserción permitida a usuarios autenticados
DROP POLICY IF EXISTS "recetas_fotos_auth_insert" ON storage.objects;
CREATE POLICY "recetas_fotos_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'recetas_fotos');

-- Actualización permitida a usuarios autenticados
DROP POLICY IF EXISTS "recetas_fotos_auth_update" ON storage.objects;
CREATE POLICY "recetas_fotos_auth_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'recetas_fotos')
WITH CHECK (bucket_id = 'recetas_fotos');
