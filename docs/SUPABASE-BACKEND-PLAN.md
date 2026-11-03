# StudentSave simulated MVP plan (Supabase)

Status: in progress. The hosted Supabase project is linked and configured, and the schema, RLS, RPCs, and simulated bank are applied. Phases 2 and 3 are complete on the hosted project, except that the password reset email has not been tested with a real inbox. Student verification, admin approval, school status, and avatars already run on the database and Storage, because the money RPCs need a verified student. Phase 4 is complete: no finance data stays in the browser, and `delete-account` is deployed. Phase 5 still needs the simulator panel and permanent test banner. The admin is `curtygeo@gmail.com`, an admin-only account with no wallet: admins are always sent to the queue, and change their password there. The queue is at `/admin/student-verifications` on the web app; `apps/admin` only redirects there.

Checks run with `pnpm supabase:check`, using plain SQL scripts rather than pgTAP. Password reset uses the link in Supabase's built-in email. TanStack Query is added with the Phase 4 screens that use it.

Based on a review of the code at commit `4dd917d` and [the PRD summary](PRD-SUMMARY.md).

## 1. Goal

Build a test MVP that runs the whole StudentSave journey end to end, with real accounts and a real database but **simulated money**.

- **In scope:** sign-up, wallet setup, student verification, admin approval, funding, payments, withdrawals, budgets, savings goals, lock savings, automatic savings, reports, data export, and account deletion.
- **Simulated:** banks, bank transfers, recipient lookup, settlement, failures, reversals, and the passing of time.
- **Not used:** licensed payment providers, bank APIs, identity-check services, or paid plans.

No real money moves at any point, and nothing in the app should suggest otherwise.

### Cost

| Need | Free option |
|---|---|
| Database, auth, storage | One hosted project on the Supabase Free plan, for development and testing |
| Hosted app | The existing Vercel deployment |
| Emails | Not needed for sign-up. Password reset to outside testers needs a free tier from an SMTP provider. |

Limits of the Free plan to accept for a test:

- The project pauses after a week of low activity, and is restored from the dashboard.
- There are no automatic backups, so treat hosted test data as disposable.
- The built-in email sender only reaches your Supabase team members, at 2 emails per hour.
- Free projects cannot edit email templates on the built-in sender.
- With one project, every migration applies directly to the only database. Test data is disposable, so this is acceptable.

`pg_cron` is available on this project, but is not enabled yet.

## 2. How the simulation works

A small **simulated bank** lives in the database. The app talks to it the way it would talk to a payment provider: it starts a transfer, waits, and receives an event saying what happened. Only that event can settle a transfer.

```
Student action ──> start_transfer ──> ledger row: pending
                                      sim_transfers row
                                            │
         app polls sim_tick while pending   │ after a short delay
                                            ▼
                                  sim_events row (like a webhook)
                                            │
                                            ▼
                                  apply_transfer_event
                         success / failed / reversed in the ledger
```

`apply_transfer_event` is the only function allowed to change a pending transfer. A future provider could call it from a real webhook without changing the ledger or screens.

### Simulated banks and recipients

Fictional banks replace the real bank names in `transactions/page.tsx`: Test Bank A, B, C, D, and E.

The account number chooses what happens:

| Account number | Name returned | Result |
|---|---|---|
| `0000000000` | StudentSave Test Recipient | Succeeds |
| `0123456789` | Ada Okafor | Succeeds |
| `1234567890` | Tunde Balogun | Succeeds |
| `0000000001` | Failing Test Recipient | Fails, and funds return to the balance |
| `0000000002` | Pending Test Recipient | Stays pending until settled from the simulator |
| `0000000003` | Reversal Test Recipient | Succeeds, then reverses |
| `0000000004` | None | Lookup fails, "account not found" |
| Any other 10 digits | Mock Recipient + last 4 digits | Succeeds |

### Simulator panel

A `/dashboard/simulator` page lets a tester control the simulated world:

