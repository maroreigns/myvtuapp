# ObmaPay

ObmaPay is a Nigerian digital services platform built with Next.js, Prisma, PostgreSQL, wallet accounting, admin controls, Paystack funding, VTU adapters, referrals, receipts, email verification, SMS logs, and mock-first provider fallbacks.

## Setup

```bash
npm install
cp .env.example .env
npm run prisma:migrate
npm run db:seed
npm run dev
```

Seed accounts:

- Admin: `admin@obmapay.com` / `Password123!`
- User: `user@obmapay.com` / `Password123!`

## Environment

Required core values:

- `DATABASE_URL`
- `JWT_SECRET`
- `NEXT_PUBLIC_APP_URL`

Paystack:

- `PAYSTACK_SECRET_KEY`
- `PAYSTACK_PUBLIC_KEY`
- `PAYSTACK_WEBHOOK_SECRET`

VTU provider:

- `VTU_PROVIDER_MODE=mock` or `live`
- `VTU_API_BASE_URL`
- `VTU_API_KEY`

Email:

- `EMAIL_PROVIDER=mock` or `resend`
- `RESEND_API_KEY`
- `EMAIL_FROM`

SMS:

- `SMS_PROVIDER=mock`
- `SMS_API_KEY`

## Paystack

Wallet funding initializes a Paystack transaction from `/api/wallet/fund`. Successful redirects land on `/dashboard/wallet/success`, where the server verifies the transaction before crediting the wallet. The webhook endpoint is `/api/paystack/webhook` and validates `x-paystack-signature` with `PAYSTACK_WEBHOOK_SECRET` or `PAYSTACK_SECRET_KEY`.

Wallet crediting is idempotent through the unique payment reference and the `SUCCESSFUL` payment status.

## VTU Provider

VTU services use an adapter structure:

- `services/vtu/providers/mock.provider.ts`
- `services/vtu/providers/live.provider.ts`
- `services/vtu/vtu.service.ts`

Mock mode works without keys and intentionally fails numbers ending in `0000` so refund handling can be tested. Live mode posts to `${VTU_API_BASE_URL}/airtime` and `${VTU_API_BASE_URL}/data` with a bearer token. Every provider request is stored in `VtuApiLog`.

## Services

Enabled:

- Airtime purchase
- Data purchase

Supported networks:

- MTN
- Airtel
- Glo
- 9mobile

Dashboard-only coming-soon services:

- Electricity bills
- Cable TV
- Betting wallet funding
- WAEC/NECO exam pins
- Bulk SMS
- Airtime-to-cash
- Recharge card printing

## Email And SMS

Registration creates an email verification token and sends a verification message through the configured email provider. Unverified users cannot fund wallets or buy airtime/data. SMS notifications are logged for registration, wallet funding, purchase success, and failed/refunded transactions. The default SMS provider is mock, with structure ready for Termii, Africa's Talking, or Twilio.

## Receipts

Successful wallet and service transactions have printable receipt pages at:

```text
/dashboard/receipts/:reference
```

Receipts include reference, user name, service type, network, phone number, amount, status, date/time, and platform name.

## Referrals

Each user has a referral code and dashboard link. Referral earnings are credited after a referred user completes a successful airtime or data transaction. Commission settings are stored in `ReferralCommissionSetting`.

## Admin

Admin pages include:

- Users and wallet credit/debit
- Service transactions with retry/refund actions
- Wallet transactions
- Airtime and data pricing
- Profit reports with date filters
- Failed transaction views
- Recharge card batch creation and printable sheets

Admin routes are protected through server layouts and API role checks.

## Deployment Notes

Use production database credentials, set all provider secrets in the host environment, configure the Paystack webhook URL, run Prisma migrations before release, and keep `VTU_PROVIDER_MODE=mock` until live provider credentials and response contracts are confirmed.
