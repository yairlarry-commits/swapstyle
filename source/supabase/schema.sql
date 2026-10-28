-- SwapStyle database schema (reconstructed from the live app).
-- Only needed if you want a NEW Supabase project. Your existing project already has these tables.
-- Run in Supabase → SQL Editor.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  full_name text,
  city text,
  avatar_color text not null default 'slate',
  swap_preference text not null default 'either' check (swap_preference in ('either', 'in_person', 'postal')),
  created_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid(),
  title text not null,
  description text,
  category text not null check (category in ('women', 'men', 'kids', 'accessories')),
  size text not null,
  kids_age_group text,
  item_type text not null default 'single' check (item_type in ('single', 'bundle')),
  bundle_count int not null default 1,
  condition text not null check (condition in ('new', 'like_new', 'good', 'fair')),
  garment_type text not null default 'tshirt',
  color text,
  image_url text,
  status text not null default 'available' check (status in ('available', 'swapped', 'removed')),
  created_at timestamptz not null default now(),
  constraint items_owner_id_fkey foreign key (owner_id) references public.profiles (id) on delete cascade
);

create table if not exists public.swap_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null default auth.uid(),
  requested_item_id uuid not null,
  offered_item_id uuid not null,
  message text,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'countered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint swap_requests_requester_id_fkey foreign key (requester_id) references public.profiles (id) on delete cascade,
  constraint swap_requests_requested_item_id_fkey foreign key (requested_item_id) references public.items (id) on delete cascade,
  constraint swap_requests_offered_item_id_fkey foreign key (offered_item_id) references public.items (id) on delete cascade
);

create index if not exists items_feed_idx on public.items (status, created_at desc);
create index if not exists items_owner_idx on public.items (owner_id);

-- When a swap is accepted, mark both items as swapped
create or replace function public.mark_items_swapped() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    update public.items set status = 'swapped' where id in (new.requested_item_id, new.offered_item_id);
  end if;
  return new;
end $$;

drop trigger if exists on_swap_accepted on public.swap_requests;
create trigger on_swap_accepted after update on public.swap_requests
for each row execute function public.mark_items_swapped();

-- Row level security
alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.swap_requests enable row level security;

create policy "profiles readable by signed-in users" on public.profiles for select to authenticated using (true);
create policy "insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid());

create policy "items readable by signed-in users" on public.items for select to authenticated using (true);
create policy "insert own items" on public.items for insert to authenticated with check (owner_id = auth.uid());
create policy "update own items" on public.items for update to authenticated using (owner_id = auth.uid());

create policy "see swaps I'm part of" on public.swap_requests for select to authenticated using (
  requester_id = auth.uid()
  or exists (select 1 from public.items i where i.id = requested_item_id and i.owner_id = auth.uid())
);
create policy "create swap requests" on public.swap_requests for insert to authenticated with check (
  requester_id = auth.uid()
  and exists (select 1 from public.items i where i.id = offered_item_id and i.owner_id = auth.uid())
);
create policy "owner answers swap requests" on public.swap_requests for update to authenticated using (
  exists (select 1 from public.items i where i.id = requested_item_id and i.owner_id = auth.uid())
);

-- After this file, also run migration_002_chat_and_shipping.sql (chat + shipping + accessories).
