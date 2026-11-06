-- Money rule checks for the linked project. Everything rolls back, and any failure raises an error.
-- Run with: pnpm supabase:check
begin;

create function pg_temp.act_as(user_id uuid)
returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', user_id, 'role', 'authenticated')::text, true);
  set local role authenticated;
end;
$$;

create function pg_temp.ok(result jsonb, label text)
returns jsonb language plpgsql as $$
begin
  if (result ->> 'ok')::boolean is not true then raise exception 'FAILED %: %', label, result; end if;
  return result;
end;
$$;

create function pg_temp.code(result jsonb, expected text, label text)
returns void language plpgsql as $$
begin
  if result ->> 'code' is distinct from expected then raise exception 'FAILED %: expected %, got %', label, expected, result; end if;
end;
$$;

create function pg_temp.eq(actual anyelement, expected anyelement, label text)
returns void language plpgsql as $$
begin
  if actual is distinct from expected then raise exception 'FAILED %: expected %, got %', label, expected, actual; end if;
end;
$$;

create function pg_temp.balance()
returns bigint language sql as $$
  select balance_kobo from public.wallet_balances;
$$;

insert into auth.users (id, email, encrypted_password, raw_user_meta_data) values
  ('00000000-0000-4000-8000-00000000000a', 'money-a@example.com', extensions.crypt('good-password', extensions.gen_salt('bf', 4)), '{"full_name":"Tester A"}'),
  ('00000000-0000-4000-8000-00000000000b', 'money-b@example.com', null, '{"full_name":"Tester B"}'),
  ('00000000-0000-4000-8000-00000000000c', 'money-admin@example.com', null, '{"full_name":"Admin"}');
insert into public.admin_users (user_id) values ('00000000-0000-4000-8000-00000000000c');

do $$
declare
  a constant uuid := '00000000-0000-4000-8000-00000000000a';
  b constant uuid := '00000000-0000-4000-8000-00000000000b';
  admin constant uuid := '00000000-0000-4000-8000-00000000000c';
  r jsonb;
  today date;
  goal uuid;
  lock_id uuid;
  transfer uuid;
  tx uuid;
  event_id uuid;
  n integer;
