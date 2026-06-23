
-- hot_matches: featured/promoted fixtures
CREATE TABLE public.hot_matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fixture_id bigint NOT NULL UNIQUE,
  title text,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.hot_matches TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.hot_matches TO authenticated;
GRANT ALL ON public.hot_matches TO service_role;
ALTER TABLE public.hot_matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read hot matches" ON public.hot_matches FOR SELECT USING (true);
CREATE POLICY "admin manage hot matches insert" ON public.hot_matches FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage hot matches update" ON public.hot_matches FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "admin manage hot matches delete" ON public.hot_matches FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- top_leagues
CREATE TABLE public.top_leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id bigint NOT NULL UNIQUE,
  name text NOT NULL,
  country text,
  logo text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.top_leagues TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.top_leagues TO authenticated;
GRANT ALL ON public.top_leagues TO service_role;
ALTER TABLE public.top_leagues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read top leagues" ON public.top_leagues FOR SELECT USING (true);
CREATE POLICY "admin insert top leagues" ON public.top_leagues FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "admin update top leagues" ON public.top_leagues FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete top leagues" ON public.top_leagues FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- top_teams
CREATE TABLE public.top_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id bigint NOT NULL UNIQUE,
  name text NOT NULL,
  logo text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.top_teams TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.top_teams TO authenticated;
GRANT ALL ON public.top_teams TO service_role;
ALTER TABLE public.top_teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read top teams" ON public.top_teams FOR SELECT USING (true);
CREATE POLICY "admin insert top teams" ON public.top_teams FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "admin update top teams" ON public.top_teams FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete top teams" ON public.top_teams FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- notifications (admin-authored broadcast)
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL,
  audience text NOT NULL DEFAULT 'all', -- all | premium | free
  link text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.notifications TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone read notifications" ON public.notifications FOR SELECT USING (true);
CREATE POLICY "admin insert notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete notifications" ON public.notifications FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- client_queries (contact form submissions)
CREATE TABLE public.client_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open', -- open | answered | closed
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.client_queries TO anon, authenticated;
GRANT SELECT, UPDATE, DELETE ON public.client_queries TO authenticated;
GRANT ALL ON public.client_queries TO service_role;
ALTER TABLE public.client_queries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone submit query" ON public.client_queries FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "admin read queries" ON public.client_queries FOR SELECT TO authenticated USING (has_role(auth.uid(),'admin'));
CREATE POLICY "admin update queries" ON public.client_queries FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "admin delete queries" ON public.client_queries FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- ratings
CREATE TABLE public.ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  stars int NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.ratings TO authenticated;
GRANT UPDATE, DELETE ON public.ratings TO authenticated;
GRANT ALL ON public.ratings TO service_role;
ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user read own ratings" ON public.ratings FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));
CREATE POLICY "user insert own ratings" ON public.ratings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "admin delete ratings" ON public.ratings FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- transactions
CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  status text NOT NULL DEFAULT 'succeeded',
  provider text,
  reference text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.transactions TO authenticated;
GRANT ALL ON public.transactions TO service_role;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user read own tx" ON public.transactions FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));

-- subscriptions
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  plan text NOT NULL DEFAULT 'free', -- free | pro | premium
  status text NOT NULL DEFAULT 'active',
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user read own sub" ON public.subscriptions FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(),'admin'));

CREATE TRIGGER hot_matches_updated_at BEFORE UPDATE ON public.hot_matches FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