- **Incoming transfer:** send a chosen amount and sender name into the wallet.
- **Settle now:** settle or fail any pending transfer.
- **Replay event:** send the same event again, to prove nothing is applied twice.
- **Advance time:** move forward 1, 7, or 30 days.
- **Reset my data:** clear the tester's ledger, goals, budgets, and locks, while keeping the account.
- **Activity log:** show transfers and events in order.

### Simulated time

Automatic savings and lock terms take days or months, so each tester has a simulated date.

- `app_today(user_id)` returns the Lagos date plus the tester's `offset_days`.
- All server rules use this function. Screens read the date from the server rather than `localDateValue()` or `Date.now()`.
- Time only moves forward. Use **Reset my data** to return to today.

### Keeping it clearly a test

- Show a permanent "Test mode: simulated money" banner on every signed-in page, on the landing page, and in the sign-up flow.
- Label receipts "Simulated receipt · No real money was transferred".
- Show wallet references as `TEST-483920`, which cannot be used in a real bank app. The current random 10-digit number could match a real person's account.
- Keep "Transfer details" in the UI only inside the simulator flow.
- Tell testers to use made-up details and sample ID images. Do not collect real IDs or matric numbers.
- Guard every simulator RPC with the `app_settings.simulation_mode` flag. `NEXT_PUBLIC_SIMULATION_MODE` only controls what the UI shows.

## 3. Product decisions

These are decided for this plan, so building can start.

