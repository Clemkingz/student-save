-- Money rules. Clients call the public functions; private helpers are not exposed.
-- Functions return { ok: false, code } instead of raising, so a wrong PIN count is kept.

alter table public.savings_goals add column client_key text;
alter table public.savings_goals add constraint savings_goals_client_key_unique unique (user_id, client_key);

-- Helpers

create function private.app_today(p_user uuid)
returns date language sql stable security definer set search_path = '' as $$
  select (now() at time zone 'Africa/Lagos')::date
    + coalesce((select offset_days from public.sim_clocks where user_id = p_user), 0);
$$;

create function private.fail(p_code text)
returns jsonb language sql immutable set search_path = '' as $$
  select jsonb_build_object('ok', false, 'code', p_code);
$$;

create function private.valid_amount(p_amount bigint)
returns boolean language sql immutable set search_path = '' as $$
  select p_amount is not null and p_amount > 0 and p_amount <= 1000000000000;
$$;

create function private.expense_categories()
returns text[] language sql immutable set search_path = '' as $$
  select array['Food', 'Transport', 'Travelling', 'Textbook', 'Laptop', 'Accommodation',
    'Utilities', 'Healthcare', 'Entertainment', 'Data', 'Other'];
$$;

create function private.income_categories()
returns text[] language sql immutable set search_path = '' as $$
  select array['Allowance', 'Salary', 'Scholarship', 'Gift', 'Freelance', 'Other'];
$$;

create function private.balance(p_user uuid)
returns bigint language sql stable set search_path = '' as $$
  select coalesce(sum(
    case
      when kind in ('income', 'opening_balance', 'deposit', 'goal_withdrawal', 'lock_collection', 'transfer_reversal')
        then case when status = 'completed' then amount_kobo else 0 end
      else case when status in ('completed', 'pending') then -amount_kobo else 0 end
    end
  ), 0)::bigint
  from public.transactions
  where user_id = p_user and deleted_at is null;
$$;

create function private.goal_saved(p_goal uuid)
returns bigint language sql stable set search_path = '' as $$
  select coalesce(sum(amount_kobo), 0)::bigint
  from public.transactions
  where goal_id = p_goal and kind = 'goal_contribution' and status = 'completed' and deleted_at is null;
$$;

-- Takes the per-user lock. Returns an error code, or null when money actions may continue.
create function private.begin_money(p_user uuid, p_require_verified boolean default true)
returns text language plpgsql set search_path = '' as $$
begin
  if p_user is null then return 'not_authenticated'; end if;
  perform 1 from public.wallets where user_id = p_user for update;
  if not found then return 'no_wallet'; end if;
  if p_require_verified and not exists (
    select 1 from public.student_verifications where user_id = p_user and status = 'verified'
  ) then
    return 'not_verified';
  end if;
  return null;
end;
$$;

create function private.record_failed_attempt(p_user uuid)
returns text language plpgsql set search_path = '' as $$
declare
  v_attempts integer;
begin
  update public.wallet_pins set failed_attempts = failed_attempts + 1, updated_at = now()
  where user_id = p_user returning failed_attempts into v_attempts;
  if v_attempts >= 5 then
    update public.wallet_pins set failed_attempts = 0, locked_until = now() + interval '15 minutes'
    where user_id = p_user;
    insert into public.audit_log (actor_id, action, target_type, target_id)
    values (p_user, 'pin_locked', 'wallet', p_user::text);
    return 'pin_locked';
  end if;
  return 'pin_incorrect';
end;
$$;

-- Returns an error code, or null when the PIN is correct.
create function private.check_pin(p_user uuid, p_pin text)
returns text language plpgsql set search_path = '' as $$
declare
  v_pin public.wallet_pins;
begin
  select * into v_pin from public.wallet_pins where user_id = p_user;
  if not found then return 'pin_not_set'; end if;
  if v_pin.locked_until > now() then return 'pin_locked'; end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' or extensions.crypt(p_pin, v_pin.pin_hash) <> v_pin.pin_hash then
    return private.record_failed_attempt(p_user);
  end if;
  if v_pin.failed_attempts > 0 or v_pin.locked_until is not null then
    update public.wallet_pins set failed_attempts = 0, locked_until = null where user_id = p_user;
  end if;
  return null;
end;
$$;

create function private.replay(p_user uuid, p_key text)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object('ok', true, 'replayed', true, 'transaction_id', id, 'status', status)
  from public.transactions
  where user_id = p_user and idempotency_key = p_key;
$$;

create function private.post(
  p_user uuid,
  p_kind public.transaction_kind,
  p_amount bigint,
  p_category text,
  p_on date,
  p_note text,
  p_key text,
  p_status public.transaction_status default 'completed',
  p_source public.transaction_source default 'manual',
  p_receipt boolean default false,
  p_goal uuid default null,
  p_commitment uuid default null,
  p_sim_transfer uuid default null,
  p_recipient_name text default null,
  p_recipient_bank text default null,
  p_recipient_account text default null
)
returns uuid language plpgsql set search_path = '' as $$
declare
  v_id uuid;
