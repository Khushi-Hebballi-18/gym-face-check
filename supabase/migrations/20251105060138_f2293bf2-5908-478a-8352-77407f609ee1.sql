-- Split biometric data into separate table for security
CREATE TABLE public.member_biometrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL UNIQUE,
  face_embedding TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on biometrics table
ALTER TABLE public.member_biometrics ENABLE ROW LEVEL SECURITY;

-- Only admins can access biometric data
CREATE POLICY "Only admins can view biometrics"
ON public.member_biometrics FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins and staff can insert biometrics"
ON public.member_biometrics FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

CREATE POLICY "Only admins can update biometrics"
ON public.member_biometrics FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Only admins can delete biometrics"
ON public.member_biometrics FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updated_at on biometrics
CREATE TRIGGER update_member_biometrics_updated_at
BEFORE UPDATE ON public.member_biometrics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Migrate existing face_embedding data to new table
INSERT INTO public.member_biometrics (member_id, face_embedding)
SELECT id, face_embedding FROM public.members WHERE face_embedding IS NOT NULL;

-- Remove face_embedding from members table
ALTER TABLE public.members DROP COLUMN face_embedding;

-- Configure storage bucket limits
UPDATE storage.buckets 
SET 
  file_size_limit = 10485760,  -- 10MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/jpg']
WHERE id = 'member-photos';