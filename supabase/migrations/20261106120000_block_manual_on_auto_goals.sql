-- A goal on automatic contributions only receives money from its schedule.
-- The user must switch it to manual in contribution settings before adding funds by hand.
create or replace function public.contribute_to_goal(p_goal uuid, p_amount bigint, p_pin text, p_idempotency_key text)
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
  if v_goal.contribution_method = 'auto' then return private.fail('goal_is_automatic'); end if;
  if p_amount > private.balance(v_user) then return private.fail('insufficient_balance'); end if;
  if p_amount > v_goal.target_kobo - private.goal_saved(p_goal) then return private.fail('exceeds_goal_target'); end if;
  v_id := private.post(
    v_user, 'goal_contribution', p_amount, 'Savings contribution', private.app_today(v_user),
    'Contribution to ' || v_goal.name, p_idempotency_key, p_goal => p_goal
  );
  return jsonb_build_object('ok', true, 'transaction_id', v_id, 'status', 'completed');
end;
$$;
