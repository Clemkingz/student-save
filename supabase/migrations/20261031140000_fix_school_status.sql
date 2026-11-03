-- The API refuses an update without a where clause.
create or replace function public.set_school_status(p_status public.school_status)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then return private.fail('forbidden'); end if;
  update public.app_settings set school_status = p_status where id;
  insert into public.audit_log (actor_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'school_status_set', 'app_settings', null, jsonb_build_object('status', p_status));
  return jsonb_build_object('ok', true);
end;
$$;
