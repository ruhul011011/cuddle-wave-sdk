
ALTER TABLE public.match_access DROP CONSTRAINT IF EXISTS match_access_access_check;
ALTER TABLE public.match_access ADD CONSTRAINT match_access_access_check CHECK (access = ANY (ARRAY['free','premium','ads','mix','paid']));

ALTER TABLE public.match_streams ADD COLUMN IF NOT EXISTS link_mode text NOT NULL DEFAULT 'free';
ALTER TABLE public.match_streams DROP CONSTRAINT IF EXISTS match_streams_link_mode_check;
ALTER TABLE public.match_streams ADD CONSTRAINT match_streams_link_mode_check CHECK (link_mode = ANY (ARRAY['free','premium','ads']));
