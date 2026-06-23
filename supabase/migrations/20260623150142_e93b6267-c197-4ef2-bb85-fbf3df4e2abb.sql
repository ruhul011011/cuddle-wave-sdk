
create table public.match_access (
  fixture_id bigint primary key,
  access text not null default 'free' check (access in ('free','paid')),
  price_cents integer not null default 0 check (price_cents >= 0),
  currency text not null default 'usd',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.match_access to anon, authenticated;
grant all on public.match_access to service_role;
alter table public.match_access enable row level security;
create policy "Anyone view match access" on public.match_access for select to anon, authenticated using (true);
create policy "Admins manage match access" on public.match_access for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger update_match_access_updated_at before update on public.match_access for each row execute function public.update_updated_at_column();

create table public.match_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fixture_id bigint not null,
  stripe_session_id text unique,
  amount_cents integer not null,
  currency text not null,
  status text not null default 'paid',
  created_at timestamptz not null default now(),
  unique(user_id, fixture_id)
);
grant select on public.match_purchases to authenticated;
grant all on public.match_purchases to service_role;
alter table public.match_purchases enable row level security;
create policy "Users view own purchases" on public.match_purchases for select to authenticated using (auth.uid() = user_id);
