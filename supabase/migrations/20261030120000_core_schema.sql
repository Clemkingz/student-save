-- StudentSave core schema. Money is integer kobo. See docs/SUPABASE-BACKEND-PLAN.md.

-- Clients get only what each table grants below.
revoke all on all tables in schema public from anon, authenticated;
alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;

create type public.transaction_kind as enum (
  'income', 'opening_balance', 'deposit', 'goal_withdrawal', 'lock_collection', 'transfer_reversal',
  'expense', 'withdrawal', 'goal_contribution', 'lock_deposit', 'lock_fee'
);
create type public.transaction_status as enum ('pending', 'completed', 'failed');
create type public.transaction_source as enum ('manual', 'auto', 'simulated_bank');
create type public.contribution_method as enum ('auto', 'manual', 'none');
create type public.contribution_frequency as enum ('daily', 'weekly', 'monthly');
create type public.verification_status as enum ('pending', 'verified', 'rejected');
create type public.school_status as enum ('in-school', 'out-of-school');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '' check (char_length(full_name) <= 80),
  avatar_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  currency text not null default 'NGN' check (currency = 'NGN'),
  reference text not null unique check (reference ~ '^TEST-[0-9]{6,}$'),
  created_at timestamptz not null default now()
);

create table public.wallet_pins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  pin_hash text not null,
  failed_attempts integer not null default 0 check (failed_attempts >= 0),
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

create table public.budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (char_length(category) between 1 and 60),
  amount_kobo bigint not null check (amount_kobo > 0),
  month date not null check (extract(day from month) = 1),
  created_at timestamptz not null default now(),
  unique (user_id, month, category)
);

create table public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  target_kobo bigint not null check (target_kobo > 0),
  due_date date,
  contribution_method public.contribution_method not null default 'none',
  auto_amount_kobo bigint check (auto_amount_kobo > 0),
  auto_frequency public.contribution_frequency,
  auto_enabled boolean not null default false,
  next_contribution_on date,
  schedule_day smallint check (schedule_day between 1 and 31),
  blocked_since timestamptz,
  withdrawn_at timestamptz,
  withdrawal_kobo bigint check (withdrawal_kobo > 0),
  created_at timestamptz not null default now()
);

create table public.lock_commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  plan_months smallint not null check (plan_months in (1, 2, 3, 6, 12)),
  target_kobo bigint not null check (target_kobo > 0),
  locked_kobo bigint not null check (locked_kobo > 0),
  start_date date not null,
  end_date date not null check (end_date > start_date),
  description text not null default '' check (char_length(description) <= 120),
  withdrawn_at timestamptz,
  withdrawal_fee_kobo bigint check (withdrawal_fee_kobo >= 0),
  withdrawal_net_kobo bigint check (withdrawal_net_kobo >= 0),
  created_at timestamptz not null default now()
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind public.transaction_kind not null,
  status public.transaction_status not null default 'completed',
  source public.transaction_source not null default 'manual',
  amount_kobo bigint not null check (amount_kobo > 0),
  category text not null check (char_length(category) between 1 and 60),
  occurred_on date not null,
  note text not null default '' check (char_length(note) <= 120),
  recipient_name text,
  recipient_bank text,
  recipient_account_number text check (recipient_account_number ~ '^[0-9]{10}$'),
  receipt_number text unique,
  receipt_created_at timestamptz,
  goal_id uuid references public.savings_goals (id) on delete set null,
  commitment_id uuid references public.lock_commitments (id) on delete set null,
  -- The foreign key is added with the simulated bank tables.
  sim_transfer_id uuid,
  idempotency_key text not null,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc);
create index transactions_goal_idx on public.transactions (goal_id) where goal_id is not null;
create index transactions_commitment_idx on public.transactions (commitment_id) where commitment_id is not null;
create index savings_goals_user_idx on public.savings_goals (user_id);
create index savings_goals_due_idx on public.savings_goals (next_contribution_on) where auto_enabled;
create index lock_commitments_user_idx on public.lock_commitments (user_id);

create table public.student_verifications (
  user_id uuid primary key references auth.users (id) on delete cascade,
  institution text not null,
  matric_number text not null,
  level text not null,
  course text not null,
  school_id_path text not null,
  school_id_file_name text not null default '',
  status public.verification_status not null default 'pending',
  submitted_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users (id) on delete set null,
  rejection_reason text
);
create index student_verifications_status_idx on public.student_verifications (status, submitted_at desc);

create table public.notification_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  in_app boolean not null default true,
  email boolean not null default true,
  push boolean not null default false
);

