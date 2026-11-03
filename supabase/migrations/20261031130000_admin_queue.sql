-- The review queue needs student emails, which only auth.users holds.
create function public.admin_list_verifications()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then return private.fail('forbidden'); end if;
  return jsonb_build_object('ok', true, 'records', coalesce((
    select jsonb_agg(jsonb_build_object(
      'user_id', v.user_id, 'email', u.email, 'institution', v.institution,
      'matric_number', v.matric_number, 'level', v.level, 'course', v.course,
      'school_id_path', v.school_id_path, 'school_id_file_name', v.school_id_file_name,
      'status', v.status, 'submitted_at', v.submitted_at, 'reviewed_at', v.reviewed_at,
      'rejection_reason', v.rejection_reason
    ) order by v.submitted_at desc)
    from public.student_verifications v
    join auth.users u on u.id = v.user_id
  ), '[]'::jsonb));
end;
$$;

revoke execute on function public.admin_list_verifications() from public, anon;
grant execute on function public.admin_list_verifications() to authenticated;
