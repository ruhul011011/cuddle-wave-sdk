
-- Roles enum
create type public.app_role as enum ('admin', 'user');

-- user_roles
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.user_roles enable row level security;

create policy "Users view own roles" on public.user_roles
  for select to authenticated
  using (auth.uid() = user_id);

-- Security definer role check
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- match_streams
create table public.match_streams (
  id uuid primary key default gen_random_uuid(),
  fixture_id bigint not null,
  label text not null default 'Main',
  stream_type text not null check (stream_type in ('hls','iframe','mp4')),
  url text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

create index match_streams_fixture_idx on public.match_streams(fixture_id) where is_active;

grant select on public.match_streams to anon, authenticated;
grant insert, update, delete on public.match_streams to authenticated;
grant all on public.match_streams to service_role;

alter table public.match_streams enable row level security;

create policy "Anyone can view active streams" on public.match_streams
  for select to anon, authenticated
  using (is_active = true);

create policy "Admins view all streams" on public.match_streams
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "Admins insert streams" on public.match_streams
  for insert to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins update streams" on public.match_streams
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins delete streams" on public.match_streams
  for delete to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- updated_at trigger
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_match_streams_updated_at
before update on public.match_streams
for each row execute function public.update_updated_at_column();
