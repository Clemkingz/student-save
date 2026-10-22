# StudentSave PRD summary

Source: StudentSave Product Requirements Document, v1.0, dated 20 October 2026. This is a summary of product requirements, not an instruction to treat unresolved assumptions as approved decisions.

## Product

StudentSave is a responsive web app that helps students and young adults make sense of irregular income and everyday spending. Users record money activity, plan budgets, set savings targets, and build habits with reminders. The MVP is a personal record-keeping and accountability tool: it does not connect to banks, verify balances, or hold or move money.

The product principles are clarity, user control, low-friction entry, consistency across features, privacy, and honest claims. Email verification proves access to an email address only; it does not verify student status.

## Audience and problems

The main users include students managing allowances and school costs, working students with wages or side income, savings-focused students, and budget beginners. Their needs are quick transaction entry, understandable available-money context, practical spending limits, visible progress toward personal targets, and clear guidance without finance jargon or shaming.

## MVP scope

- Account creation, sign-in/out, email verification, and password reset.
- One tracked wallet per user, with one currency and an optional opening balance.
- Dashboard with tracked balance, recent records, budget and goal summaries, and quick add actions.
- Income and expense records with amount, date, category, and optional note; users can view, filter, edit, and delete them.
- Category budgets with period, spend/remaining figures, progress, and threshold alerts.
- Savings goals with targets, optional dates, manually recorded contributions, and progress.
- Optional “Lock Savings” commitments with manually entered progress and clear disclosure that funds are neither held nor restricted.
- Reports by date range and category; in-app, email, and push notification preferences.
- Profile, verification state, currency display, security, and notification settings.

Bank linking/import, payments/transfers, custody, actual fund locking, interest/investment/loan products, student-status checks, multi-wallet, multi-currency, shared savings, and recurring transactions are outside the MVP.

## Main journeys

1. Sign up, verify email ownership, choose one account currency, optionally record an opening balance, and reach a dashboard with prompts to add the first record.
2. Add income or an expense; the tracked balance, budget usage, and reports update from that user-entered record.
3. Create a category budget and review actual spend versus its limit, including neutral alerts near or above the limit.
4. Create a savings goal and manually record contributions; the UI reports recorded progress without implying a transfer.
5. Optionally create a Lock Savings commitment and manually log progress, with the no-funds-held disclosure at creation and progress entry.
6. Return to review activity, reports, alerts, or settings; recover access through expiring verification/reset links or codes.

## Core rules and calculations

- Tracked balance = opening balance + recorded income − recorded expenses. It is user-reported and must never be presented as a verified bank balance.
- Keep all records in the wallet’s single currency. Do not silently mix currencies; use integer minor units or precise decimal arithmetic for money.
- Budget actual spend is eligible category expenses in the selected period. Remaining = limit − actual spend. Spending over budget is allowed and should be explained, not blocked.
- Goal progress is the sum of manually recorded contributions. Percentage = contribution total / target; the visual bar may cap at 100%, while the numeric total preserves over-target contributions.
- Editing or deleting a transaction must recalculate affected summaries. Repeated submissions must not create duplicates.
- Date boundaries and timezone behaviour must be consistent so reports reconcile with records.

## Trust, privacy, and UX requirements

Use terms such as “tracked balance,” “recorded contribution,” “remaining budget,” and “goal progress.” Do not say “bank balance,” “deposit,” or “unlock” when those actions do not exist. Keep missed targets and overspending language practical and neutral.

Every core flow needs loading, success, empty, validation-error, server-error, and permission-denied states. Preserve form values after recoverable errors and confirm destructive actions. Enforce record ownership and server-side validation. Use secure sessions, rate limits, safe password handling, HTTPS, appropriate logging, privacy/retention policies, and a clear export/deletion path before launch.

Target WCAG 2.2 AA: programmatic labels and field-error associations, keyboard access and visible focus, readable contrast, touch-sized controls, no color-only status, and accessible chart summaries. Mobile, tablet, and desktop should have equivalent core functionality without clipped amounts or horizontal overflow.

## Metrics and delivery

Measure onboarding completion, first record within 24 hours, weekly record creation, budget and goal engagement, 7/30-day retention, reminder usefulness, and data quality. Set targets only after a baseline cohort. Analytics must not include passwords, tokens, raw notes, or unnecessary detailed financial data.

Suggested delivery sequence: validate open decisions and screens; build authentication/email/wallet foundation; deliver transaction tracking and reconciled balance; add budgets and goals/commitments; add reports and notification preferences; then complete accessibility, privacy, security, performance, analytics, and QA work.

## Decisions still open in the PRD

- NGN-only or allow selection among single currencies; policy for changing currency after records exist.
- Whether custom categories are included in the MVP.
- Whether a negative opening balance is supported.
- Final budget warning thresholds (80% and 100% are suggestions) and calendar/custom period rules.
- Essential account-email versus optional reminder policy.
- Retention, deletion, export, legal/privacy review, and launch jurisdiction requirements.
- Whether unverified users have limited access or must verify before entering the app.

## Success criteria in one sentence

Users can safely record their own activity, reconcile the resulting summaries, plan spending and savings, and understand that StudentSave tracks their entries but never controls or verifies their money.
