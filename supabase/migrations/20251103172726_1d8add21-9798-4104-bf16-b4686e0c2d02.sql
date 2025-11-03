-- Create gym members table
CREATE TABLE public.members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  face_embedding TEXT NOT NULL,
  membership_start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  membership_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public read access (for scanning)
CREATE POLICY "Members are viewable by everyone" 
ON public.members 
FOR SELECT 
USING (true);

-- Create policy to allow public insert (for registration)
CREATE POLICY "Anyone can register as member" 
ON public.members 
FOR INSERT 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_members_updated_at
BEFORE UPDATE ON public.members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index on face_embedding for faster lookups
CREATE INDEX idx_members_face_embedding ON public.members(face_embedding);

-- Create index on membership dates for faster expiry checks
CREATE INDEX idx_members_expiry ON public.members(membership_end_date, is_active);