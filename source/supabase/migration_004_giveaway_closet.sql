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
