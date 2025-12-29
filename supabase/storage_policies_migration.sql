-- Storage Policies for Leave Documents

-- 1. Create the bucket if it doesn't exist (Note: This is usually done via API/Dashboard, but we can try SQL extension or RLS policies assumes bucket exists)
-- Since we can't easily create buckets via SQL in standard postgres, we'll focus on Policies.
-- User INSTRUCTION: Create a public bucket named 'leave-documents' in Supabase Storage.

-- 2. Policy: Allow Authenticated uploads
-- Note: 'storage.objects' is the table
DROP POLICY IF EXISTS "Authenticated users can upload leave docs" ON storage.objects;
CREATE POLICY "Authenticated users can upload leave docs" ON storage.objects
    FOR INSERT
    WITH CHECK (
        bucket_id = 'leave-documents' 
        AND auth.role() = 'authenticated'
    );

-- 3. Policy: Allow Authenticated view
DROP POLICY IF EXISTS "Authenticated users can view leave docs" ON storage.objects;
CREATE POLICY "Authenticated users can view leave docs" ON storage.objects
    FOR SELECT
    USING (
        bucket_id = 'leave-documents'
        AND auth.role() = 'authenticated'
    );
