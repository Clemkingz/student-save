-- Students who pick "Other" type their own category, such as "Gym membership".
-- A category is valid when it is in the fixed list, or when it is a short custom name
-- that does not reuse a name the app writes itself (withdrawals, savings, locks).
create or replace function private.valid_category(p_category text, p_listed text[])
returns boolean language sql immutable set search_path = '' as $$
  select p_category is not null and (
    p_category = any (p_listed)
    or (
      p_category = trim(p_category)
      and char_length(p_category) between 1 and 60
      and lower(p_category) <> all (array[
        'other', 'withdrawal', 'bank transfer', 'opening balance', 'savings contribution', 'savings withdrawal',
        'lock savings', 'lock savings fee', 'lock savings withdrawal', 'transfer reversal'
      ])
    )
  );
$$;

create or replace function public.record_income(
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
  if not private.valid_category(p_category, private.income_categories()) then return private.fail('invalid_category'); end if;
  v_id := private.post(
    v_user, 'income', p_amount, p_category, coalesce(p_occurred_on, private.app_today(v_user)),
    coalesce(nullif(trim(p_note), ''), 'Manually recorded funds'), p_idempotency_key, p_receipt => true
  );
  return jsonb_build_object('ok', true, 'transaction_id', v_id, 'status', 'completed');
end;
$$;


create or replace function public.update_transaction(
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
  if not private.valid_category(p_category, case when v_row.kind = 'income' then private.income_categories() else private.expense_categories() end) then
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


create or replace function public.start_transfer(
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
  if p_kind = 'expense' and not private.valid_category(p_category, private.expense_categories()) then
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


create or replace function public.create_budget(p_category text, p_amount bigint)
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
  if not private.valid_category(p_category, private.expense_categories()) then return private.fail('invalid_category'); end if;
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


-- Private helpers are only called from inside the functions above.
revoke all on function private.valid_category(text, text[]) from public, anon, authenticated;
