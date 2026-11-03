-- Security check for the linked project. Everything rolls back, and any failure raises an error.
-- Run with: pnpm supabase:check
begin;

create function pg_temp.act_as(user_id uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$;

create function pg_temp.refused(statement text)
returns void language plpgsql as $$
begin
  execute statement;
  raise exception 'FAILED, statement was allowed: %', statement using errcode = 'P0002';
exception
  when insufficient_privilege then null;
end;
$$;

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-00000000000a', 'rls-a@example.com', '{"full_name":"Tester A"}'),
  ('00000000-0000-4000-8000-00000000000b', 'rls-b@example.com', '{"full_name":"Tester B"}');
insert into public.wallets (user_id, reference) values
  ('00000000-0000-4000-8000-00000000000a', 'TEST-000001'),
  ('00000000-0000-4000-8000-00000000000b', 'TEST-000002');
insert into public.wallet_pins (user_id, pin_hash) values
  ('00000000-0000-4000-8000-00000000000a', 'hash');
insert into public.transactions (user_id, kind, amount_kobo, category, occurred_on, idempotency_key) values
  ('00000000-0000-4000-8000-00000000000a', 'income', 5000, 'Gift', current_date, 'a-1'),
  ('00000000-0000-4000-8000-00000000000a', 'expense', 2000, 'Food', current_date, 'a-2'),
  ('00000000-0000-4000-8000-00000000000b', 'income', 9000, 'Gift', current_date, 'b-1');

select pg_temp.act_as('00000000-0000-4000-8000-00000000000a');

do $$
begin
  if (select count(*) from public.transactions) <> 2 then raise exception 'FAILED: transactions leak between users'; end if;
  if (select count(*) from public.profiles) <> 1 then raise exception 'FAILED: profiles leak between users'; end if;
  if (select full_name from public.profiles) <> 'Tester A' then raise exception 'FAILED: profile trigger'; end if;
  if (select count(*) from public.notification_preferences) <> 1 then raise exception 'FAILED: preferences trigger'; end if;
  if (select count(*) from public.wallet_balances) <> 1 then raise exception 'FAILED: balance view leaks between users'; end if;
  if (select balance_kobo from public.wallet_balances) <> 3000 then raise exception 'FAILED: balance calculation'; end if;
  if public.is_admin() then raise exception 'FAILED: non-admin reported as admin'; end if;

  update public.notification_preferences set push = true where user_id = '00000000-0000-4000-8000-00000000000b';
  if found then raise exception 'FAILED: updated another user''s preferences'; end if;
end;
$$;

select pg_temp.refused($$select * from public.wallet_pins$$);
select pg_temp.refused($$select * from public.admin_users$$);
select pg_temp.refused($$select * from public.audit_log$$);
select pg_temp.refused($$insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-00000000000a')$$);
select pg_temp.refused($$insert into public.transactions (user_id, kind, amount_kobo, category, occurred_on, idempotency_key) values ('00000000-0000-4000-8000-00000000000a', 'income', 1, 'Gift', current_date, 'x')$$);
select pg_temp.refused($$update public.transactions set amount_kobo = 1$$);
select pg_temp.refused($$delete from public.transactions$$);
select pg_temp.refused($$update public.wallets set reference = 'TEST-999999'$$);
select pg_temp.refused($$update public.app_settings set simulation_mode = false$$);
select pg_temp.refused($$update public.profiles set id = '00000000-0000-4000-8000-00000000000b'$$);
select pg_temp.refused($$insert into public.student_verifications (user_id, institution, matric_number, level, course, school_id_path, status) values ('00000000-0000-4000-8000-00000000000a', 'x', 'x', 'x', 'x', 'x', 'verified')$$);

select 'all RLS checks passed' as result;
rollback;
