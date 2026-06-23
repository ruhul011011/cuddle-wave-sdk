
ALTER TABLE public.match_access
  ADD COLUMN IF NOT EXISTS available_from timestamptz;
