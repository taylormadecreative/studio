-- Public print quote requests: new clients submit specs + artwork without a login.
-- Applied to project pgqdmnmessbbzyszjfvr on 2026-07-02 via MCP (print_public_quote_requests).
create table if not exists public.print_quotes (
  id uuid primary key default gen_random_uuid(),
  quote_no bigint generated always as identity (start with 1001),
  name text not null check (char_length(name) between 1 and 120),
  business text check (business is null or char_length(business) <= 160),
  email text not null check (char_length(email) between 3 and 200 and position('@' in email) > 1),
  phone text check (phone is null or char_length(phone) <= 40),
  product text not null check (char_length(product) between 1 and 120),
  quantity text check (quantity is null or char_length(quantity) <= 60),
  size text check (size is null or char_length(size) <= 120),
  deadline text check (deadline is null or char_length(deadline) <= 120),
  notes text check (notes is null or char_length(notes) <= 2000),
  art_paths text[] not null default '{}',
  status text not null default 'new',
  ref text check (ref is null or char_length(ref) <= 20),
  created_at timestamptz not null default now()
);

alter table public.print_quotes enable row level security;

-- Anyone may submit a quote request; only status 'new' can be inserted.
create policy "public can submit quote requests" on public.print_quotes
  for insert to anon, authenticated
  with check (status = 'new' and coalesce(array_length(art_paths, 1), 0) <= 12);

-- Admins may read and manage quotes from the portal.
create policy "admins read quotes" on public.print_quotes
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

create policy "admins update quotes" on public.print_quotes
  for update to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (true);

-- Private bucket for public artwork uploads. Insert-only for anon; no public read.
insert into storage.buckets (id, name, public, file_size_limit)
values ('quote-art', 'quote-art', false, 157286400)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

create policy "public can upload quote art" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'quote-art');
