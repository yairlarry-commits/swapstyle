-- SwapStyle: a second photo of the back of an item (optional).
-- Run ONCE in Supabase → SQL Editor. Safe to run again.
alter table public.items add column if not exists back_image_url text;
