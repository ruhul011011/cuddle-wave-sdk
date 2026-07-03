
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,
  content_html text not null default '',
  cover_image text,
  category text not null default 'News',
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft','published')),
  seo_title text,
  seo_description text,
  author_id uuid references auth.users(id) on delete set null,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

grant select on public.articles to anon, authenticated;
grant insert, update, delete on public.articles to authenticated;
grant all on public.articles to service_role;

alter table public.articles enable row level security;

create policy "public read published articles" on public.articles
  for select to anon, authenticated using (status = 'published');

create policy "admin read all articles" on public.articles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create policy "admin insert articles" on public.articles
  for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));

create policy "admin update articles" on public.articles
  for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));

create policy "admin delete articles" on public.articles
  for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create index articles_status_pub_idx on public.articles (status, published_at desc);
create index articles_category_idx on public.articles (category);

create trigger articles_updated_at
  before update on public.articles
  for each row execute function public.update_updated_at_column();
