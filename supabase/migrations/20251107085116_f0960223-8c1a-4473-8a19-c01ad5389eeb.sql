-- Add foreign key constraint between member_biometrics and members
ALTER TABLE public.member_biometrics
  ADD CONSTRAINT member_biometrics_member_id_fkey
  FOREIGN KEY (member_id)
  REFERENCES public.members(id)
  ON DELETE CASCADE;