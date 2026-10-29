-- New-project extras: a profile is created automatically at sign-up (works with email confirmation on),
-- and the YAYA account becomes the admin as soon as it signs up.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, avatar_color, city)
  values (
    new.id,
    coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(new.email, '@', 1)),
    coalesce(nullif(new.raw_user_meta_data->>'avatar_color', ''), 'slate'),
    nullif(new.raw_user_meta_data->>'city', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.make_owner_admin() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if lower(new.username) = 'yaya' then new.is_admin := true; end if;
  return new;
end $$;
drop trigger if exists make_owner_admin on public.profiles;
create trigger make_owner_admin before insert on public.profiles
for each row execute function public.make_owner_admin();
