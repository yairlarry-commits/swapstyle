-- SwapStyle: everything the live site needs, in one go.
-- Supabase → SQL Editor → New query → paste ALL of this → Run. Safe to run more than once.
-- (Before running: make sure the YAYA account exists, so it becomes the admin.)

-- ============ Chat + how the swap happens (migration_002_chat_and_shipping.sql) ============
-- SwapStyle: chat + swap method (in person / shipping).
-- Run ONCE in Supabase → SQL Editor on your existing project. Safe to run again.

-- 1) How each swap happens, and each side's progress
alter table public.swap_requests
  add column if not exists method text not null default 'in_person',
  add column if not exists requester_address jsonb,
  add column if not exists owner_address jsonb,
  add column if not exists requester_paid boolean not null default false,
  add column if not exists owner_paid boolean not null default false,
  add column if not exists requester_tracking text,
  add column if not exists owner_tracking text,
  add column if not exists requester_done boolean not null default false,
  add column if not exists owner_done boolean not null default false;

-- allow the new "completed" status (drops the old status check if there is one)
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.swap_requests'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%status%'
  loop
    execute format('alter table public.swap_requests drop constraint %I', c);
  end loop;
end $$;
alter table public.swap_requests
  add constraint swap_requests_status_check check (status in ('pending', 'accepted', 'declined', 'countered', 'completed'));

-- allow the "accessories" category (drops the old category check if there is one)
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.items'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%category%'
  loop
    execute format('alter table public.items drop constraint %I', c);
  end loop;
end $$;
alter table public.items
  add constraint items_category_check check (category in ('women', 'men', 'kids', 'accessories'));

-- both sides of a swap may update its progress (address, payment, tracking, done)
drop policy if exists "owner answers swap requests" on public.swap_requests;
drop policy if exists "participants update swap" on public.swap_requests;
create policy "participants update swap" on public.swap_requests for update to authenticated using (
  requester_id = auth.uid()
  or exists (select 1 from public.items i where i.id = requested_item_id and i.owner_id = auth.uid())
);

-- 2) Chat messages, one thread per swap
create table if not exists public.swap_messages (
  id uuid primary key default gen_random_uuid(),
  swap_id uuid not null references public.swap_requests (id) on delete cascade,
  sender_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists swap_messages_swap_idx on public.swap_messages (swap_id, created_at);

alter table public.swap_messages enable row level security;

drop policy if exists "read messages of my swaps" on public.swap_messages;
create policy "read messages of my swaps" on public.swap_messages for select to authenticated using (
  exists (
    select 1 from public.swap_requests s
    join public.items i on i.id = s.requested_item_id
    where s.id = swap_id and (s.requester_id = auth.uid() or i.owner_id = auth.uid())
  )
);

drop policy if exists "write messages in my swaps" on public.swap_messages;
create policy "write messages in my swaps" on public.swap_messages for insert to authenticated with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.swap_requests s
    join public.items i on i.id = s.requested_item_id
    where s.id = swap_id and (s.requester_id = auth.uid() or i.owner_id = auth.uid())
  )
);

-- ============ Admin + reports (migration_003_admin_and_reports.sql) ============
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

-- ============ Giveaway closet + completing swaps (migration_004_giveaway_closet.sql) ============
-- SwapStyle: a second closet for giving items away (free), next to the swap closet.
-- Run ONCE in Supabase → SQL Editor (after migration_002 and 003). Safe to run again.

-- 1) Which closet an item is in: 'swap' (default) or 'give'
alter table public.items add column if not exists listing text not null default 'swap';
do $$
declare c text;
begin
  for c in
    select conname from pg_constraint
    where conrelid = 'public.items'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%listing%'
  loop
    execute format('alter table public.items drop constraint %I', c);
  end loop;
end $$;
alter table public.items add constraint items_listing_check check (listing in ('swap', 'give'));

-- 2) Asking for a free item: a request with no item offered in return
alter table public.swap_requests alter column offered_item_id drop not null;

drop policy if exists "ask for a free item" on public.swap_requests;
create policy "ask for a free item" on public.swap_requests for insert to authenticated with check (
  requester_id = auth.uid()
  and offered_item_id is null
  and exists (
    select 1 from public.items i
    where i.id = requested_item_id and i.listing = 'give' and i.status = 'available' and i.owner_id <> auth.uid()
  )
);

-- 3) A swap is complete once both sides confirmed (a free item: once the receiver confirmed).
--    Done in the database so it works even if both confirm at the same moment.
create or replace function public.complete_when_confirmed() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.status in ('accepted', 'pending') and new.requester_done
     and (new.owner_done or new.offered_item_id is null) then
    new.status := 'completed';
  end if;
  return new;
end $$;
drop trigger if exists complete_when_confirmed on public.swap_requests;
create trigger complete_when_confirmed before update on public.swap_requests
for each row execute function public.complete_when_confirmed();

-- fix swaps that were confirmed by both sides but never marked complete
update public.swap_requests set status = 'completed'
where status = 'accepted' and requester_done and (owner_done or offered_item_id is null);
