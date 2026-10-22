# StudentSave

Responsive student-focused personal finance tracker. The workspace has a public marketing site in `apps/landing` and the future signed-in product experience in `apps/web`.

## Stack

- pnpm workspaces and Turborepo
- Next.js App Router, React, and TypeScript
- Tailwind CSS 4
- Shared workspace packages for UI, ESLint, and TypeScript configuration
- CSS transitions and keyframe animations, with reduced-motion support

Peakline’s apps use Next.js 16, React 19, TypeScript, Tailwind CSS 4, and Turborepo with pnpm workspaces. Its broader monorepo also has separate landing and admin apps, a shared UI package, ESLint and TypeScript config packages, Prettier, and app-level tools including TanStack Query, Axios, React Hook Form, Zod, Zustand, Recharts, and Lucide. This StudentSave scaffold adopts that structure. The landing app uses Lucide and CSS animations; product data and form libraries will be added when those features and the API contract are ready.

## Start

Use Node.js 24 or newer and pnpm 11.25.0.

```sh
pnpm install
pnpm dev
```

`pnpm dev` starts three independent apps, following [Peakline's routing structure](https://github.com/T-laye/peakline): none uses a Next.js base path.

- Web: http://localhost:3000. The welcome page's Continue button opens `/landing`.
- Landing: http://localhost:3002. Account links open the web app at `/auth/sign-up`.
- Admin: http://localhost:3003. Its root redirects to `/student-verifications`.

The web app also serves the landing page at `/landing` and the mock verification queue at `/admin/student-verifications`, reusing the standalone apps' components. Use the review link on the student's verification page to review submissions on the **same origin**. Browser storage is isolated by origin: the standalone admin app on port 3003 cannot read submissions from port 3000. This is a local mock review flow, with no admin authentication or server verification; production verification requires an authenticated backend.

The main deployment is https://student-saveus.vercel.app. The root `vercel.json` declares one Next.js service from `apps/web`, which serves welcome, landing, auth, dashboard, and mock admin routes together. All public requests route to that service. The old `/app` base path has been removed.

### Vercel deployment

In the Vercel project's Settings → Build and Deployment, configure:

- Root Directory: repository root (leave empty or use `.`).
- Framework Preset: **Services**, matching the existing Vercel project.
- Leave project-level build, install, and output overrides disabled. The root `vercel.json` configures `pnpm build` and `.next` inside the `web` service, whose root is `apps/web`. Vercel detects Next.js from that service's package.json and installs the pnpm workspace dependencies.

Deploy the commit containing the root service declaration. `MISSING_SERVICES` means the project is set to Services but its selected root has no `services` declaration. `NEXT_NO_VERSION` occurs if the repository root is treated directly as a Next.js app: Next.js is a dependency of `apps/web/package.json`, not the workspace root.

For an independent, non-Services deployment, select `apps/web` as the project root, use the Next.js preset, and enable **Include source files outside of the Root Directory in the Build Step**. `apps/web/vercel.json` supports this alternative; do not combine its app root with the Services preset.

Optional configuration:

- `apps/web/.env.local`: set `NEXT_PUBLIC_LANDING_URL` to use an external landing deployment instead of `/landing`.
- `apps/landing/.env.local` and `apps/admin/.env.local`: set `NEXT_PUBLIC_APP_URL` to the web origin. Defaults to http://localhost:3000 in development and https://student-saveus.vercel.app in production.
- `apps/web/.env.local`: add `NEXT_PUBLIC_API_URL` when the backend is available. Current account and verification flows use browser storage.

## Product notes

See [the PRD summary](docs/PRD-SUMMARY.md) for the product scope, important money-language rules, calculations, journeys, and decisions that need confirmation.

## Savings behavior

Savings Goals support PIN-authorized automatic daily or monthly contributions from the shared tracked balance. New schedules start next period; existing goals require enabling automatic savings. Schedules can be paused. Due contributions catch up when the app opens and while it remains open, stop at the target, and wait for a top-up when funds are insufficient. A dashboard prompt links to Add funds. Monthly schedules preserve the selected day, clamping shorter months to their last day.

Lock Savings can be collected at any time, including before maturity, after PIN confirmation. A 5% fee applies to every collection and is rounded to the nearest kobo. The preview shows gross savings, fee, and net payout. The ledger records the gross return and fee separately, and a collected commitment cannot be collected again.

These are browser-local demo records. Contributions do not execute while the browser is closed; reliable background scheduling and real transfers require a backend. Previous manually recorded goal contributions are migrated once into the common transaction ledger so all pages show the same available balance.
