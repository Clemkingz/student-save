-- Lets screens that still keep finance data in the browser check the PIN on the server.
-- Remove once Phase 4 moves those screens to the money RPCs, which check the PIN themselves.
create function public.verify_pin(p_pin text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text := private.begin_money(v_user, false);
begin
  if v_code is null then v_code := private.check_pin(v_user, p_pin); end if;
  if v_code is not null then return private.fail(v_code); end if;
  return jsonb_build_object('ok', true);
end;
$$;

revoke execute on function public.verify_pin(text) from public, anon;
grant execute on function public.verify_pin(text) to authenticated;
