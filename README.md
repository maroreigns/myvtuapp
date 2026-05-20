# NaijaDataHub

NaijaDataHub is a production-minded MVP for a Nigerian VTU and data reselling platform. It includes wallet funding, data purchase, transaction records, admin controls, mock Paystack/Flutterwave/VTU service adapters, Prisma models, and seed data.

## Stack

- Next.js 14 App Router with TypeScript
- Tailwind CSS
- PostgreSQL and Prisma ORM
- JWT auth in http-only cookies
- bcrypt password hashing
- Mock Paystack, Flutterwave, and VTU service adapters

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env
```

3. Update `DATABASE_URL` and `JWT_SECRET` in `.env`.

4. Run migrations and seed data:

```bash
npm run prisma:migrate
npm run db:seed
```

5. Start the app:

```bash
npm run dev
```

## Seed Accounts

- Admin: `admin@naijadatahub.com` / `Password123!`
- User: `user@naijadatahub.com` / `Password123!`

## Mock Integrations

The app uses mocked gateway/provider files under `services/`:

- `services/paystack.service.ts`
- `services/flutterwave.service.ts`
- `services/vtu.service.ts`

Replace their internals with real HTTP calls when provider credentials are available. Keep API keys server-side through environment variables only.

## Security Notes

- Passwords are hashed with bcrypt.
- Auth cookies are http-only.
- Sensitive API routes validate inputs with Zod.
- Admin routes verify the authenticated user role.
- Wallet changes are recorded and executed in Prisma database transactions.
- Payment references are unique and duplicate successful confirmations are prevented.
- Purchase and auth endpoints include an in-memory rate limiter suitable for MVP deployments. For multiple server instances, replace it with Redis or another shared store.
