-- ============================================================
-- FIX P0 (auditoria pre-launch Fase 5/6): bucket plant-photos era
-- publico (04_public_photos_bucket.sql) y ademas tenia politicas SELECT
-- ("public read"/"public read photos") sin condicion de propietario.
-- Verificado EN VIVO en produccion: un cliente sin ningun token pudo
-- listar carpetas de otros usuarios (= sus user_id reales), listar sus
-- plantas, y descargar una foto real ajena -- todo con solo la clave
-- publica embebida en el frontend.
--
-- Fix: bucket vuelve a privado. Se eliminan las policies de lectura
-- publica. Solo quedan las policies "own" (auth.uid() = primer segmento
-- del path), que ya existian y son correctas. El frontend pasa de
-- getPublicUrl() a createSignedUrl() (ver frontend/src/lib/sync.ts).
-- ============================================================

UPDATE storage.buckets SET public = false WHERE id = 'plant-photos';

DROP POLICY IF EXISTS "public read photos" ON storage.objects;
DROP POLICY IF EXISTS "public read" ON storage.objects;
