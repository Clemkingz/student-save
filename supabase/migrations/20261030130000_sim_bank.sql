-- Simulated bank and clock. Kept separate so it can be removed before any real-money launch.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.sim_scenario as enum ('success', 'fail', 'hold', 'reverse', 'lookup_fail');
create type public.sim_transfer_status as enum ('pending', 'success', 'failed', 'reversed');
create type public.sim_direction as enum ('incoming', 'outgoing');
create type public.sim_event_type as enum ('success', 'failed', 'reversed');

create table public.sim_banks (
  code text primary key,
  name text not null
);
insert into public.sim_banks (code, name) values
  ('901', 'Test Bank A'), ('902', 'Test Bank B'), ('903', 'Test Bank C'),
  ('904', 'Test Bank D'), ('905', 'Test Bank E');

create table public.sim_accounts (
  account_number text primary key check (account_number ~ '^[0-9]{10}$'),
  name text,
  scenario public.sim_scenario not null
);
insert into public.sim_accounts (account_number, name, scenario) values
  ('0000000000', 'StudentSave Test Recipient', 'success'),
  ('0123456789', 'Ada Okafor', 'success'),
  ('1234567890', 'Tunde Balogun', 'success'),
  ('0000000001', 'Failing Test Recipient', 'fail'),
  ('0000000002', 'Pending Test Recipient', 'hold'),
  ('0000000003', 'Reversal Test Recipient', 'reverse'),
  ('0000000004', null, 'lookup_fail');

create table public.sim_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  direction public.sim_direction not null,
  amount_kobo bigint not null check (amount_kobo > 0),
  counterparty text not null,
  status public.sim_transfer_status not null default 'pending',
  scenario public.sim_scenario not null,
  reference text not null unique,
  idempotency_key text not null,
  settle_after timestamptz,
  reverse_after timestamptz,
  settled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index sim_transfers_user_idx on public.sim_transfers (user_id, created_at desc);

create table public.sim_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  transfer_id uuid not null references public.sim_transfers (id) on delete cascade,
  event_type public.sim_event_type not null,
  event_key text not null unique,
  deliveries integer not null default 1,
  processed_at timestamptz not null default now()
);
create index sim_events_transfer_idx on public.sim_events (transfer_id);
create index sim_events_user_idx on public.sim_events (user_id);

create table public.sim_clocks (
  user_id uuid primary key references auth.users (id) on delete cascade,
  offset_days integer not null default 0 check (offset_days >= 0)
);

alter table public.transactions
  add constraint transactions_sim_transfer_fkey
  foreign key (sim_transfer_id) references public.sim_transfers (id) on delete set null;
create index transactions_sim_transfer_idx on public.transactions (sim_transfer_id) where sim_transfer_id is not null;

alter table public.sim_banks enable row level security;
alter table public.sim_accounts enable row level security;
alter table public.sim_transfers enable row level security;
alter table public.sim_events enable row level security;
alter table public.sim_clocks enable row level security;

grant select on public.sim_transfers, public.sim_events, public.sim_clocks to authenticated;

create policy "read own transfers" on public.sim_transfers for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "read own events" on public.sim_events for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "read own clock" on public.sim_clocks for select to authenticated
  using ((select auth.uid()) = user_id);
