-- ==============================================================================
-- MIGRACIÓN DE STORAGE: BUCKET 'cooking-diary' PARA FOTOGRAFÍAS DE PLATOS
-- ==============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'cooking-diary',
    'cooking-diary',
    true,
    10485760, -- 10MB
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de acceso para objetos de storage
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'cooking_diary_public_select'
    ) THEN
        CREATE POLICY "cooking_diary_public_select"
        ON storage.objects FOR SELECT
        USING (bucket_id = 'cooking-diary');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'cooking_diary_auth_insert'
    ) THEN
        CREATE POLICY "cooking_diary_auth_insert"
        ON storage.objects FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'cooking-diary' AND (auth.uid() = owner OR owner IS NULL));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'objects' AND policyname = 'cooking_diary_auth_delete'
    ) THEN
        CREATE POLICY "cooking_diary_auth_delete"
        ON storage.objects FOR DELETE
        TO authenticated
        USING (bucket_id = 'cooking-diary' AND auth.uid() = owner);
    END IF;
END $$;
