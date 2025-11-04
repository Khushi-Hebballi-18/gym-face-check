-- Create role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'staff');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Policy: Users can view their own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Only admins can manage roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Drop existing public policies on members table
DROP POLICY IF EXISTS "Members are viewable by everyone" ON public.members;
DROP POLICY IF EXISTS "Anyone can register as member" ON public.members;

-- New RLS policies for members table
CREATE POLICY "Authenticated users can view members"
ON public.members
FOR SELECT
TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can insert members"
ON public.members
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Staff can update members"
ON public.members
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));

CREATE POLICY "Admins can delete members"
ON public.members
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Make storage bucket private
UPDATE storage.buckets SET public = false WHERE id = 'member-photos';

-- Drop existing public storage policies
DROP POLICY IF EXISTS "Anyone can upload member photos" ON storage.objects;
DROP POLICY IF EXISTS "Member photos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update member photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete member photos" ON storage.objects;

-- New storage policies
CREATE POLICY "Staff can upload member photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'member-photos' AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
);

CREATE POLICY "Authenticated users can view member photos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'member-photos');

CREATE POLICY "Staff can update member photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'member-photos' AND
  (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'))
);

CREATE POLICY "Admins can delete member photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'member-photos' AND
  public.has_role(auth.uid(), 'admin')
);