create table public.report_dismissals (
  user_id uuid not null references auth.users (id) on delete cascade,
  alert_id text not null,
  primary key (user_id, alert_id)
);

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.app_settings (
  id boolean primary key default true check (id),
  school_status public.school_status,
  simulation_mode boolean not null default true
);
insert into public.app_settings (id) values (true);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references auth.users (id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger transactions_set_updated_at before update on public.transactions
  for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), 80));
  insert into public.notification_preferences (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admin_users where user_id = (select auth.uid()));
$$;

revoke all on function public.set_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- Views run as the caller so RLS still applies.
create view public.wallet_balances with (security_invoker = true) as
select
  w.user_id,
  coalesce(sum(
    case
      when t.kind in ('income', 'opening_balance', 'deposit', 'goal_withdrawal', 'lock_collection', 'transfer_reversal')
        then case when t.status = 'completed' then t.amount_kobo else 0 end
      else case when t.status in ('completed', 'pending') then -t.amount_kobo else 0 end
    end
  ), 0)::bigint as balance_kobo
from public.wallets w
left join public.transactions t on t.user_id = w.user_id and t.deleted_at is null
group by w.user_id;

create view public.goal_progress with (security_invoker = true) as
select
  g.*,
  coalesce(sum(t.amount_kobo), 0)::bigint as saved_kobo
from public.savings_goals g
left join public.transactions t
  on t.goal_id = g.id
  and t.kind = 'goal_contribution'
  and t.status = 'completed'
  and t.deleted_at is null
group by g.id;

create view public.budget_usage with (security_invoker = true) as
select
  b.*,
  coalesce(sum(t.amount_kobo), 0)::bigint as spent_kobo
from public.budgets b
left join public.transactions t
  on t.user_id = b.user_id
  and t.kind = 'expense'
  and t.category = b.category
  and t.status <> 'failed'
  and t.deleted_at is null
  and t.occurred_on >= b.month
  and t.occurred_on < b.month + interval '1 month'
group by b.id;

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_pins enable row level security;
alter table public.budgets enable row level security;
alter table public.savings_goals enable row level security;
alter table public.lock_commitments enable row level security;
alter table public.transactions enable row level security;
alter table public.student_verifications enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.report_dismissals enable row level security;
alter table public.admin_users enable row level security;
alter table public.app_settings enable row level security;
alter table public.audit_log enable row level security;

-- No grants or policies: wallet_pins, admin_users, audit_log.
grant select on public.profiles, public.wallets, public.budgets, public.savings_goals,
  public.lock_commitments, public.transactions, public.student_verifications,
  public.app_settings, public.wallet_balances, public.goal_progress, public.budget_usage
  to authenticated;
grant update (full_name, avatar_path) on public.profiles to authenticated;
grant select, insert, update on public.notification_preferences to authenticated;
grant select, insert, delete on public.report_dismissals to authenticated;

create policy "read own profile" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "update own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy "read own wallet" on public.wallets for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "read own budgets" on public.budgets for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "read own goals" on public.savings_goals for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "read own locks" on public.lock_commitments for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "read own transactions" on public.transactions for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "read own or admin verification" on public.student_verifications for select to authenticated
  using ((select auth.uid()) = user_id or (select public.is_admin()));
create policy "read own notifications" on public.notification_preferences for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "add own notifications" on public.notification_preferences for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "update own notifications" on public.notification_preferences for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "read own dismissals" on public.report_dismissals for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "add own dismissals" on public.report_dismissals for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "delete own dismissals" on public.report_dismissals for delete to authenticated
  using ((select auth.uid()) = user_id);
create policy "read app settings" on public.app_settings for select to authenticated
  using (true);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('avatars', 'avatars', false, 1048576, array['image/jpeg', 'image/png', 'image/webp']),
  ('school-ids', 'school-ids', false, 2097152, array['image/jpeg', 'image/png', 'image/webp']);

create policy "read own avatar" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "add own avatar" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "replace own avatar" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete own avatar" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "read own or admin school id" on storage.objects for select to authenticated
  using (bucket_id = 'school-ids' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));
create policy "add own school id" on storage.objects for insert to authenticated
  with check (bucket_id = 'school-ids' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "replace own school id" on storage.objects for update to authenticated
  using (bucket_id = 'school-ids' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'school-ids' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "delete own school id" on storage.objects for delete to authenticated
  using (bucket_id = 'school-ids' and (storage.foldername(name))[1] = (select auth.uid())::text);
