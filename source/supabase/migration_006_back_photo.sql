-- SwapStyle: optional extra photos of an item: the back, and the item being worn.
-- Run ONCE in Supabase → SQL Editor. Safe to run again.
alter table public.items add column if not exists back_image_url text;
-- and an optional photo of the item being worn (shown only when someone asks to see it)
alter table public.items add column if not exists worn_image_url text;
