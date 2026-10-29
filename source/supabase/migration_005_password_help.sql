-- SwapStyle: password help.
-- An admin can give a user a temporary password (works even before email sending is set up).
-- Run ONCE in Supabase → SQL Editor. Safe to run again.
create extension if not exists pgcrypto with schema extensions;

create or replace function public.admin_set_password(target uuid, new_password text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can do that.';
  end if;
  if char_length(new_password) < 8 then
    raise exception 'The temporary password is too short.';
  end if;
  update auth.users
     set encrypted_password = extensions.crypt(new_password, extensions.gen_salt('bf')),
         updated_at = now()
   where id = target;
  if not found then
    raise exception 'User not found.';
  end if;
end $$;

revoke all on function public.admin_set_password(uuid, text) from public, anon;
grant execute on function public.admin_set_password(uuid, text) to authenticated;
