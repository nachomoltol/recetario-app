-- ==============================================================================
-- MIGRACIÓN: Añadir columna e índice de caché semántica a recetas
-- Migración: 20261029200000_add_source_url_hash_to_recetas.sql
-- ==============================================================================

-- 1. Añadir columna source_url_hash a public.recetas
ALTER TABLE public.recetas 
ADD COLUMN IF NOT EXISTS source_url_hash TEXT;

-- 2. Crear índice B-Tree para lookup instantáneo (< 5 ms) en la caché semántica
CREATE INDEX IF NOT EXISTS idx_recetas_source_url_hash 
ON public.recetas(source_url_hash);

-- 3. Documentación del campo en el catálogo de PostgreSQL
COMMENT ON COLUMN public.recetas.source_url_hash IS 'Hash SHA-256 de la URL canónica normalizada para lookup y clonación en caché semántica instantánea (<150 ms)';

