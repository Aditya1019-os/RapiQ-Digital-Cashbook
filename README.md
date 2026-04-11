# RapiQ — GoBD-konforme Kasse für kleine Händler

**Hardware-freies, TSE-signiertes digitales Kassensystem** für Cafés, Bäckereien, Restaurants, Friseursalons und Einzelhandel in Deutschland.

## Features

- **Tax-Aware Calculator** — Betrag eingeben, Kategorie tippen, fertig. Jede Buchung sofort via fiskaly Cloud TSE signiert (§146a AO)
- **Menü-Foto-Scanner** — GPT-4o Vision erkennt Speisekarte mit Preisen & MwSt. automatisch
- **GoBD-konforme Belege** — PDF + digitale URL, vollständige TSE-Daten auf jedem Beleg
- **Revenue Dashboard** — Echtzeit via Supabase Realtime, Heatmap, Wochenchart
- **MeinELSTER XML** — Kassenanmeldung §146a AO in 1 Klick
- **DSFinV-K v2.3 Export** — Für Betriebsprüfungen
- **DATEV Export** — Buchungsstapel für Steuerberater
- **GoBD-konform** — Kein Löschen, nur Storno. 10 Jahre Aufbewahrung. Unveränderliches Protokoll.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React, TypeScript, TailwindCSS |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL + Auth + Realtime) |
| TSE | fiskaly Cloud TSE API v2 |
| Email | Resend |
| PDF | React-PDF |
| Charts | Recharts |
| Menu OCR | OpenAI GPT-4o Vision |
| Payments | Stripe |
| Hosting | Vercel (EU/Frankfurt) |

## Setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/rapiq-web.git
cd rapiq-web
npm install
```

### 2. Environment variables

Copy `.env.local` to `.env.local.example` (remove real values) and fill in all values:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
FISKALY_API_KEY=your-fiskaly-api-key
FISKALY_API_SECRET=your-fiskaly-api-secret
FISKALY_BASE_URL=https://kassensichv-middleware.fiskaly.com/api/v2
OPENAI_API_KEY=your-openai-api-key
RESEND_API_KEY=your-resend-api-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Supabase setup

Run `supabase/schema.sql` in your Supabase Dashboard SQL editor.

Enable Realtime on the `transactions` table.

### 4. Run locally

```bash
npm run dev
```

## Pages

| Route | Description |
|-------|-------------|
| `/` | Marketing landing page |
| `/login` | Login (password + magic link + TOTP 2FA) |
| `/signup` | Registration |
| `/onboarding` | 5-step merchant setup + fiskaly TSE registration |
| `/dashboard` | Revenue dashboard with real-time heatmap |
| `/calculator` | Tax-Aware POS Calculator (main POS screen) |
| `/cashbook` | Daily cashbook + immutable GoBD audit log |
| `/menu` | Menu photo scanner + item management |
| `/transactions` | Transaction history + Storno |
| `/exports` | DSFinV-K ZIP, DATEV CSV, MeinELSTER XML |
| `/receipts/[id]` | Public digital receipt with TSE data |
| `/settings` | Business profile, buttons, billing |
| `/impressum` | Legal imprint §5 TMG |
| `/datenschutz` | Privacy policy DSGVO Art. 13 |
| `/agb` | Terms of service |

## Key API Routes

| Route | Purpose |
|-------|---------|
| `POST /api/onboarding/complete` | Register merchant + create fiskaly TSE |
| `POST /api/tse/start` | Start fiskaly TSE transaction on first keypress |
| `POST /api/transactions/finish` | Sign + save completed transaction |
| `POST /api/transactions/storno` | TSE-signed Storno (reversal) |
| `POST /api/menu/scan` | GPT-4o Vision menu scanning |
| `GET /api/exports/elster` | MeinELSTER XML download |
| `GET /api/exports/dsfinvk` | DSFinV-K ZIP download |
| `GET /api/exports/datev` | DATEV CSV download |
| `GET /api/receipts/[id]/pdf` | PDF receipt generation |
| `POST /api/stripe/webhook` | Stripe subscription events |

## Legal Compliance

- **§146a AO / KassenSichV** — fiskaly Cloud TSE signs every transaction. TSE failure blocks transaction save.
- **GoBD** — No delete, only Storno. Immutable audit log. 10-year retention enforced via DB triggers.
- **DSFinV-K v2.3** — Full export package for Betriebsprüfung
- **DSGVO** — EU data hosting (Frankfurt), Art. 20 data export, Art. 17 deletion with 30-day cooldown

## Deployment (Vercel)

1. Push to GitHub
2. Import project in Vercel dashboard
3. Set region to **Frankfurt (eu-central-1)**
4. Add all environment variables
5. Deploy

### Stripe Webhook

Set webhook endpoint: `https://your-domain.com/api/stripe/webhook`

Events:
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

## Pricing

| Plan | Price | Key Features |
|------|-------|-------------|
| Starter | €19.90/mo | Calculator, Cashbook, Dashboard, DSFinV-K, MeinELSTER XML |
| Growth | €29.90/mo | + Menu Scanner, DATEV Export, Custom button names |

14-day free trial, no credit card required.

## License

Proprietary — RapiQ GmbH. All rights reserved.