begin
  insert into public.transactions (
    user_id, kind, amount_kobo, category, occurred_on, note, idempotency_key, status, source,
    receipt_number, receipt_created_at, goal_id, commitment_id, sim_transfer_id,
    recipient_name, recipient_bank, recipient_account_number
  ) values (
    p_user, p_kind, p_amount, p_category, p_on, left(coalesce(p_note, ''), 120), p_key, p_status, p_source,
    case when p_receipt then 'SS-' || to_char(now(), 'YYYYMMDDHH24MISSMS') || '-' || upper(left(gen_random_uuid()::text, 6)) end,
    case when p_receipt then now() end,
    p_goal, p_commitment, p_sim_transfer, p_recipient_name, p_recipient_bank, p_recipient_account
  ) returning id into v_id;
  return v_id;
end;
$$;

create function private.next_contribution_on(p_date date, p_frequency public.contribution_frequency, p_anchor integer)
returns date language plpgsql immutable set search_path = '' as $$
declare
  v_first date;
begin
  if p_frequency = 'daily' then return p_date + 1; end if;
  if p_frequency = 'weekly' then return p_date + 7; end if;
  v_first := (date_trunc('month', p_date) + interval '1 month')::date;
  return v_first + (least(p_anchor, extract(day from v_first + interval '1 month - 1 day')::integer) - 1);
end;
$$;