begin
  -- Wallet and verification gate
  perform pg_temp.act_as(a);
  perform pg_temp.code(public.record_income(100, 'Gift', null, '', 'k'), 'no_wallet', 'income before wallet');
  perform pg_temp.code(public.create_wallet('12'), 'invalid_pin', 'short pin');
  r := pg_temp.ok(public.create_wallet('1234'), 'create wallet');
  perform pg_temp.eq((r ->> 'reference') ~ '^TEST-[0-9]{6}$', true, 'wallet reference format');
  perform pg_temp.code(public.create_wallet('1234'), 'wallet_exists', 'second wallet');
  perform pg_temp.code(public.record_income(100, 'Gift', null, '', 'k'), 'not_verified', 'income before verification');
  perform pg_temp.code(public.submit_student_verification('Uni', 'M1', '100', 'CS', 'someone-else/id.jpg', 'id.jpg'), 'invalid_school_id', 'id path of another user');
  perform pg_temp.ok(public.submit_student_verification('Uni', 'M1', '100', 'CS', a || '/id.jpg', 'id.jpg'), 'submit verification');
  perform pg_temp.code(public.review_student_verification(a, true, null), 'forbidden', 'student approves self');
  perform pg_temp.code(public.admin_list_verifications(), 'forbidden', 'student reads queue');

  perform pg_temp.act_as(admin);
  perform pg_temp.eq(pg_temp.ok(public.admin_list_verifications(), 'queue') -> 'records' -> 0 ->> 'email', 'money-a@example.com', 'queue shows email');
  perform pg_temp.code(public.review_student_verification(a, false, ''), 'reason_required', 'rejection without reason');
  perform pg_temp.ok(public.review_student_verification(a, false, 'Blurry image'), 'reject');
  perform pg_temp.act_as(a);
  perform pg_temp.eq((select rejection_reason from public.student_verifications), 'Blurry image', 'student sees reason');
  perform pg_temp.ok(public.submit_student_verification('Uni', 'M1', '100', 'CS', a || '/id2.jpg', 'id2.jpg'), 'resubmit');
  perform pg_temp.act_as(admin);
  perform pg_temp.ok(public.review_student_verification(a, true, null), 'approve');
  perform pg_temp.ok(public.set_school_status('in-school'), 'admin school status');

  -- Income, idempotency, and validation
  perform pg_temp.act_as(a);
  today := public.get_app_today();
  perform pg_temp.code(public.set_school_status('out-of-school'), 'forbidden', 'student sets school status');
  perform pg_temp.code(public.record_income(0, 'Gift', null, '', 'zero'), 'invalid_amount', 'zero amount');
  perform pg_temp.code(public.record_income(100, 'Opening balance', null, '', 'bad-cat'), 'invalid_category', 'reserved category');
  perform pg_temp.code(public.record_income(100, '   ', null, '', 'blank-cat'), 'invalid_category', 'blank category');
  perform pg_temp.code(public.record_income(100, repeat('x', 61), null, '', 'long-cat'), 'invalid_category', 'category too long');
  perform pg_temp.ok(public.set_opening_balance(100000, 'open'), 'opening balance');
  perform pg_temp.code(public.set_opening_balance(100000, 'open-2'), 'ledger_not_empty', 'second opening balance');
  perform pg_temp.ok(public.record_income(900000, 'Gift', null, '', 'inc-1'), 'income');
  r := pg_temp.ok(public.record_income(900000, 'Gift', null, '', 'inc-1'), 'income replay');
  perform pg_temp.eq((r ->> 'replayed')::boolean, true, 'replay flagged');
  perform pg_temp.eq(pg_temp.balance(), 1000000::bigint, 'double submit creates one record');

  -- Incoming transfer settles once
  r := pg_temp.ok(public.sim_incoming_transfer(5000000, 'Mum', 'in-1'), 'incoming');
  transfer := (r ->> 'transfer_id')::uuid;
  perform pg_temp.eq(pg_temp.balance(), 1000000::bigint, 'pending incoming not credited');
  perform pg_temp.eq((public.sim_tick() ->> 'settled')::integer, 0, 'nothing due yet');
  reset role;
  update public.sim_transfers set settle_after = now() - interval '1 second' where id = transfer;
  perform pg_temp.act_as(a);
  perform pg_temp.eq((pg_temp.ok(public.sim_tick(), 'tick') ->> 'settled')::integer, 1, 'incoming settled');
  perform pg_temp.eq(pg_temp.balance(), 6000000::bigint, 'incoming credited');
  select id into event_id from public.sim_events where transfer_id = transfer;
  r := pg_temp.ok(public.sim_replay_event(event_id), 'replay event');
  perform pg_temp.eq((r ->> 'applied')::boolean, false, 'replay not applied');
  perform pg_temp.eq((r ->> 'deliveries')::integer, 2, 'replay counted');
  perform pg_temp.eq(pg_temp.balance(), 6000000::bigint, 'replay changes nothing');

  -- Recipients
  perform pg_temp.eq(pg_temp.ok(public.resolve_recipient('901', '0123456789'), 'lookup') ->> 'name', 'Ada Okafor', 'known name');
  perform pg_temp.eq(pg_temp.ok(public.resolve_recipient('901', '5555551234'), 'lookup') ->> 'name', 'Mock Recipient 1234', 'default name');
  perform pg_temp.code(public.resolve_recipient('901', '0000000004'), 'account_not_found', 'lookup fails');
  perform pg_temp.code(public.start_transfer('expense', 100, 'Food', null, '', '901', '0000000004', '1234', 'x'), 'account_not_found', 'transfer to unknown');
  perform pg_temp.code(public.start_transfer('expense', 100, 'Food', null, '', '901', '0123456789', '9999', 'x'), 'pin_incorrect', 'wrong pin');
  perform pg_temp.code(public.start_transfer('expense', 99000000, 'Food', null, '', '901', '0123456789', '1234', 'x'), 'insufficient_balance', 'above balance');

  -- Success holds, then completes
  r := pg_temp.ok(public.start_transfer('expense', 100000, 'Data', null, 'Airtime', '901', '0123456789', '1234', 'pay-1'), 'expense');
  transfer := (r ->> 'transfer_id')::uuid;
  perform pg_temp.eq(pg_temp.balance(), 5900000::bigint, 'pending debit held');
  perform pg_temp.ok(public.sim_settle_transfer(transfer, 'success'), 'settle success');
  perform pg_temp.eq(pg_temp.balance(), 5900000::bigint, 'settled debit');
  perform pg_temp.eq((select status::text from public.transactions where sim_transfer_id = transfer), 'completed', 'status completed');
  perform pg_temp.eq((pg_temp.ok(public.sim_settle_transfer(transfer, 'failed'), 'late failure') ->> 'applied')::boolean, false, 'settled cannot fail');

  -- Failure releases funds
  r := pg_temp.ok(public.start_transfer('withdrawal', 200000, null, null, '', '901', '0000000001', '1234', 'wd-fail'), 'failing withdrawal');
  transfer := (r ->> 'transfer_id')::uuid;
  perform pg_temp.eq(pg_temp.balance(), 5700000::bigint, 'failing withdrawal held');
  reset role;
  update public.sim_transfers set settle_after = now() - interval '1 second' where id = transfer;
  perform pg_temp.act_as(a);
  perform public.sim_tick();
  perform pg_temp.eq(pg_temp.balance(), 5900000::bigint, 'failed withdrawal released');
  perform pg_temp.eq((select status::text from public.transactions where sim_transfer_id = transfer), 'failed', 'status failed');

  -- Held funds cannot be spent twice
  r := pg_temp.ok(public.start_transfer('withdrawal', 5000000, null, null, '', '901', '0000000002', '1234', 'wd-hold'), 'held withdrawal');
  transfer := (r ->> 'transfer_id')::uuid;
  perform pg_temp.eq((select settle_after from public.sim_transfers where id = transfer), null::timestamptz, 'hold never auto-settles');
  perform pg_temp.code(public.start_transfer('expense', 1000000, 'Food', null, '', '901', '0123456789', '1234', 'over-hold'), 'insufficient_balance', 'held funds spent twice');
  perform pg_temp.ok(public.sim_settle_transfer(transfer, 'failed'), 'release hold');
  perform pg_temp.eq(pg_temp.balance(), 5900000::bigint, 'hold released');

  -- Reversal returns funds once
  r := pg_temp.ok(public.start_transfer('expense', 300000, 'Food', null, '', '901', '0000000003', '1234', 'rev'), 'reversal transfer');
  transfer := (r ->> 'transfer_id')::uuid;
  perform pg_temp.ok(public.sim_settle_transfer(transfer, 'success'), 'reversal success');
  perform pg_temp.eq(pg_temp.balance(), 5600000::bigint, 'before reversal');
  perform pg_temp.ok(public.sim_settle_transfer(transfer, 'reversed'), 'reverse');
  perform pg_temp.eq(pg_temp.balance(), 5900000::bigint, 'after reversal');
  perform pg_temp.ok(public.sim_settle_transfer(transfer, 'reversed'), 'reverse replay');
  perform pg_temp.eq(pg_temp.balance(), 5900000::bigint, 'reversal applied once');

  -- Budgets
  perform pg_temp.ok(public.create_budget('Data', 200000), 'budget');
  perform pg_temp.eq((select spent_kobo from public.budget_usage where category = 'Data'), 100000::bigint, 'Data budget shows spending');
  perform pg_temp.code(public.create_budget('Data', 100), 'budget_exists', 'duplicate budget');
  perform pg_temp.code(public.create_budget('Food', 99000000), 'budget_exceeds_available', 'budget above ceiling');
  perform pg_temp.ok(public.create_budget('Gym membership', 100), 'custom budget category');
  perform pg_temp.code(public.create_budget('Withdrawal', 100), 'invalid_category', 'reserved budget category');

  -- Manual goal, target, and withdrawal
  goal := (pg_temp.ok(public.create_goal('Laptop', 300000, null, 'goal-1'), 'goal') ->> 'goal_id')::uuid;
  perform pg_temp.eq((public.create_goal('Laptop', 300000, null, 'goal-1') ->> 'goal_id')::uuid, goal, 'goal double submit');
  perform pg_temp.code(public.withdraw_goal(goal, 0, '1234'), 'target_not_reached', 'early goal withdrawal');
  perform pg_temp.code(public.contribute_to_goal(goal, 300001, '1234', 'c-over'), 'exceeds_goal_target', 'above target');
  perform pg_temp.ok(public.contribute_to_goal(goal, 300000, '1234', 'c-1'), 'contribute');
  perform pg_temp.eq((select saved_kobo from public.goal_progress where id = goal), 300000::bigint, 'goal progress');
  perform pg_temp.eq(pg_temp.balance(), 5600000::bigint, 'contribution deducted');
  perform pg_temp.code(public.withdraw_goal(goal, 1, '1234'), 'saved_amount_changed', 'stale goal withdrawal');
  perform pg_temp.ok(public.withdraw_goal(goal, 300000, '1234'), 'goal withdrawal');
  perform pg_temp.eq(pg_temp.balance(), 5900000::bigint, 'goal returned');
  perform pg_temp.code(public.withdraw_goal(goal, 300000, '1234'), 'already_withdrawn', 'second goal withdrawal');
  perform pg_temp.code(public.set_goal_contribution_settings(goal, 'manual', null, null, null), 'already_withdrawn', 'settings after withdrawal');

  -- Automatic savings: catch-up, cap at target
  goal := (pg_temp.ok(public.create_goal('Trip', 550, null, 'goal-2'), 'auto goal') ->> 'goal_id')::uuid;
  perform pg_temp.code(public.set_goal_contribution_settings(goal, 'auto', 100, 'daily', '0000'), 'pin_incorrect', 'auto without pin');
  perform pg_temp.ok(public.set_goal_contribution_settings(goal, 'auto', 100, 'daily', '1234'), 'auto on');
  perform pg_temp.code(public.contribute_to_goal(goal, 100, '1234', 'c-auto'), 'goal_is_automatic', 'manual contribution to automatic goal');
  perform pg_temp.eq(pg_temp.ok(public.sim_advance_days(7), 'advance') ->> 'contributed', '6', 'six contributions to target');
  perform pg_temp.eq((select saved_kobo from public.goal_progress where id = goal), 550::bigint, 'stops at target');
  perform pg_temp.eq((select min(amount_kobo) from public.transactions where goal_id = goal), 50::bigint, 'last contribution capped');
  perform pg_temp.eq(public.get_app_today(), today + 7, 'clock advanced');
  perform pg_temp.code(public.sim_advance_days(-1), 'invalid_days', 'clock cannot go back');

  -- Pause
  goal := (pg_temp.ok(public.create_goal('Bag', 1000, null, 'goal-3'), 'pause goal') ->> 'goal_id')::uuid;
  perform pg_temp.ok(public.set_goal_contribution_settings(goal, 'auto', 100, 'daily', '1234'), 'pause goal auto');
  perform pg_temp.ok(public.pause_goal_contributions(goal), 'pause');
  perform public.sim_advance_days(1);
  perform pg_temp.eq((select saved_kobo from public.goal_progress where id = goal), 0::bigint, 'paused goal skipped');

  -- Lock savings fee
  perform pg_temp.code(public.create_lock_commitment(1, 100, today, '', '1234', 'lock-past'), 'invalid_start_date', 'past lock start');
  perform pg_temp.code(public.create_lock_commitment(4, 100, public.get_app_today(), '', '1234', 'lock-plan'), 'invalid_plan', 'bad lock plan');
  n := pg_temp.balance();
  lock_id := (pg_temp.ok(public.create_lock_commitment(1, 12345, public.get_app_today(), 'Rent', '1234', 'lock-1'), 'lock') ->> 'commitment_id')::uuid;
  perform pg_temp.eq(pg_temp.balance(), n - 12345::bigint, 'lock deducted');
  r := pg_temp.ok(public.collect_lock_commitment(lock_id, '1234'), 'collect');
  perform pg_temp.eq((r ->> 'fee_kobo')::bigint, 617::bigint, 'fee rounded to nearest kobo');
  perform pg_temp.eq(pg_temp.balance(), n - 617::bigint, 'net returned');
  perform pg_temp.code(public.collect_lock_commitment(lock_id, '1234'), 'already_collected', 'second collection');

  -- Edit and delete
  n := pg_temp.balance();
  tx := (pg_temp.ok(public.record_income(1000, 'Gift', null, '', 'edit-1'), 'income to edit') ->> 'transaction_id')::uuid;
  perform pg_temp.ok(public.update_transaction(tx, 400, 'Salary', null, 'Fixed', '1234'), 'edit');
  perform pg_temp.eq(pg_temp.balance(), n + 400::bigint, 'edit recalculates');
  perform pg_temp.ok(public.delete_transaction(tx, '1234'), 'delete');
  perform pg_temp.eq(pg_temp.balance(), n::bigint, 'delete recalculates');
  perform pg_temp.code(public.delete_transaction(tx, '1234'), 'not_found', 'second delete');
  tx := (select id from public.transactions where kind = 'lock_fee' limit 1);
  perform pg_temp.code(public.delete_transaction(tx, '1234'), 'not_editable', 'system rows protected');

  -- Automatic contributions wait for funds, then catch up
  perform pg_temp.ok(public.sim_reset_my_data(), 'reset');
  perform pg_temp.eq(pg_temp.balance(), 0::bigint, 'reset ledger');
  perform pg_temp.eq(public.get_app_today(), today, 'reset clock');
  perform pg_temp.ok(public.record_income(150, 'Gift', null, '', 'small'), 'small income');
  goal := (pg_temp.ok(public.create_goal('Phone', 1000, null, 'goal-4'), 'blocked goal') ->> 'goal_id')::uuid;
  perform pg_temp.ok(public.set_goal_contribution_settings(goal, 'auto', 100, 'daily', '1234'), 'blocked auto');
  r := public.sim_advance_days(7);
  perform pg_temp.eq(r -> 'blocked' ->> 0, 'Phone', 'goal blocked');
  perform pg_temp.eq((select saved_kobo from public.goal_progress where id = goal), 100::bigint, 'paid until funds ran out');
  perform pg_temp.eq((select blocked_since is not null from public.savings_goals where id = goal), true, 'blocked noted');
  perform pg_temp.ok(public.record_income(1000, 'Gift', null, '', 'top-up'), 'top up');
  r := pg_temp.ok(public.sim_tick(), 'tick after top up');
  perform pg_temp.eq(r ->> 'contributed', '6', 'catches up all missed days');
  perform pg_temp.eq((select blocked_since is null from public.savings_goals where id = goal), true, 'block cleared');

  -- Monthly schedule keeps the chosen day
  reset role;
  perform pg_temp.eq(private.next_contribution_on('2027-01-31', 'monthly', 31), '2027-02-28'::date, 'month end clamps');
  perform pg_temp.eq(private.next_contribution_on('2027-02-28', 'monthly', 31), '2027-03-31'::date, 'anchor day restored');
  perform pg_temp.eq(private.next_contribution_on('2027-12-15', 'monthly', 15), '2028-01-15'::date, 'year rolls over');
  perform pg_temp.eq(private.next_contribution_on('2027-01-01', 'weekly', 1), '2027-01-08'::date, 'weekly');
  perform pg_temp.act_as(a);

  -- PIN lockout
  perform pg_temp.code(public.collect_lock_commitment(gen_random_uuid(), '0000'), 'pin_incorrect', 'wrong 1');
  perform pg_temp.code(public.collect_lock_commitment(gen_random_uuid(), '0000'), 'pin_incorrect', 'wrong 2');
  perform pg_temp.code(public.collect_lock_commitment(gen_random_uuid(), '0000'), 'pin_incorrect', 'wrong 3');
  perform pg_temp.code(public.collect_lock_commitment(gen_random_uuid(), '0000'), 'pin_incorrect', 'wrong 4');
  perform pg_temp.code(public.collect_lock_commitment(gen_random_uuid(), '0000'), 'pin_locked', 'wrong 5 locks');
  perform pg_temp.code(public.collect_lock_commitment(gen_random_uuid(), '1234'), 'pin_locked', 'right pin while locked');
  perform pg_temp.code(public.reset_pin('good-password', '4321'), 'pin_locked', 'reset while locked');
  reset role;
  perform pg_temp.eq((select locked_until > now() from public.wallet_pins where user_id = a), true, 'lockout saved');
  update public.wallet_pins set locked_until = null where user_id = a;
  perform pg_temp.act_as(a);
  perform pg_temp.code(public.reset_pin('wrong-password', '4321'), 'password_incorrect', 'reset wrong password');
  perform pg_temp.ok(public.reset_pin('good-password', '4321'), 'reset pin');
  perform pg_temp.code(public.collect_lock_commitment(gen_random_uuid(), '1234'), 'pin_incorrect', 'old pin refused');
  perform pg_temp.code(public.collect_lock_commitment(gen_random_uuid(), '4321'), 'not_found', 'new pin works');

  -- Export contains data and no PIN hash
  r := pg_temp.ok(public.export_my_data(), 'export');
  perform pg_temp.eq(jsonb_array_length(r -> 'transactions') > 0, true, 'export has records');
  perform pg_temp.eq(r::text like '%pin_hash%', false, 'export hides pin');

  -- Other users' data
  perform pg_temp.act_as(b);
  perform pg_temp.ok(public.create_wallet('1111'), 'b wallet');
  perform pg_temp.code(public.pause_goal_contributions(goal), 'not_verified', 'b unverified');
  reset role;
  insert into public.student_verifications (user_id, institution, matric_number, level, course, school_id_path, status)
  values (b, 'Uni', 'M2', '100', 'CS', b || '/id.jpg', 'verified');
  perform pg_temp.act_as(b);
  perform pg_temp.code(public.pause_goal_contributions(goal), 'not_found', 'cannot pause another user''s goal');
  perform pg_temp.code(public.contribute_to_goal(goal, 1, '1111', 'steal'), 'goal_unavailable', 'cannot contribute to another user''s goal');
  reset role;
end;
$$;

select 'all money checks passed' as result;
rollback;
