-- Google-first client onboarding.
--
-- Problem: a new client signing in with Google gets a fresh auth.users row with
-- no matching profile, so RLS gives them nothing and they're locked out. Fixing
-- that by hand (editing an auth record per client) doesn't scale.
--
-- Fix: pre-authorize an email -> client mapping. On signup, mint the profile.

create table if not exists public.client_invites (
  email      text primary key,
  client_id  uuid not null references public.clients(id) on delete cascade,
  role       text not null default 'client',
  full_name  text,
  created_at timestamptz not null default now()
);

alter table public.client_invites enable row level security;

drop policy if exists "admins manage invites" on public.client_invites;
create policy "admins manage invites" on public.client_invites
  for all to authenticated
  using      (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- Fires for every new auth user. NOTE: this Supabase project is shared with the
-- academy (80+ signups), so the function must never raise -- an exception here
-- would abort those signups too. Unmatched emails fall through untouched.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare inv public.client_invites%rowtype;
begin
  select * into inv
    from public.client_invites
   where lower(email) = lower(new.email);

  if found then
    insert into public.profiles (id, client_id, role, full_name)
    values (
      new.id,
      inv.client_id,
      inv.role,
      coalesce(inv.full_name, new.raw_user_meta_data ->> 'full_name', new.email)
    )
    on conflict (id) do nothing;
  end if;

  return new;
exception
  when others then
    raise warning 'handle_new_user failed for %: %', new.email, sqlerrm;
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
