# Raftaar One

A Pakistan-wide platform for rides, parcels, loaders, freight, bus and coach requests, and a food and groceries marketplace.
Built by **Usaid Ahmed** ([UsaidAhmed0318](https://github.com/UsaidAhmed0318)) · usaidahmeddon@gmail.com · 0318 1014996

Stack: Next.js (App Router) and TypeScript, Supabase (Auth, PostgreSQL, Storage), Leaflet with OpenStreetMap, Framer Motion, React Icons, Zod.

## What it does

| Area | Details |
|---|---|
| Ride hailing (`/ride`) | Choose Rickshaw, Bike, Economy, Comfort, Premium or Protocol car. Search anywhere in Pakistan (streets, house numbers, landmarks), use your location or pin on the map. Route, distance and time on the map. Name your own fare and receive offers from nearby registered drivers. Track the chosen driver live with an ETA. Cancel, call the driver, receipt. |
| Driver dashboard (`/driver`) | Only admin-approved drivers can go online. Live location pings, nearby requests, accept the rider's fare or counter-offer, arrived / start / complete flow, earnings summary. |
| Driver registration (`/partner`) | Drivers state their vehicle types, model and number plate. Approval by an admin registers the driver. Couriers, merchants and fleet operators can apply too. |
| Cargo and buses (`/book`) | Parcel, loader (Rickshaw loader, Suzuki, Shehzore, Mazda, mini truck), truck, and bus or coach enquiries (Luxury coach, Hiace, Coaster, mini bus). Reviewed and confirmed by an operator. |
| Marketplace (`/marketplace`, `/cart`) | Food, groceries and accessories with product images, cart and cash-on-delivery checkout. Prices and stock are enforced in the database. |
| Accounts | Sign up, sign in, password reset, profile photo, order, booking, ride and application history. |
| Admin (`/admin`) | Orders, bookings, applications, drivers (suspend / reactivate), rides and the product catalogue with image upload. Every status change is audited. |
| Help (`/help`) | Rule-based answers to common questions in English and Roman Urdu. |

## Project layout

| Path | Purpose |
|---|---|
| `app/` | Pages, layouts, loading and error states, SEO, API routes |
| `app/api/[action]/route.ts` | Authenticated JSON mutations (orders, bookings, applications, avatar, products, admin, help) |
| `app/api/places`, `reverse`, `route` | Address search, reverse geocoding and routing proxies with caching and rate limits |
| `components/` | UI modules (ride booking, driver dashboard, map, forms, admin) |
| `lib/` | Config, validation (Zod), Supabase client, geo helpers, ride RPC wrappers, help engine |
| `supabase/` | SQL: `schema.sql`, `migration-002-images.sql`, `migration-003-rides.sql` and `setup-after-signup.sql` |
| `tests/` | Structural tests and a browser smoke test |

## Run it locally

Requires Node.js 22 or newer.

```bash
npm install
cp .env.example .env.local      # Windows PowerShell: Copy-Item .env.example .env.local
npm run dev
```

Open http://localhost:3000. The Supabase project URL and publishable key have safe built-in defaults in `lib/public-config.ts`; set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to use your own project. Never put a secret or service-role key in any `NEXT_PUBLIC_` variable. This project does not need one.

## Database setup (Supabase)

Run these in the Supabase SQL Editor, in order, on a new project:

1. `supabase/schema.sql`: tables, row-level security, checked write functions.
2. `supabase/migration-002-images.sql`: photo and product-image storage.
3. `supabase/migration-003-rides.sql`: drivers, rides, offers and the live ride functions.
4. `supabase/setup-after-signup.sql`: demo products (only if the catalogue is empty) and admin promotion for the owner's email. Safe to run again after you sign up.

Steps 2 to 4 are safe to re-run. Do not run `schema.sql` twice.

In Supabase, open Authentication and set the Site URL and redirect URLs (`/account`, `/reset-password`) for your domain. Configure custom SMTP before real users sign up, because the built-in email sender has a very low hourly limit.

To make someone an admin, run this in the SQL Editor (operator only, never from the app):

```sql
update public.profiles set role = 'admin'
where id = (select id from auth.users where email = 'owner@example.com');
```

## Deploy on Vercel

Import the repository into Vercel and deploy. The public Supabase values are built in, and the site origin is taken from Vercel's production URL, so no variables are required. To use a custom domain set `NEXT_PUBLIC_SITE_URL` to its exact origin (no trailing slash). Keep `NEXT_PUBLIC_LAUNCH_READY=false` until you are ready for search engines to index the site.

## Checks

```bash
npm run typecheck
npm test
npm run build
npm audit
npm run test:e2e   # browser smoke tests (needs: npx playwright install chromium)
```

`TESTING.md` lists the manual acceptance checklist. `SECURITY.md` lists the security controls and the hardening still recommended.

## Things to know

- Maps, address search and routing use the public OpenStreetMap ecosystem (tiles, Photon, Nominatim, OSRM). That is fine for a pilot. For heavy traffic, use a paid provider or host your own.
- Live updates are polled every few seconds. Drivers must keep the dashboard open while online because this is a web app, not a native background-location app.
- Payment is cash to the driver or on delivery. There are no online payments, ratings or emergency features yet.
- Suggested fares are estimates. Riders name their price and drivers may counter-offer.
- Rides only work when registered drivers are online near the pickup. The app says so honestly when none are.
- Bus and coach requests are enquiries, not tickets. Raftaar One has no affiliation with any coach operator.
- Review the privacy notice and terms with a legal adviser before launching to the public.
