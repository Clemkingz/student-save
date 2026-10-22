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

The main deployment is https://student-saveus.vercel.app. `apps/web/vercel.json` builds the web app, which serves welcome, landing, auth, dashboard, and mock admin routes together. The old `/app` base path and multi-service rewrites have been removed.

### Vercel deployment

In the Vercel project's Settings → Build and Deployment, configure:

- Root Directory: `apps/web`.
- Enable **Include source files outside of the Root Directory in the Build Step**. The web app imports shared packages and the landing and admin components from sibling directories.
- Framework Preset: **Next.js**.
- Build Command: `pnpm build` (provided by `apps/web/vercel.json`).
- Output Directory: `.next` (provided by `apps/web/vercel.json`). Remove any old `apps/web/.next` override.
- Install Command: leave the override disabled so Vercel detects pnpm and installs the workspace dependencies.

Save these settings and deploy the commit containing this configuration. Building from the repository root causes `NEXT_NO_VERSION`: the root package is the workspace orchestrator, while Next.js is a dependency of `apps/web/package.json`.

Optional configuration:

- `apps/web/.env.local`: set `NEXT_PUBLIC_LANDING_URL` to use an external landing deployment instead of `/landing`.
- `apps/landing/.env.local` and `apps/admin/.env.local`: set `NEXT_PUBLIC_APP_URL` to the web origin. Defaults to http://localhost:3000 in development and https://student-saveus.vercel.app in production.
- `apps/web/.env.local`: add `NEXT_PUBLIC_API_URL` when the backend is available. Current account and verification flows use browser storage.

## Product notes

See [the PRD summary](docs/PRD-SUMMARY.md) for the product scope, important money-language rules, calculations, journeys, and decisions that need confirmation.
