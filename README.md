# Sparkle — car wash marketplace demo

A small coursework-style MVP built with Next.js, TypeScript, Prisma and PostgreSQL. Customers can register, browse washers and create demo bookings. Washers can manage services and weekly availability.

**Demo only:** no real washes, payments, payouts or email notifications. Existing demo bookings stay `PENDING`; there is no payment-confirmation simulation on the public site. Times are shown in UTC.

## Run locally

Use Node.js 22 and a PostgreSQL database that supports `btree_gist`.

```sh
npm ci
cp .env.example .env
# Set DATABASE_URL and a new random NEXTAUTH_SECRET in .env.
npm run db:generate
npm run db:deploy
npm run db:seed
npm run dev
```

Open http://localhost:3000. Seed only a dedicated demo database. The sample customer is `alice@example.com`, the sample washer is `wendy@example.com`, and their demo password is `password123`. Do not use these accounts or sample credentials for real services.

The migration history now includes the initial tables before the no-overlap constraint. Use `db:deploy` for an empty database. For an existing database created outside Prisma migrations, inspect and baseline its schema first; do not reset it or rerun initialization blindly.

## Check and build

```sh
npm run typecheck
npm test
npm run build
npm start
```

Tests cover booking validation, full-slot availability, duplicate-request recovery, overlap error handling and rejection of unsigned production payment events. The PostgreSQL exclusion constraint remains the final protection against concurrent overlapping bookings.

## Vercel hosting

Use the existing Next.js project, Node.js 22 and `npm run build`. Set these environment variables privately in Vercel:

- `DATABASE_URL`: a fresh, working PostgreSQL connection for this demo.
- `NEXTAUTH_SECRET`: a new random secret, never the value previously committed to Git.
- `NEXTAUTH_URL`: the current HTTPS hosting address.
- `DEMO_MODE`: `true`.

Keep Stripe keys unset. Apply migrations once to the dedicated database, then seed its sample data once. Builds generate the Prisma client but never reset, migrate or seed the database automatically.

The original `.env` was committed publicly. It is no longer tracked, but remains in historical commits. Replace its database password and authentication secret before reuse; removing the file from the current tree does not revoke old credentials. Local secrets, Vercel settings, build output and generated TypeScript caches are ignored.

## MVP limits

No live payment UI, real Stripe Connect onboarding, notifications, maps, chat or tracking. No new product features are part of the repair. The animated landing page and the original customer/washer flows remain in place.
