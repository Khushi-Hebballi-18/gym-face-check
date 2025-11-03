-- Create storage bucket for member photos
INSERT INTO storage.buckets (id, name, public)
VALUES ('member-photos', 'member-photos', true);

-- Allow anyone to upload photos
CREATE POLICY "Anyone can upload member photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'member-photos');

-- Allow anyone to view photos
CREATE POLICY "Member photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'member-photos');

-- Allow anyone to update photos
CREATE POLICY "Anyone can update member photos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'member-photos');

-- Allow anyone to delete photos
CREATE POLICY "Anyone can delete member photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'member-photos');