-- Keeps the behavior of the old applyDueContributions: catches up in order, stops at
-- the target, and waits when funds run out. The caller must hold the wallet lock.
create function private.run_due_for_user(p_user uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_today date := private.app_today(p_user);
  v_goal public.savings_goals;
  v_balance bigint := private.balance(p_user);
  v_saved bigint;
  v_amount bigint;
  v_due date;
  v_key text;
  v_count integer := 0;
  v_blocked text[] := '{}';
  v_is_blocked boolean;
begin
  for v_goal in
    select * from public.savings_goals
    where user_id = p_user and auto_enabled and contribution_method = 'auto'
      and withdrawn_at is null and auto_amount_kobo > 0 and next_contribution_on <= v_today
    order by created_at desc
    for update
  loop
    v_saved := private.goal_saved(v_goal.id);
    v_due := v_goal.next_contribution_on;
    v_is_blocked := false;
    while v_due <= v_today and v_saved < v_goal.target_kobo loop
      v_amount := least(v_goal.auto_amount_kobo, v_goal.target_kobo - v_saved);
      if v_amount > v_balance then
        v_is_blocked := true;
        v_blocked := v_blocked || v_goal.name;
        exit;
      end if;
      v_key := 'goal-auto:' || v_goal.id || ':' || v_due;
      if not exists (select 1 from public.transactions where user_id = p_user and idempotency_key = v_key) then
        perform private.post(
          p_user, 'goal_contribution', v_amount, 'Savings contribution', v_today,
          'Automatic contribution to ' || v_goal.name || ' · scheduled ' || v_due, v_key,
          p_source => 'auto', p_goal => v_goal.id
        );
        v_saved := v_saved + v_amount;
        v_balance := v_balance - v_amount;
        v_count := v_count + 1;
      end if;
      v_due := private.next_contribution_on(v_due, v_goal.auto_frequency, v_goal.schedule_day);
    end loop;
    update public.savings_goals
    set next_contribution_on = v_due,
        blocked_since = case when v_is_blocked then coalesce(blocked_since, now()) end
    where id = v_goal.id;
  end loop;
  return jsonb_build_object('contributed', v_count, 'blocked', to_jsonb(v_blocked));
end;
$$;

-- Hourly job. One user's failure does not stop the others.
create function private.run_due_contributions()
returns integer language plpgsql set search_path = '' as $$
declare
  v_user uuid;
  v_done integer := 0;
begin
  for v_user in
    select user_id from public.savings_goals
    where auto_enabled and withdrawn_at is null and next_contribution_on <= private.app_today(user_id)
    group by user_id
    order by bool_or(blocked_since is null) desc, user_id
    limit 500
  loop
    begin
      perform 1 from public.wallets where user_id = v_user for update skip locked;
      if found then
        perform private.run_due_for_user(v_user);
        v_done := v_done + 1;
      end if;
    exception when others then
      insert into public.audit_log (actor_id, action, target_type, target_id, metadata)
      values (v_user, 'auto_contribution_failed', 'wallet', v_user::text, jsonb_build_object('error', sqlerrm));
    end;
  end loop;
  return v_done;
end;
$$;

-- The only function allowed to settle a transfer. A real provider webhook could call
-- the same logic later. Applies each event once. The caller must hold the wallet lock.
create function private.apply_transfer_event(p_transfer uuid, p_type public.sim_event_type)
returns boolean language plpgsql set search_path = '' as $$
declare
  v_transfer public.sim_transfers;
  v_key text := 'transfer:' || p_transfer || ':' || p_type;
  v_today date;
begin
  select * into v_transfer from public.sim_transfers where id = p_transfer for update;
  if not found then return false; end if;

  update public.sim_events set deliveries = deliveries + 1 where event_key = v_key;
  if found then return false; end if;

  if (p_type = 'reversed' and v_transfer.status <> 'success')
    or (p_type <> 'reversed' and v_transfer.status <> 'pending') then
    return false;
  end if;

  insert into public.sim_events (user_id, transfer_id, event_type, event_key)
  values (v_transfer.user_id, p_transfer, p_type, v_key);
  v_today := private.app_today(v_transfer.user_id);

  if p_type = 'success' then
    if v_transfer.direction = 'incoming' then
      perform private.post(
        v_transfer.user_id, 'deposit', v_transfer.amount_kobo, 'Bank transfer', v_today,
        'Simulated transfer from ' || v_transfer.counterparty, 'sim-deposit:' || p_transfer,
        p_source => 'simulated_bank', p_receipt => true, p_sim_transfer => p_transfer
      );
    else
      update public.transactions set status = 'completed' where sim_transfer_id = p_transfer and status = 'pending';
    end if;
    update public.sim_transfers
    set status = 'success', settled_at = now(),
        reverse_after = case when scenario = 'reverse' then now() + interval '3 seconds' end
    where id = p_transfer;
  elsif p_type = 'failed' then
    update public.transactions set status = 'failed' where sim_transfer_id = p_transfer and status = 'pending';
    update public.sim_transfers set status = 'failed', settled_at = now() where id = p_transfer;
  else
    perform private.post(
      v_transfer.user_id, 'transfer_reversal', v_transfer.amount_kobo, 'Transfer reversal', v_today,
      'Simulated reversal from ' || v_transfer.counterparty, 'sim-reversal:' || p_transfer,
      p_source => 'simulated_bank', p_receipt => true, p_sim_transfer => p_transfer
    );
    update public.sim_transfers set status = 'reversed', reverse_after = null where id = p_transfer;
  end if;
  return true;
end;
$$;

create function private.sim_enabled()
returns boolean language sql stable set search_path = '' as $$
  select simulation_mode from public.app_settings;
$$;

-- Account and wallet

create function public.get_app_today()
returns date language sql stable security definer set search_path = '' as $$
  select private.app_today((select auth.uid()));
$$;

create function public.create_wallet(p_pin text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_reference text;
begin
  if v_user is null then return private.fail('not_authenticated'); end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then return private.fail('invalid_pin'); end if;
  if exists (select 1 from public.wallets where user_id = v_user) then return private.fail('wallet_exists'); end if;
  loop
    v_reference := 'TEST-' || lpad(floor(random() * 1000000)::integer::text, 6, '0');
    exit when not exists (select 1 from public.wallets where reference = v_reference);
  end loop;
  insert into public.wallets (user_id, reference) values (v_user, v_reference);
  insert into public.wallet_pins (user_id, pin_hash)
  values (v_user, extensions.crypt(p_pin, extensions.gen_salt('bf', 10)));
  return jsonb_build_object('ok', true, 'reference', v_reference);
end;
$$;

create function public.reset_pin(p_password text, p_new_pin text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text := private.begin_money(v_user, false);
  v_hash text;
begin
  if v_code is not null then return private.fail(v_code); end if;
  if p_new_pin is null or p_new_pin !~ '^[0-9]{4}$' then return private.fail('invalid_pin'); end if;
  if exists (select 1 from public.wallet_pins where user_id = v_user and locked_until > now()) then
    return private.fail('pin_locked');
  end if;
  select encrypted_password into v_hash from auth.users where id = v_user;
  if p_password is null or v_hash is null or v_hash = '' or extensions.crypt(p_password, v_hash) <> v_hash then
    return private.fail(case when private.record_failed_attempt(v_user) = 'pin_locked' then 'pin_locked' else 'password_incorrect' end);
  end if;
  update public.wallet_pins
  set pin_hash = extensions.crypt(p_new_pin, extensions.gen_salt('bf', 10)),
      failed_attempts = 0, locked_until = null, updated_at = now()
  where user_id = v_user;
  insert into public.audit_log (actor_id, action, target_type, target_id)
  values (v_user, 'pin_reset', 'wallet', v_user::text);
  return jsonb_build_object('ok', true);
end;
$$;

create function public.submit_student_verification(
  p_institution text, p_matric_number text, p_level text, p_course text,
  p_school_id_path text, p_school_id_file_name text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then return private.fail('not_authenticated'); end if;
  if coalesce(trim(p_institution), '') = '' or coalesce(trim(p_matric_number), '') = ''
    or coalesce(trim(p_level), '') = '' or coalesce(trim(p_course), '') = '' then
    return private.fail('missing_details');
  end if;
  if p_school_id_path is null or p_school_id_path not like v_user::text || '/%' then
    return private.fail('invalid_school_id');
  end if;
  if exists (select 1 from public.student_verifications where user_id = v_user and status = 'verified') then
    return private.fail('already_verified');
  end if;
  insert into public.student_verifications (
    user_id, institution, matric_number, level, course, school_id_path, school_id_file_name
  ) values (
    v_user, trim(p_institution), trim(p_matric_number), p_level, trim(p_course),
    p_school_id_path, coalesce(p_school_id_file_name, '')
  )
  on conflict (user_id) do update set
    institution = excluded.institution, matric_number = excluded.matric_number,
    level = excluded.level, course = excluded.course, school_id_path = excluded.school_id_path,
    school_id_file_name = excluded.school_id_file_name, status = 'pending', submitted_at = now(),
    reviewed_at = null, reviewed_by = null, rejection_reason = null;
  return jsonb_build_object('ok', true, 'status', 'pending');
end;
$$;

-- Ledger

create function public.record_income(
  p_amount bigint, p_category text, p_occurred_on date, p_note text, p_idempotency_key text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text := private.begin_money(v_user);
  v_replay jsonb;
  v_id uuid;
begin
  if v_code is not null then return private.fail(v_code); end if;
  v_replay := private.replay(v_user, p_idempotency_key);
  if v_replay is not null then return v_replay; end if;
  if not private.valid_amount(p_amount) then return private.fail('invalid_amount'); end if;
  if not (p_category = any (private.income_categories())) then return private.fail('invalid_category'); end if;
  v_id := private.post(
    v_user, 'income', p_amount, p_category, coalesce(p_occurred_on, private.app_today(v_user)),
    coalesce(nullif(trim(p_note), ''), 'Manually recorded funds'), p_idempotency_key, p_receipt => true
  );
  return jsonb_build_object('ok', true, 'transaction_id', v_id, 'status', 'completed');
end;
$$;

create function public.set_opening_balance(p_amount bigint, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text := private.begin_money(v_user);
  v_replay jsonb;
  v_id uuid;
begin
  if v_code is not null then return private.fail(v_code); end if;
  v_replay := private.replay(v_user, p_idempotency_key);
  if v_replay is not null then return v_replay; end if;
  if not private.valid_amount(p_amount) then return private.fail('invalid_amount'); end if;
  if exists (select 1 from public.transactions where user_id = v_user) then
    return private.fail('ledger_not_empty');
  end if;
  v_id := private.post(
    v_user, 'opening_balance', p_amount, 'Opening balance', private.app_today(v_user),
    'Opening balance', p_idempotency_key
  );
  return jsonb_build_object('ok', true, 'transaction_id', v_id, 'status', 'completed');
end;
$$;

create function public.update_transaction(
  p_id uuid, p_amount bigint, p_category text, p_occurred_on date, p_note text, p_pin text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text := private.begin_money(v_user);
  v_row public.transactions;
  v_change bigint;
begin
  if v_code is not null then return private.fail(v_code); end if;
  v_code := private.check_pin(v_user, p_pin);
  if v_code is not null then return private.fail(v_code); end if;
  select * into v_row from public.transactions where id = p_id and user_id = v_user and deleted_at is null for update;
  if not found then return private.fail('not_found'); end if;
  if v_row.kind not in ('income', 'expense') or v_row.status <> 'completed' then return private.fail('not_editable'); end if;
  if not private.valid_amount(p_amount) then return private.fail('invalid_amount'); end if;
  if not (p_category = any (case when v_row.kind = 'income' then private.income_categories() else private.expense_categories() end)) then
    return private.fail('invalid_category');
  end if;
  v_change := case when v_row.kind = 'income' then p_amount - v_row.amount_kobo else v_row.amount_kobo - p_amount end;
  if private.balance(v_user) + v_change < 0 then return private.fail('insufficient_balance'); end if;
  update public.transactions
  set amount_kobo = p_amount, category = p_category, occurred_on = coalesce(p_occurred_on, occurred_on),
      note = left(coalesce(p_note, ''), 120)
  where id = p_id;
  insert into public.audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_user, 'transaction_updated', 'transaction', p_id::text, jsonb_build_object('previous_kobo', v_row.amount_kobo));
  return jsonb_build_object('ok', true, 'transaction_id', p_id);
end;
$$;

create function public.delete_transaction(p_id uuid, p_pin text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text := private.begin_money(v_user);
  v_row public.transactions;
begin
  if v_code is not null then return private.fail(v_code); end if;
  v_code := private.check_pin(v_user, p_pin);
  if v_code is not null then return private.fail(v_code); end if;
  select * into v_row from public.transactions where id = p_id and user_id = v_user and deleted_at is null for update;
  if not found then return private.fail('not_found'); end if;
  if v_row.kind not in ('income', 'expense') or v_row.status <> 'completed' then return private.fail('not_editable'); end if;
  if v_row.kind = 'income' and private.balance(v_user) - v_row.amount_kobo < 0 then
    return private.fail('insufficient_balance');
  end if;
  update public.transactions set deleted_at = now() where id = p_id;
  insert into public.audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_user, 'transaction_deleted', 'transaction', p_id::text, jsonb_build_object('amount_kobo', v_row.amount_kobo));
  return jsonb_build_object('ok', true, 'transaction_id', p_id);
end;
$$;

-- Simulated bank, student side

create function public.sim_list_banks()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then return private.fail('not_authenticated'); end if;
  if not private.sim_enabled() then return private.fail('simulation_off'); end if;
  return jsonb_build_object('ok', true, 'banks', (
    select jsonb_agg(jsonb_build_object('code', code, 'name', name) order by name) from public.sim_banks
  ));
end;
$$;

create function public.resolve_recipient(p_bank_code text, p_account_number text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_account public.sim_accounts;
begin
  if auth.uid() is null then return private.fail('not_authenticated'); end if;
  if not private.sim_enabled() then return private.fail('simulation_off'); end if;
  if not exists (select 1 from public.sim_banks where code = p_bank_code) then return private.fail('invalid_bank'); end if;
  if p_account_number is null or p_account_number !~ '^[0-9]{10}$' then return private.fail('invalid_account'); end if;
  select * into v_account from public.sim_accounts where account_number = p_account_number;
  if v_account.scenario = 'lookup_fail' then return private.fail('account_not_found'); end if;
  return jsonb_build_object('ok', true, 'name', coalesce(v_account.name, 'Mock Recipient ' || right(p_account_number, 4)));
end;
$$;

create function public.start_transfer(
  p_kind text, p_amount bigint, p_category text, p_occurred_on date, p_note text,
  p_bank_code text, p_account_number text, p_pin text, p_idempotency_key text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text := private.begin_money(v_user);
  v_replay jsonb;
  v_account public.sim_accounts;
  v_scenario public.sim_scenario;
  v_name text;
  v_bank text;
  v_category text;
  v_transfer uuid;
  v_id uuid;
begin
  if v_code is not null then return private.fail(v_code); end if;
  if not private.sim_enabled() then return private.fail('simulation_off'); end if;
  v_replay := private.replay(v_user, p_idempotency_key);
  if v_replay is not null then return v_replay; end if;
  if p_kind not in ('expense', 'withdrawal') then return private.fail('invalid_kind'); end if;
  if not private.valid_amount(p_amount) then return private.fail('invalid_amount'); end if;
  v_category := case when p_kind = 'withdrawal' then 'Withdrawal' else p_category end;
  if p_kind = 'expense' and not (p_category = any (private.expense_categories())) then
    return private.fail('invalid_category');
  end if;
  select name into v_bank from public.sim_banks where code = p_bank_code;
  if v_bank is null then return private.fail('invalid_bank'); end if;
  if p_account_number is null or p_account_number !~ '^[0-9]{10}$' then return private.fail('invalid_account'); end if;
  select * into v_account from public.sim_accounts where account_number = p_account_number;
  v_scenario := coalesce(v_account.scenario, 'success');
  if v_scenario = 'lookup_fail' then return private.fail('account_not_found'); end if;
  v_name := coalesce(v_account.name, 'Mock Recipient ' || right(p_account_number, 4));

  v_code := private.check_pin(v_user, p_pin);
  if v_code is not null then return private.fail(v_code); end if;
  if p_amount > private.balance(v_user) then return private.fail('insufficient_balance'); end if;

  insert into public.sim_transfers (
    user_id, direction, amount_kobo, counterparty, scenario, reference, idempotency_key, settle_after
  ) values (
    v_user, 'outgoing', p_amount, v_name, v_scenario, 'SIM-' || gen_random_uuid(), p_idempotency_key,
    case when v_scenario <> 'hold' then now() + interval '3 seconds' end
  ) returning id into v_transfer;

  v_id := private.post(
    v_user, p_kind::public.transaction_kind, p_amount, v_category,
    coalesce(p_occurred_on, private.app_today(v_user)),
    coalesce(nullif(trim(p_note), ''), case when p_kind = 'withdrawal' then 'Simulated withdrawal' else '' end),
    p_idempotency_key, p_status => 'pending', p_source => 'simulated_bank', p_receipt => true,
    p_sim_transfer => v_transfer, p_recipient_name => v_name, p_recipient_bank => v_bank,
    p_recipient_account => p_account_number
  );
  return jsonb_build_object('ok', true, 'transaction_id', v_id, 'transfer_id', v_transfer, 'status', 'pending');
end;
$$;

-- Budgets

create function public.create_budget(p_category text, p_amount bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text := private.begin_money(v_user);
  v_month date;
  v_income bigint;
  v_budgeted bigint;
  v_available bigint;
  v_id uuid;
begin
  if v_code is not null then return private.fail(v_code); end if;
  if not private.valid_amount(p_amount) then return private.fail('invalid_amount'); end if;
  if not (p_category = any (private.expense_categories())) then return private.fail('invalid_category'); end if;
  v_month := date_trunc('month', private.app_today(v_user))::date;
  if exists (select 1 from public.budgets where user_id = v_user and month = v_month and category = p_category) then
    return private.fail('budget_exists');
  end if;
  select coalesce(sum(amount_kobo), 0)::bigint into v_income
  from public.transactions
  where user_id = v_user and kind in ('income', 'opening_balance', 'deposit')
    and status = 'completed' and deleted_at is null;
  select coalesce(sum(amount_kobo), 0)::bigint into v_budgeted
  from public.budgets where user_id = v_user and month = v_month;
  v_available := greatest(0, least(v_income, private.balance(v_user)) - v_budgeted);
  if p_amount > v_available then
    return private.fail('budget_exceeds_available') || jsonb_build_object('available_kobo', v_available);
  end if;
  insert into public.budgets (user_id, category, amount_kobo, month)
  values (v_user, p_category, p_amount, v_month) returning id into v_id;
  return jsonb_build_object('ok', true, 'budget_id', v_id);
end;
$$;

-- Savings goals

create function public.create_goal(p_name text, p_target bigint, p_due_date date, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text := private.begin_money(v_user);
  v_id uuid;
begin
  if v_code is not null then return private.fail(v_code); end if;
  select id into v_id from public.savings_goals where user_id = v_user and client_key = p_idempotency_key;
  if found then return jsonb_build_object('ok', true, 'replayed', true, 'goal_id', v_id); end if;
  if coalesce(trim(p_name), '') = '' or char_length(trim(p_name)) > 60 then return private.fail('invalid_name'); end if;
  if not private.valid_amount(p_target) then return private.fail('invalid_amount'); end if;
  insert into public.savings_goals (user_id, name, target_kobo, due_date, client_key)
  values (v_user, trim(p_name), p_target, p_due_date, p_idempotency_key) returning id into v_id;
  return jsonb_build_object('ok', true, 'goal_id', v_id);
end;
$$;

create function public.set_goal_contribution_settings(
  p_goal uuid, p_method public.contribution_method, p_amount bigint,
  p_frequency public.contribution_frequency, p_pin text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text := private.begin_money(v_user);
  v_goal public.savings_goals;
  v_today date;
begin
  if v_code is not null then return private.fail(v_code); end if;
  select * into v_goal from public.savings_goals where id = p_goal and user_id = v_user for update;
  if not found then return private.fail('not_found'); end if;
  if v_goal.withdrawn_at is not null then return private.fail('already_withdrawn'); end if;
  if p_method = 'auto' then
    if not private.valid_amount(p_amount) then return private.fail('invalid_amount'); end if;
    if p_frequency is null then return private.fail('invalid_frequency'); end if;
    v_code := private.check_pin(v_user, p_pin);
    if v_code is not null then return private.fail(v_code); end if;
    v_today := private.app_today(v_user);
    update public.savings_goals
    set contribution_method = 'auto', auto_amount_kobo = p_amount, auto_frequency = p_frequency,
        auto_enabled = true, schedule_day = extract(day from v_today),
        next_contribution_on = private.next_contribution_on(v_today, p_frequency, extract(day from v_today)::integer),
        blocked_since = null
    where id = p_goal;
  else
    update public.savings_goals
    set contribution_method = p_method, auto_amount_kobo = null, auto_frequency = null,
        auto_enabled = false, schedule_day = null, next_contribution_on = null, blocked_since = null
    where id = p_goal;
  end if;
  return jsonb_build_object('ok', true, 'goal_id', p_goal);
end;
$$;

create function public.pause_goal_contributions(p_goal uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text := private.begin_money(v_user);
begin
  if v_code is not null then return private.fail(v_code); end if;
  update public.savings_goals set auto_enabled = false, blocked_since = null where id = p_goal and user_id = v_user;
  if not found then return private.fail('not_found'); end if;
  return jsonb_build_object('ok', true, 'goal_id', p_goal);
end;
$$;

create function public.contribute_to_goal(p_goal uuid, p_amount bigint, p_pin text, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text := private.begin_money(v_user);
  v_replay jsonb;
  v_goal public.savings_goals;
  v_id uuid;
begin
  if v_code is not null then return private.fail(v_code); end if;
  v_replay := private.replay(v_user, p_idempotency_key);
  if v_replay is not null then return v_replay; end if;
  v_code := private.check_pin(v_user, p_pin);
  if v_code is not null then return private.fail(v_code); end if;
  if not private.valid_amount(p_amount) then return private.fail('invalid_amount'); end if;
  select * into v_goal from public.savings_goals where id = p_goal and user_id = v_user for update;
  if not found or v_goal.withdrawn_at is not null then return private.fail('goal_unavailable'); end if;
  if p_amount > private.balance(v_user) then return private.fail('insufficient_balance'); end if;
  if p_amount > v_goal.target_kobo - private.goal_saved(p_goal) then return private.fail('exceeds_goal_target'); end if;
  v_id := private.post(
    v_user, 'goal_contribution', p_amount, 'Savings contribution', private.app_today(v_user),
    'Contribution to ' || v_goal.name, p_idempotency_key, p_goal => p_goal
  );
  return jsonb_build_object('ok', true, 'transaction_id', v_id, 'status', 'completed');
end;
$$;

create function public.withdraw_goal(p_goal uuid, p_expected_saved bigint, p_pin text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text := private.begin_money(v_user);
  v_goal public.savings_goals;
  v_saved bigint;
  v_id uuid;
begin
  if v_code is not null then return private.fail(v_code); end if;
  v_code := private.check_pin(v_user, p_pin);
  if v_code is not null then return private.fail(v_code); end if;
  select * into v_goal from public.savings_goals where id = p_goal and user_id = v_user for update;
  if not found then return private.fail('not_found'); end if;
  if v_goal.withdrawn_at is not null then return private.fail('already_withdrawn'); end if;
  v_saved := private.goal_saved(p_goal);
  if v_saved <> p_expected_saved then return private.fail('saved_amount_changed'); end if;
  if v_saved < v_goal.target_kobo then return private.fail('target_not_reached'); end if;
  v_id := private.post(
    v_user, 'goal_withdrawal', v_saved, 'Savings withdrawal', private.app_today(v_user),
    'Withdrawal from ' || v_goal.name, 'goal-withdrawal:' || p_goal, p_goal => p_goal
  );
  update public.savings_goals
  set withdrawn_at = now(), withdrawal_kobo = v_saved, auto_enabled = false,
      next_contribution_on = null, blocked_since = null
  where id = p_goal;
  return jsonb_build_object('ok', true, 'transaction_id', v_id, 'amount_kobo', v_saved);
end;
$$;

-- Lock savings

create function public.create_lock_commitment(
  p_plan_months integer, p_amount bigint, p_start_date date, p_description text, p_pin text, p_idempotency_key text
)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text := private.begin_money(v_user);
  v_replay jsonb;
  v_end date;
  v_description text := left(coalesce(trim(p_description), ''), 120);
  v_commitment uuid;
  v_id uuid;
begin
  if v_code is not null then return private.fail(v_code); end if;
  v_replay := private.replay(v_user, p_idempotency_key);
  if v_replay is not null then return v_replay; end if;
  v_code := private.check_pin(v_user, p_pin);
  if v_code is not null then return private.fail(v_code); end if;
  if p_plan_months is null or p_plan_months not in (1, 2, 3, 6, 12) then return private.fail('invalid_plan'); end if;
  if not private.valid_amount(p_amount) then return private.fail('invalid_amount'); end if;
  if p_start_date is null or p_start_date < private.app_today(v_user) then return private.fail('invalid_start_date'); end if;
  if p_amount > private.balance(v_user) then return private.fail('insufficient_balance'); end if;
  v_end := (p_start_date + make_interval(months => p_plan_months))::date;
  insert into public.lock_commitments (user_id, plan_months, target_kobo, locked_kobo, start_date, end_date, description)
  values (v_user, p_plan_months, p_amount, p_amount, p_start_date, v_end, v_description)
  returning id into v_commitment;
  v_id := private.post(
    v_user, 'lock_deposit', p_amount, 'Lock Savings', private.app_today(v_user),
    coalesce(nullif(v_description, ''), p_plan_months || '-month lock savings commitment'),
    p_idempotency_key, p_commitment => v_commitment
  );
  return jsonb_build_object('ok', true, 'transaction_id', v_id, 'commitment_id', v_commitment);
end;
$$;

create function public.collect_lock_commitment(p_commitment uuid, p_pin text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text := private.begin_money(v_user);
  v_lock public.lock_commitments;
  v_fee bigint;
  v_today date;
begin
  if v_code is not null then return private.fail(v_code); end if;
  v_code := private.check_pin(v_user, p_pin);
  if v_code is not null then return private.fail(v_code); end if;
  select * into v_lock from public.lock_commitments where id = p_commitment and user_id = v_user for update;
  if not found then return private.fail('not_found'); end if;
  if v_lock.withdrawn_at is not null then return private.fail('already_collected'); end if;
  v_fee := round(v_lock.locked_kobo * 0.05)::bigint;
  v_today := private.app_today(v_user);
  perform private.post(
    v_user, 'lock_collection', v_lock.locked_kobo, 'Lock Savings Withdrawal', v_today,
    coalesce(nullif(v_lock.description, ''), 'Collected locked savings'),
    'lock-collection:' || p_commitment, p_commitment => p_commitment
  );
  if v_fee > 0 then
    perform private.post(
      v_user, 'lock_fee', v_fee, 'Lock Savings Fee', v_today, '5% collection fee',
      'lock-collection-fee:' || p_commitment, p_commitment => p_commitment
    );
  end if;
  update public.lock_commitments
  set withdrawn_at = now(), withdrawal_fee_kobo = v_fee, withdrawal_net_kobo = v_lock.locked_kobo - v_fee
  where id = p_commitment;
  return jsonb_build_object('ok', true, 'gross_kobo', v_lock.locked_kobo, 'fee_kobo', v_fee, 'net_kobo', v_lock.locked_kobo - v_fee);
end;
$$;

-- Account data

create function public.export_my_data()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
begin
  if v_user is null then return private.fail('not_authenticated'); end if;
  return jsonb_build_object(
    'ok', true,
    'exported_at', now(),
    'profile', (select to_jsonb(p) from public.profiles p where id = v_user),
    'wallet', (select to_jsonb(w) from public.wallets w where user_id = v_user),
    'transactions', (select coalesce(jsonb_agg(to_jsonb(t) order by t.occurred_on desc), '[]') from public.transactions t where user_id = v_user),
    'budgets', (select coalesce(jsonb_agg(to_jsonb(b)), '[]') from public.budgets b where user_id = v_user),
    'savings_goals', (select coalesce(jsonb_agg(to_jsonb(g)), '[]') from public.savings_goals g where user_id = v_user),
    'lock_commitments', (select coalesce(jsonb_agg(to_jsonb(l)), '[]') from public.lock_commitments l where user_id = v_user),
    'student_verification', (select to_jsonb(s) from public.student_verifications s where user_id = v_user),
    'notification_preferences', (select to_jsonb(n) from public.notification_preferences n where user_id = v_user)
  );
end;
$$;

-- Admin

create function public.review_student_verification(p_user uuid, p_approve boolean, p_reason text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_admin uuid := auth.uid();
begin
  if not public.is_admin() then return private.fail('forbidden'); end if;
  if not p_approve and coalesce(trim(p_reason), '') = '' then return private.fail('reason_required'); end if;
  update public.student_verifications
  set status = case when p_approve then 'verified'::public.verification_status else 'rejected'::public.verification_status end,
      reviewed_at = now(), reviewed_by = v_admin,
      rejection_reason = case when p_approve then null else trim(p_reason) end
  where user_id = p_user and status = 'pending';
  if not found then return private.fail('not_found'); end if;
  insert into public.audit_log (actor_id, action, target_type, target_id, metadata)
  values (v_admin, 'verification_reviewed', 'student_verification', p_user::text, jsonb_build_object('approved', p_approve));
  return jsonb_build_object('ok', true);
end;
$$;

create function public.set_school_status(p_status public.school_status)
returns jsonb language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then return private.fail('forbidden'); end if;
  update public.app_settings set school_status = p_status;
  insert into public.audit_log (actor_id, action, target_type, target_id, metadata)
  values (auth.uid(), 'school_status_set', 'app_settings', null, jsonb_build_object('status', p_status));
  return jsonb_build_object('ok', true);
end;
$$;

-- Simulator panel

create function public.sim_incoming_transfer(p_amount bigint, p_sender text, p_idempotency_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text := private.begin_money(v_user);
  v_id uuid;
begin
  if v_code is not null then return private.fail(v_code); end if;
  if not private.sim_enabled() then return private.fail('simulation_off'); end if;
  select id into v_id from public.sim_transfers where user_id = v_user and idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('ok', true, 'replayed', true, 'transfer_id', v_id); end if;
  if not private.valid_amount(p_amount) then return private.fail('invalid_amount'); end if;
  insert into public.sim_transfers (user_id, direction, amount_kobo, counterparty, scenario, reference, idempotency_key, settle_after)
  values (
    v_user, 'incoming', p_amount, left(coalesce(nullif(trim(p_sender), ''), 'Test Sender'), 60), 'success',
    'SIM-' || gen_random_uuid(), p_idempotency_key, now() + interval '3 seconds'
  ) returning id into v_id;
  return jsonb_build_object('ok', true, 'transfer_id', v_id, 'status', 'pending');
end;
$$;

create function public.sim_tick()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text := private.begin_money(v_user, false);
  v_transfer public.sim_transfers;
  v_settled integer := 0;
begin
  if v_code is not null then return private.fail(v_code); end if;
  if not private.sim_enabled() then return private.fail('simulation_off'); end if;
  for v_transfer in
    select * from public.sim_transfers
    where user_id = v_user
      and ((status = 'pending' and settle_after <= now()) or (status = 'success' and reverse_after <= now()))
    order by created_at
  loop
    if private.apply_transfer_event(v_transfer.id, case
      when v_transfer.status = 'success' then 'reversed'
      when v_transfer.scenario = 'fail' then 'failed'
      else 'success'
    end::public.sim_event_type) then
      v_settled := v_settled + 1;
    end if;
  end loop;
  return jsonb_build_object('ok', true, 'settled', v_settled, 'today', private.app_today(v_user))
    || private.run_due_for_user(v_user);
end;
$$;

create function public.sim_settle_transfer(p_transfer uuid, p_outcome public.sim_event_type)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text := private.begin_money(v_user, false);
begin
  if v_code is not null then return private.fail(v_code); end if;
  if not private.sim_enabled() then return private.fail('simulation_off'); end if;
  if not exists (select 1 from public.sim_transfers where id = p_transfer and user_id = v_user) then
    return private.fail('not_found');
  end if;
  return jsonb_build_object('ok', true, 'applied', private.apply_transfer_event(p_transfer, p_outcome));
end;
$$;

create function public.sim_replay_event(p_event uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text := private.begin_money(v_user, false);
  v_event public.sim_events;
  v_applied boolean;
begin
  if v_code is not null then return private.fail(v_code); end if;
  if not private.sim_enabled() then return private.fail('simulation_off'); end if;
  select * into v_event from public.sim_events where id = p_event and user_id = v_user;
  if not found then return private.fail('not_found'); end if;
  v_applied := private.apply_transfer_event(v_event.transfer_id, v_event.event_type);
  return jsonb_build_object('ok', true, 'applied', v_applied,
    'deliveries', (select deliveries from public.sim_events where id = p_event));
end;
$$;

create function public.sim_advance_days(p_days integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text := private.begin_money(v_user, false);
begin
  if v_code is not null then return private.fail(v_code); end if;
  if not private.sim_enabled() then return private.fail('simulation_off'); end if;
  if p_days is null or p_days not in (1, 7, 30) then return private.fail('invalid_days'); end if;
  insert into public.sim_clocks (user_id, offset_days) values (v_user, p_days)
  on conflict (user_id) do update set offset_days = public.sim_clocks.offset_days + p_days;
  return jsonb_build_object('ok', true, 'today', private.app_today(v_user)) || private.run_due_for_user(v_user);
end;
$$;

create function public.sim_reset_my_data()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := auth.uid();
  v_code text := private.begin_money(v_user, false);
begin
  if v_code is not null then return private.fail(v_code); end if;
  if not private.sim_enabled() then return private.fail('simulation_off'); end if;
  delete from public.transactions where user_id = v_user;
  delete from public.sim_transfers where user_id = v_user;
  delete from public.savings_goals where user_id = v_user;
  delete from public.lock_commitments where user_id = v_user;
  delete from public.budgets where user_id = v_user;
  delete from public.report_dismissals where user_id = v_user;
  delete from public.sim_clocks where user_id = v_user;
  return jsonb_build_object('ok', true);
end;
$$;

-- Postgres lets everyone execute new functions, so lock them down and grant by name.
revoke all on all functions in schema private from public, anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant execute on function
  public.is_admin(),
  public.get_app_today(),
  public.create_wallet(text),
  public.reset_pin(text, text),
  public.submit_student_verification(text, text, text, text, text, text),
  public.record_income(bigint, text, date, text, text),
  public.set_opening_balance(bigint, text),
  public.update_transaction(uuid, bigint, text, date, text, text),
  public.delete_transaction(uuid, text),
  public.sim_list_banks(),
  public.resolve_recipient(text, text),
  public.start_transfer(text, bigint, text, date, text, text, text, text, text),
  public.create_budget(text, bigint),
  public.create_goal(text, bigint, date, text),
  public.set_goal_contribution_settings(uuid, public.contribution_method, bigint, public.contribution_frequency, text),
  public.pause_goal_contributions(uuid),
  public.contribute_to_goal(uuid, bigint, text, text),
  public.withdraw_goal(uuid, bigint, text),
  public.create_lock_commitment(integer, bigint, date, text, text, text),
  public.collect_lock_commitment(uuid, text),
  public.export_my_data(),
  public.review_student_verification(uuid, boolean, text),
  public.set_school_status(public.school_status),
  public.sim_incoming_transfer(bigint, text, text),
  public.sim_tick(),
  public.sim_settle_transfer(uuid, public.sim_event_type),
  public.sim_replay_event(uuid),
  public.sim_advance_days(integer),
  public.sim_reset_my_data()
to authenticated;

create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('studentsave-due-contributions', '0 * * * *', 'select private.run_due_contributions()');