| Topic | Decision |
|---|---|
| Money | Simulated only. |
| Add funds, manual entry | Stays, labeled as a test credit. It is the fast way to set up a scenario. |
| Add funds, bank transfer | Runs through the simulated bank, and credits the wallet only after success. |
| Expenses and withdrawals | Run through the simulated bank. Funds are held while pending. |
| Lock Savings 5% fee | Stays as built, recorded as a simulated fee. |
| Student verification | Stays required, with manual admin approval and sample IDs. |
| Old browser data | Not imported ([section 9](#9-existing-browser-data)). |
| Admin app | Stays inside `web` at `/admin`, protected by login and `is_admin()`. One deployment is enough for a test. |
| Timezone | One app timezone, `Africa/Lagos`. |
| Currency | NGN only. |

Still open from the PRD, with no effect on this build:

- Custom categories.
- Negative opening balances.
- Final budget thresholds, which stay at 80% and 100%.

## 4. Problems to fix along the way

### Security

Even with fake money, testers use real email addresses and passwords.

| Problem | Location | Fix |
|---|---|---|
| Old and new passwords are stored **in plain text** after a password change | `dashboard/settings/page.tsx:104` | Remove now, in Phase 0. |
| `?email=` overrides the signed-in user | `useDashboardSession.ts:20,28` | Use the Supabase session. Remove `email` from all URLs. |
| The admin queue is public | `/admin/student-verifications` | Require login and `is_admin()`. |
| The reset code is always `123456` | `forgot-password/page.tsx:29` | Use Supabase password reset. |
| Passwords use unsalted SHA-256 in the browser | `auth/_components/password.ts` | Use Supabase Auth, and delete this file. |
| The PIN is checked in the browser, with no attempt limit | `transactionPin.ts` | Bcrypt hash, server check, and lockout. |
| Balance, limit, and approval checks can be bypassed | All client components | Enforce them in RPCs. |

### Logic

| Problem | Location | Fix |
|---|---|---|
| A "Data" budget never shows spending, because "Data" is not an expense category | `budgets/page.tsx:11`, `transactions/page.tsx:28` | One shared category list. |
| Reports count savings withdrawals and lock collections as "Funds added" | `reports/page.tsx:103,117` | Report by ledger `kind`. |
| Budgets count those returned funds as "Total income" | `budgets/page.tsx:52` | Count only real incoming kinds. |
| Budgets use a UTC month while other pages use local time | `budgets/page.tsx:27` | Use `app_today()`. |
| Transaction type depends on category text and a regex | `mockFinance.ts:57` | Explicit `kind` column. |
| Receipts always say "successful" | `MockReceipt.tsx:32` | Show pending, failed, and reversed. |
| Amounts are floats | Several pages | Integer kobo everywhere. |
| The name is stored in three places | `mock-account`, `profile`, wallet `ownerName` | One `profiles.full_name`. |

### Missing features to add

- Editing and deleting transactions (PRD requirement).
- Optional opening balance (PRD requirement).
- Resetting a forgotten PIN.
- Rejecting a student verification.

## 5. Architecture

```
Browser (Next.js client components)
  │  @supabase/ssr browser client + publishable key
  │  reads: RLS-protected tables and views
  │  writes: RPCs for anything touching money
  ▼
Supabase
  ├─ Auth      sign-up, sessions, password reset
  ├─ Postgres  tables, RLS, RPCs, simulated bank, pg_cron
  ├─ Storage   avatars, school-ids (both private)
  └─ Edge Function  delete-account (uses the secret key)
```

- **Client components call Supabase directly.** RLS and RPCs provide the security, so no separate API is needed.
- **Money rules live in Postgres,** where row locks and transactions prevent double spends.
- **TanStack Query** replaces `localStorage` reads and `storage` events. It polls while a transfer is pending.
- **`proxy.ts`** refreshes sessions and redirects routes. Next.js 16 renamed Middleware to Proxy, and advises against using it as the full authorization layer.
- **Keys** are the new `sb_publishable_...` and `sb_secret_...` types.

### Repository layout

```
supabase/
  config.toml
  migrations/          schema, RLS, RPCs
  migrations/*_sim_*   simulated bank, kept separate so it can be removed later
  seed.sql             test admin and sample data
  tests/               pgTAP tests
  functions/delete-account/
packages/supabase/     @repo/supabase: clients and generated types
apps/web/src/proxy.ts
apps/web/src/lib/queries/
apps/web/src/app/dashboard/simulator/
```

### Environment variables

| Name | Used by | Exposure |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | web | Public |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | web | Public |
| `NEXT_PUBLIC_SIMULATION_MODE` | web | Public, UI only |
| `SUPABASE_SECRET_KEY` | Edge Function secret only | **Server only. Never use the `NEXT_PUBLIC_` prefix.** |

Remove `NEXT_PUBLIC_API_URL` from the `.env.example` files, and add the public variables to `tasks.build.env` in `turbo.json`.

## 6. Database design

Money is `bigint` kobo. IDs are `uuid`. Timestamps are `timestamptz`. Calendar dates are `date` in `Africa/Lagos`.

### Core tables

**`profiles`**: `id` (references `auth.users`, cascade delete), `full_name`, `avatar_path`, `created_at`, `updated_at`. A trigger creates the row at sign-up.

**`wallets`**: `user_id` (primary key), `currency`, `reference` (unique, `TEST-...`), `created_at`. This row is the per-user lock for money actions.

**`wallet_pins`**: `user_id`, `pin_hash`, `failed_attempts`, `locked_until`, `updated_at`. RLS is on with no policies, so no client can read it.

**`transactions`** is the ledger:

| Column | Notes |
|---|---|
| `id`, `user_id` | |
| `kind` | Credits: `income`, `opening_balance`, `deposit`, `goal_withdrawal`, `lock_collection`, `transfer_reversal`. Debits: `expense`, `withdrawal`, `goal_contribution`, `lock_deposit`, `lock_fee`. |
| `status` | `pending`, `completed`, `failed` |
| `amount_kobo` | `check (amount_kobo > 0)` |
| `category`, `occurred_on`, `note` | Note limited to 120 characters |
| `recipient_name`, `recipient_bank`, `recipient_account_number` | Simulated recipient details |
| `receipt_number`, `receipt_created_at` | Generated on the server |
| `goal_id`, `commitment_id`, `sim_transfer_id` | Optional links |
| `source` | `manual`, `auto`, or `simulated_bank` |
| `idempotency_key` | `unique (user_id, idempotency_key)` |
| `deleted_at`, `created_at`, `updated_at` | Soft delete |

Indexes: `(user_id, occurred_on desc)`, `(goal_id)`, `(commitment_id)`.

**`budgets`**: `id`, `user_id`, `category`, `amount_kobo`, `month`, `created_at`. Unique on `(user_id, month, category)`.

**`savings_goals`**: `id`, `user_id`, `name`, `target_kobo`, `due_date`, `created_at`, `contribution_method`, `auto_amount_kobo`, `auto_frequency`, `auto_enabled`, `next_contribution_on`, `schedule_day`, `blocked_since`, `withdrawn_at`, `withdrawal_kobo`. A contribution is a ledger row, so there is no separate contributions table.

**`lock_commitments`**: `id`, `user_id`, `plan_months`, `target_kobo`, `locked_kobo`, `start_date`, `end_date`, `description`, `created_at`, `withdrawn_at`, `withdrawal_fee_kobo`, `withdrawal_net_kobo`.

**`student_verifications`**: `user_id` (primary key), `institution`, `matric_number`, `level`, `course`, `school_id_path`, `school_id_file_name`, `status` (`pending`, `verified`, `rejected`), `submitted_at`, `reviewed_at`, `reviewed_by`, `rejection_reason`.

**Other tables:** `notification_preferences`, `report_dismissals`, `admin_users`, `audit_log`, and `app_settings` (holding `school_status` and `simulation_mode`).

### Simulator tables

- **`sim_banks`**: `code`, `name`.
- **`sim_accounts`**: `account_number`, `name`, `scenario`.
- **`sim_transfers`**: `id`, `user_id`, `direction`, `amount_kobo`, `status`, `scenario`, `reference` (unique), `settle_after`, `settled_at`, `created_at`.
- **`sim_events`**: `id`, `transfer_id`, `event_type`, `event_key` (unique), `payload`, `processed_at`, `created_at`.
- **`sim_clocks`**: `user_id`, `offset_days`.

### Views

Use `security_invoker = true`, so RLS still applies.

- **`wallet_balances`:** available balance is completed credits, minus completed debits, minus pending debits. Pending debits are included so that a held amount cannot be spent twice. Failed and soft-deleted rows are excluded.
- **`goal_progress`:** goal plus the sum of its contributions.
- **`budget_usage`:** spending per budget for the month.

Balances are always calculated, so they cannot drift from the ledger.

### Moving `localStorage` keys to tables

| `studentsave:` key | Destination |
|---|---|
| `password-hash`, `password-reset`, `email-verification`, `pending-signup`, `password-change` | Supabase Auth; values not kept |
| `active-email` | Supabase session |
| `mock-account`, `profile` | `profiles` |
| `profile-picture` | `avatars` bucket and `profiles.avatar_path` |
| `wallet`, `wallet-account-number` | `wallets`, `wallet_pins` |
| `transactions`, `fund-additions`, `savings-contributions` | `transactions` |
| `budgets` | `budgets` |
| `savings-goals` | `savings_goals` |
| `lock-commitments` | `lock_commitments` |
| `student-verification` | `student_verifications` and `school-ids` bucket |
| `notifications` | `notification_preferences` |
| `reports-dismissed` | `report_dismissals` |
| `school-status` | `app_settings` |
| `finance-pending`, `mock-finance-reset-v1`, `mock-balance-initialized` | Removed |

### RPC pattern

Each money RPC follows these steps inside one database transaction, replacing `withFinanceLock` and `saveFinance`:

1. Identify the user from `auth.uid()`, never from a parameter.
2. Return the earlier result if the idempotency key was already used.
3. Lock the user's `wallets` row with `for update`.
4. Check the student is verified and the PIN is correct.
5. Re-read current data and validate it.
6. Write the ledger row and related rows.
7. Write `audit_log` and return the result.

Functions use `security definer` and `set search_path = ''`. Revoke execute from `public` and `anon`, then grant it to `authenticated`.

**A wrong PIN must return a result, not raise an error.** An exception rolls back the transaction, including the `failed_attempts` increment, which would silently disable the lockout. Return `{ "ok": false, "code": "pin_incorrect" }`.

### App RPCs

| RPC | PIN | Key rules, taken from the current code |
|---|---|---|
| `create_wallet` | Sets it | One per user. |
| `reset_pin` | New PIN | Requires a fresh password check. |
| `submit_student_verification` | No | Sets `pending`, and cannot set `verified`. |
| `record_income` | No | Test credit, with a receipt. |
| `resolve_recipient` | No | Looks up `sim_accounts`. |
| `start_transfer` | Yes | For expenses and withdrawals. Amount must not exceed the balance. Creates a pending ledger row. |
| `update_transaction`, `delete_transaction` | Yes | Only `income` and settled `expense` rows. Rejected if the balance would go below zero. |
| `create_budget` | No | One per category and month. Total cannot exceed the lower of income and balance. Overspending stays allowed. |
| `create_goal` | No | Target of at least ₦0.01. Starts with method `none`. |
| `set_goal_contribution_settings` | Only for `auto` | Not after withdrawal. First run is next period. |
| `pause_goal_contributions` | No | Sets `auto_enabled = false`. |
| `contribute_to_goal` | Yes | Not above the balance or remaining target. |
| `withdraw_goal` | Yes | Once only, after the target is reached. Rejects a changed saved amount. Stops the schedule. |
| `create_lock_commitment` | Yes | Not above the balance. Start date today or later. |
| `collect_lock_commitment` | Yes | Once only. Fee is 5% rounded to the nearest kobo. Gross return and fee are separate rows. |
| `export_my_data` | No | Returns the user's data as JSON. |
| `review_student_verification` | Admin | Approves or rejects. Writes the audit log. |
| `set_school_status` | Admin | Writes the audit log. |

### Simulator RPCs

All of these check `simulation_mode` and act only on the caller's own data.

| RPC | Purpose |
|---|---|
| `sim_incoming_transfer` | Starts an incoming transfer. |
| `sim_tick` | Settles the caller's due transfers, and runs their due contributions. |
| `sim_settle_transfer` | Forces success or failure. |
| `sim_replay_event` | Sends a stored event again. |
| `sim_advance_days` | Adds 1, 7, or 30 days, then ticks. |
| `sim_reset_my_data` | Clears the caller's test records. |

`apply_transfer_event` is internal, and is not callable by users. It applies each `event_key` once:

| Event | Ledger change |
|---|---|
| Outgoing success | `pending` becomes `completed`. |
| Outgoing failed | `pending` becomes `failed`, which releases the held funds. |
| Incoming success | Adds a completed `deposit`. |
| Reversed | Adds a `transfer_reversal` credit. The original row stays. |

### Automatic savings

`applyDueContributions` moves to `run_due_contributions()` and keeps its current behavior:

- Catches up missed periods in order, using the simulated date.
- Stops at the target, and caps the last contribution at what remains.
- Waits when funds run out, and sets `blocked_since` for the "add funds" notice.
- Keeps the chosen monthly day, using the last day of shorter months.

It runs in three ways:

- `sim_tick`, when a tester opens the app or advances time.
- `pg_cron` hourly on all due goals, in batches with `for update skip locked`.

Update the "while StudentSave is open" copy in `ContributionSettingsDialog.tsx`, `SavingsGoalsContent.tsx`, and the README.

## 7. Security

**RLS is on for every table.**

| Tables | User access |
|---|---|
| `profiles` | Read and update own row. Column grants limit updates to `full_name` and `avatar_path`. |
| `wallets`, `transactions`, `budgets`, `savings_goals`, `lock_commitments`, `sim_transfers`, `sim_events`, `sim_clocks` | Read own rows. Writes through RPCs only. |
| `wallet_pins`, `audit_log`, `admin_users` | No access. |
| `sim_banks`, `sim_accounts` | Read through RPCs only. |
| `student_verifications` | Read own row. Admins read all. Writes through RPCs only. |
| `notification_preferences`, `report_dismissals` | Read and write own rows. |
| `app_settings` | Signed-in users read. Writes through admin RPCs. |

Use `(select auth.uid())` in policies, so Postgres caches the value.

**Storage:** the `avatars` and `school-ids` buckets are private, with files under `{user_id}/...`. Only JPEG, PNG, and WebP are allowed, at 1 MB and 2 MB. Admins read IDs through signed URLs lasting 5 minutes or less. `compressImage` stays, and uploads a `Blob`.

**PIN:** bcrypt through `pgcrypto`, locked for 15 minutes after 5 wrong attempts.

**Auth:** email confirmation is off, so anyone can sign up with an address they do not own. Accept this for the test only. The minimum password length is 8.

**Admin:** add accounts to `admin_users` by hand. Do not create shared admin passwords. MFA waits until after this test.

**Account deletion:** the `delete-account` Edge Function verifies the caller, deletes their files, then deletes the auth user, which cascades to their data.

## 8. Delivery phases

Keep the mock flow working on `main` until Phase 3 replaces it.

### Phase 0: Prepare

- Remove the plain-text password write at `settings/page.tsx:104`.
- Decide how password reset works for outside testers. It needs custom SMTP, or a link-based reset page.

**Done when:** the fix is merged.

### Phase 1: Local foundation

- Add `@repo/supabase`, TanStack Query, and generated types.
- Choose how to run pgTAP tests without a local database. `supabase test db` targets a local stack by default.
- Write migrations for core tables, views, RLS, and storage.

**Done when:** `pnpm supabase:push` applies cleanly, and pgTAP tests show one user cannot reach another's data.

### Phase 2: Ledger and simulated bank

- Write app RPCs, simulator tables, simulator RPCs, and `apply_transfer_event`.
- Port these tests to pgTAP: `savingsAutomation.test.ts`, `goalSettings.test.ts`, `financeStorage.test.ts`, `creditAmounts.test.ts`.
- Add tests for concurrency, replayed events, PIN lockout, every recipient scenario, and simulated time.

**Done when:** two simultaneous spends above the balance result in one success, and a replayed event changes nothing.

### Phase 3: Auth and session

- Add `proxy.ts`. Rewrite sign-up, sign-in, forgot-password, wallet-setup, and wallet-created.
- Replace `useDashboardSession`, and remove `?email=` everywhere.
- Add forgot-PIN.

**Done when:** a new user signs up, creates a wallet, and signs in from another browser. Changing the URL reveals nothing.

### Phase 4: Finance screens

Move these in order:

1. Dashboard and transactions, with pending, failed, and reversed states.
2. Add funds.
3. Budgets.
4. Savings goals.
5. Lock savings.
6. Reports and alerts.
7. Settings.

Then delete `financeStorage.ts`, `runSavingsAutomation.ts`, `transactionPin.ts`, and the `mockFinance.ts` storage code.

**Done when:** no finance `localStorage` remains, and reports match the ledger for a seeded account.

### Phase 5: Verification, admin, and simulator

- Move uploads to Storage. Connect `StudentVerificationReview`, and add rejection.
- Protect `/admin`, and move school status to `app_settings`.
- Build the simulator panel, test banner, and receipt labels.
- Keep `apps/admin` in the repository, undeployed, because `web` imports its review component.

**Done when:** every scenario in [section 10](#10-end-to-end-test-script) passes locally.

### Phase 6: Hosted test

- Add the Vercel environment variables.
- Custom SMTP is deferred until the domain is paid for. Sign-up does not need email, but password-reset emails only reach Supabase project team members until then.
- Add the one-time browser cleanup.
- Run the test script again on the hosted app, then invite testers.

**Done when:** a tester outside the team completes the script without help.

## 9. Existing browser data

Do not import it. The data is demo data in individual browsers, and the old password hashes cannot move to Supabase Auth.

After the switch, a one-time cleanup removes every `studentsave:*` key. This matters most for `password-change` (plain-text passwords) and `student-verification` (ID images).

## 10. End-to-end test script

Run this with a fresh tester account. Automate the main path with Playwright if time allows.

| # | Steps | Expected result |
|---|---|---|
| 1 | Sign up with an email address | Account is created, and wallet setup opens. A duplicate email is refused. |
| 2 | Create a wallet with a PIN | Wallet shows a `TEST-` reference. |
| 3 | Open the dashboard | Redirected to student verification. |
| 4 | Submit details with a sample ID | Status is pending. Finance RPCs are still refused. |
| 5 | Reject as admin, then resubmit and approve | Student sees the reason, then gains access. |
| 6 | Simulate an incoming transfer of ₦50,000 | Pending, then credited, with a receipt. |
| 7 | Replay that event | Balance does not change. |
| 8 | Pay an expense to `0123456789` | Pending, then success. Budget and reports update. |
| 9 | Withdraw to `0000000001` | Fails, and funds return. |
| 10 | Withdraw to `0000000002`, then spend the rest of the balance | Funds stay held. Spending above what remains is refused. |
| 11 | Settle the pending transfer from the simulator | Status updates on screen. |
| 12 | Send to `0000000003` | Succeeds, then a reversal returns the funds. |
| 13 | Look up `0000000004` | "Account not found". |
| 14 | Enter a wrong PIN 5 times | Locked, and the lockout survives a reload. |
| 15 | Reset the PIN with the password | New PIN works, and the old one does not. |
| 16 | Create a budget, and overspend it | Alerts show at 80% and 100%. Spending stays allowed. |
| 17 | Create a daily automatic goal, then advance 7 days | Seven contributions appear, up to the target. |
| 18 | Empty the balance, advance, then add funds | Notice shows "add funds", then contributions catch up. |
| 19 | Set a monthly goal on the 31st, and advance 30 days at a time | Runs on the last day of shorter months. |
| 20 | Reach the goal, and withdraw | Full amount returns. A second withdrawal is refused. |
| 21 | Create a 1-month lock, and collect early | 5% fee shown, and gross and fee rows appear. |
| 22 | Create another lock, advance 30 days, and collect | Term is complete, and the fee still applies. |
| 23 | Edit and delete a transaction | Balance, budgets, and reports all recalculate. |
| 24 | Double-click a submit button, on a slow connection | Only one record is created. |
| 25 | Call another user's data from dev tools | Refused by the database. |
| 26 | Export data, then delete the account | Export is complete. Data and files are gone. |

## 11. Main risks

| Risk | Mitigation |
|---|---|
| A tester thinks the money is real | Permanent banner, fictional banks, `TEST-` references, and clear receipts. |
| A tester uploads a real ID | Clear instruction beside the upload, and a sample ID to download. |
| A missing RLS policy exposes data | RLS tests per table, and the Supabase database linter. |
| Simulator RPCs reach real data later | Separate `sim_` migrations, and the `simulation_mode` check. |
| The free project pauses mid-test | Restore it from the dashboard. Data survives, and contributions catch up. |
| Free email limits slow sign-ups | Keep tester groups small, and raise limits within the SMTP plan. |

## 12. Before any real money

This MVP is **not** ready for real funds. Before that, the team would need:

- A licensed payment partner, and legal advice on the product.
- A review against the Nigeria Data Protection Act, before collecting real IDs.
- Removal of the `sim_` migrations, panel, clock, and `TEST-` references.
- A paid plan with backups, plus admin MFA, a separate admin deployment, and a security review.

The `apply_transfer_event` boundary is designed to keep the ledger and screens largely the same through that change.

## References

- [Supabase API keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Migrating to publishable and secret keys](https://supabase.com/docs/guides/getting-started/migrating-to-new-api-keys)
- [Creating a Supabase client for SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [Custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp)
- [Auth rate limits](https://supabase.com/docs/guides/auth/rate-limits)
- [Testing auth flows locally](https://supabase.com/docs/guides/auth/testing-auth-flows)
- [Testing and linting](https://supabase.com/docs/guides/local-development/cli/testing-and-linting)
- [Project pausing](https://supabase.com/docs/guides/platform/free-project-pausing)
- [Pricing](https://supabase.com/pricing)
- Next.js 16 Proxy guide: `apps/web/node_modules/next/dist/docs/01-app/01-getting-started/16-proxy.md`
