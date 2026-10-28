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
