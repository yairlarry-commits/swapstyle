-- SwapStyle: admin mode + reports.
-- Run ONCE in Supabase → SQL Editor (after migration_002). Safe to run again.

-- 1) Who is an admin, who is suspended
alter table public.profiles
  add column if not exists is_admin boolean not null default false,
  add column if not exists banned boolean not null default false;

-- Make YOUR account the admin (change the username if yours is different)
update public.profiles set is_admin = true where lower(username) = lower('YAYA');

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$$;

create or replace function public.is_banned() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select banned from public.profiles where id = auth.uid()), false);
$$;

-- Nobody can make themselves admin or lift their own suspension
create or replace function public.protect_profile_flags() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    new.is_admin := old.is_admin;
    new.banned := old.banned;
  end if;
  return new;
end $$;
drop trigger if exists protect_profile_flags on public.profiles;
create trigger protect_profile_flags before update on public.profiles
for each row execute function public.protect_profile_flags();

-- 2) Reports from users
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  target_type text not null check (target_type in ('item', 'profile', 'swap')),
  target_id uuid not null,
  reason text not null check (reason in ('inappropriate', 'misleading', 'harassment', 'spam', 'other')),
  details text check (char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by uuid references public.profiles (id),
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists reports_status_idx on public.reports (status, created_at desc);
alter table public.reports enable row level security;

drop policy if exists "report things" on public.reports;
create policy "report things" on public.reports for insert to authenticated with check (reporter_id = auth.uid());
drop policy if exists "see my reports, admins see all" on public.reports;
create policy "see my reports, admins see all" on public.reports for select to authenticated using (reporter_id = auth.uid() or public.is_admin());
drop policy if exists "admins handle reports" on public.reports;
create policy "admins handle reports" on public.reports for update to authenticated using (public.is_admin());

-- 3) Admins can moderate everything
drop policy if exists "admins update any item" on public.items;
create policy "admins update any item" on public.items for update to authenticated using (public.is_admin());
drop policy if exists "admins delete any item" on public.items;
create policy "admins delete any item" on public.items for delete to authenticated using (public.is_admin());
drop policy if exists "admins update any profile" on public.profiles;
create policy "admins update any profile" on public.profiles for update to authenticated using (public.is_admin());
drop policy if exists "admins read all swaps" on public.swap_requests;
create policy "admins read all swaps" on public.swap_requests for select to authenticated using (public.is_admin());
drop policy if exists "admins read all messages" on public.swap_messages;
create policy "admins read all messages" on public.swap_messages for select to authenticated using (public.is_admin());
drop policy if exists "admins delete messages" on public.swap_messages;
create policy "admins delete messages" on public.swap_messages for delete to authenticated using (public.is_admin());

-- 4) Suspended users can't post, request swaps or send messages
-- (RESTRICTIVE: applies on top of whatever insert rules already exist)
drop policy if exists "not suspended: items" on public.items;
create policy "not suspended: items" on public.items as restrictive for insert to authenticated with check (not public.is_banned());
drop policy if exists "not suspended: swaps" on public.swap_requests;
create policy "not suspended: swaps" on public.swap_requests as restrictive for insert to authenticated with check (not public.is_banned());
drop policy if exists "not suspended: messages" on public.swap_messages;
create policy "not suspended: messages" on public.swap_messages as restrictive for insert to authenticated with check (not public.is_banned());
