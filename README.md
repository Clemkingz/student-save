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

`pnpm dev` starts both apps. The marketing site runs at http://localhost:3002 and the product app at http://localhost:3000. To run only the public site, use `pnpm --filter landing dev`. Landing page account links use `NEXT_PUBLIC_APP_URL` from `apps/landing/.env.local` (defaults to `http://localhost:3000` for local development). Add the backend base URL to `apps/web/.env.local` as `NEXT_PUBLIC_API_URL` when it is provided; account forms are currently presentation and validation only, and do not send or save submitted details.

## Product notes

See [the PRD summary](docs/PRD-SUMMARY.md) for the product scope, important money-language rules, calculations, journeys, and decisions that need confirmation.
