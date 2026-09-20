# Raftaar One — Pakistan service-platform foundation

Created for **Usaid Ahmed** · GitHub handle: **UsaidAhmed0318**.

Original Next.js App Router application with TypeScript, React Icons, responsive CSS, Supabase Auth/PostgreSQL and optional OpenAI-backed app help.

**Delivery status:** source code generated, not executed or deployment-tested in the authoring environment. This is a functional-code foundation, not an audited, fully operational super-app. No live services, merchant accounts, payment provider, transport partnership or production infrastructure has been connected. Do not advertise it as production-ready until you complete and pass the checklist below.

## 1. Generate the project

The downloaded attachment may have a .txt extension. Rename it to **create-raftaar-one.mjs**. Enable visible file extensions so it does not remain .mjs.txt.

Install Node.js 22+ and run:

~~~bash
node create-raftaar-one.mjs
cd raftaar-one
npm install
~~~

The generator refuses to overwrite an existing raftaar-one directory. It only writes project files; it does not install packages or run shell commands automatically.

Dependency ranges are starting constraints, not security-certified versions. Install supported, patched releases, resolve any peer dependency issues, run the audit and commit the resulting package-lock.json. CI intentionally uses npm ci and therefore requires that lockfile.

## 2. Configure Supabase

Create a fresh Supabase project. In its SQL editor, run **supabase/schema.sql** once. The script is for a new project and is not an incremental migration for an existing database.

For local demonstration only, optionally run **supabase/seed-demo.sql**. Seed records explicitly say demo; they do not represent real restaurants or goods. Do not run the demo seed twice unless you want duplicate listings. Remove all sample inventory before launch.

Copy .env.example to .env.local. On macOS/Linux:

~~~bash
cp .env.example .env.local
~~~

On Windows PowerShell:

~~~powershell
Copy-Item .env.example .env.local
~~~

Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY using the project URL and public anon key. Do not put a service-role key into any browser variable. This project does not need a service-role key.

Set NEXT_PUBLIC_SITE_URL=http://localhost:3000 for local development. Do not add a trailing slash. All mutation API routes validate this exact origin.

In Supabase Auth, enable email/password, require email confirmation, set a minimum 12-character password, configure SMTP and enable appropriate provider abuse controls/CAPTCHA. Set Site URL and allowed redirect URLs for /account and /reset-password on local and production origins. Test signup and recovery email delivery before inviting users. These provider settings cannot be provisioned by source code alone.

## 3. Run locally

~~~bash
npm run dev
~~~

Open http://localhost:3000. Without Supabase settings, the homepage still displays but account, inventory and mutation flows explicitly report setup requirements. There are no fake successful bookings.

Create and verify your own account through /account. To grant admin access, copy that user's UUID from the trusted Supabase Auth console and run the following only as the database operator:

~~~sql
update public.profiles
set role = 'admin'
where id = 'REPLACE_WITH_YOUR_VERIFIED_AUTH_USER_UUID'::uuid;
~~~

Do not run the placeholder literally. Do not auto-promote by an email typed in a form. Never expose this operation in a client API. User signup metadata cannot choose roles.

Sign in and open /admin. Add real products, review partner applications, and update order/request states. Approved applications are only review outcomes; they do not create driver dispatch access or establish verification.

## 4. Understand the code

| Location | Responsibility |
|---|---|
| app/ | Pages, layouts, loading/error states and SEO |
| app/api/[action]/route.ts | Authenticated JSON mutations and optional AI help |
| components/ | Small feature-oriented UI modules |
| lib/validation.ts | Zod request validation |
| lib/supabase.ts | Browser database client and authenticated API helper |
| lib/config.ts | Working brand, pilot cities and service labels |
| supabase/schema.sql | Tables, RLS, constraints and transactional write functions |
| supabase/seed-demo.sql | Optional clearly labelled demo catalog |
| public/images/ | Place only licensed public imagery here |
| tests/ | Structural tests and browser smoke tests |

Flow: **form → API validation + token verification → user-scoped database RPC → database checks and transaction**. Direct database calls remain constrained by RLS, grants and RPC authorization. The browser has no privileged database credential.

Checkout sends item IDs/quantities, never trusted prices. PostgreSQL locks product rows, verifies inventory, calculates totals and creates an order atomically. Per-user request IDs prevent duplicate successful submissions. Cart prices may change. The database compares its authoritative total with the displayed expected total and rejects changes so users must refresh and reconfirm. Expected totals are not trusted as prices.

The sample delivery fee is **150 whole PKR**, stored in both the database create_order function and checkout display. Change both together and test totals. This is a pilot fee, not a distance calculation. No tax engine or platform-commission accounting is included.

## 5. Optional app assistant

Set OPENAI_API_KEY and OPENAI_MODEL server-side. Select a model your account supports for chat completions; no model availability is assumed. Restart the server. The assistant only receives the submitted question and static app facts. It cannot access private order histories or perform bookings. Questions are capped and authenticated request limits are enforced in PostgreSQL.

Without both settings the route returns labelled static help, not pretend AI. Add provider spend caps and a global daily budget before enabling public access. Model prompting is not a complete guarantee against irrelevant answers; test adversarial prompts and keep the assistant non-transactional.


## 6. What this release does and does not do

| Feature | Status |
|---|---|
| Responsive original homepage | Source implemented; CSS 3D-style scene, no WebGL engine |
| React Icons | Imported from react-icons/fi and react-icons/fa; no emoji icons |
| Signup/login/password recovery | Supabase-backed; requires provider setup and testing |
| Catalog/search/category filters | Database-backed; catalog fetch limited to 200 active products |
| Cart and COD checkout | Source implemented; stock/price checks, idempotency, order snapshots |
| Bike/car/parcel/loader/truck requests | Persisted requests with admin-reviewed states |
| Intercity coach requests | Enquiries only; no inventory, seats, ticket issuance or Daewoo API |
| Account dashboard | Own latest 50 orders, bookings and application records |
| Partner applications | Submission and admin review; not a working driver/merchant portal |
| Admin operations | Catalog add/edit/hide, stock, orders, bookings, applications, pagination |
| Audit trail | Status/catalog mutations logged; audit viewer is not included |
| Assistant | Optional model-backed general app help; static fallback is labelled |
| Online payments/refunds/wallet | Not integrated; no payment success is simulated |
| Real-time GPS/maps/route fares | Not included; no maps key or routing service was supplied |
| Driver matching/dispatch/negotiation | Not included; operations are manual request review |
| Merchant self-service and payouts | Not included; admin manages a single pilot catalog |
| Notifications/SMS/WhatsApp | Not integrated; only configured Supabase auth email flows |
| Identity verification and uploads | Not integrated; no CNIC upload surface |
| Ratings/promos/loyalty | Not implemented; no invented ratings, discounts or testimonials |
| SEO | Metadata, Open Graph PNG, robots and sitemap; no ranking guarantees |
| Product SEO | Client-loaded catalog; SSR product detail routes still needed for product-level indexing |
| Privacy/terms | Visible drafts requiring final business/legal review |
| Urdu | Questions can be Roman Urdu; full bilingual/RTL UI is not implemented |
| Testing | Test source included, not executed in authoring environment |

This is not yet the complete multi-vendor, real-time super-app described in the original request. That requires operational partnerships and further development. Naming this limitation is important: hiding missing integrations behind convincing UI would be unsafe and misleading.

## 7. Verification before deployment

~~~bash
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
npm audit
~~~

The tests are a starting suite, not proof of complete security. Browser smoke tests do not verify authenticated transaction flows. Complete TESTING.md using a disposable Supabase staging project, two customer accounts, one admin, actual email delivery and concurrent submissions.

Fix every compile/test failure and review advisories before rollout. Include keyboard navigation, screen reader labels, reduced motion, 320/375/768/1024/1440 px layouts and low-end mobile performance. Add automated accessibility auditing and load testing. No Lighthouse score is claimed.

## 8. Deploy a staging preview

After local verification, create your own private repository and push the generated project. Your GitHub handle is known, but no repository has been created or pushed by this generator. Never commit .env.local or secrets. Commit package-lock.json.

Import the repository into a Next.js-compatible Node hosting provider, such as Vercel. Configure environment variables in its settings. Use a separate staging database. Set the exact HTTPS staging origin in NEXT_PUBLIC_SITE_URL and allow its Auth redirects. Redeploy after changing NEXT_PUBLIC variables; they are embedded at build time.

Preview domains each need an exact configured origin. Do not weaken the origin check to a wildcard to make previews work. The database URL/key and public site URL must be present at build time. OpenAI credentials are server-only. No private credentials should start with NEXT_PUBLIC_.

Keep NEXT_PUBLIC_LAUNCH_READY=false for staging. **This flag only controls the notice and indexing. It is not a gate that disables transactions.** Use hosting password protection or restricted access for staging; otherwise public signups and requests remain possible when Supabase is configured.

## 9. Public launch gates

| Gate | Required work |
|---|---|
| Brand | Verify Raftaar One trademark/domain, replace working name if necessary |
| Legal | Operator registration/address, reviewed contracts, final privacy/retention/refund rules |
| Operating area | Select genuinely supported cities; align UI and SQL validation |
| Transport | Verify drivers, vehicles, licences, insurance and local operating requirements |
| Food | Verify merchants, food-safety obligations, allergens, availability and fulfilment |
| Payments | Onboard a licensed gateway, signed webhooks, idempotency, reconciliation and refunds before adding online checkout |
| Service operations | Dispatch, matching, support staffing, incident escalation, cancellations and dispute handling |
| Pricing | Final tax/commission/fees and explicit quote confirmation; no invented fare promises |
| Security | Independent review, admin MFA enforcement, CSP nonce hardening, WAF, abuse controls and secrets rotation |
| Reliability | Migrations, backups, tested restore, monitoring, alerts, error reporting and queue strategy |
| Data rights | Verified access/deletion workflow, retention jobs and vendor contracts |
| Accessibility | Device/keyboard/screen-reader audit and critical-flow testing |
| Discoverability | Real business details, licensed images, SSR product pages, Search Console and sitemap submission |
| Measurement | Consent-aware analytics only after privacy choices are implemented |

Only after these gates and a controlled pilot should you approve public indexing and set NEXT_PUBLIC_LAUNCH_READY=true. This flag does not certify readiness. Growth and earnings depend on actual service quality, supply, demand, pricing and marketing; no viral or income guarantee is offered.


## 10. Research notes and sources

Retrieved/reviewed **20 September 2026**. These sources inform service categories and setup direction; they do not imply affiliation, authorization or a comparative ranking.

| Source | What was reviewed |
|---|---|
| https://nextjs.org/docs/app/getting-started/installation | Official Next.js installation documentation |
| https://indrive.com/en-pk/business | Official Pakistan courier/freight business service search result |
| https://indrive.com/en-pk/freight-delivery | Official Pakistan freight service search result |
| https://yango.com/en_pk/ | Official Pakistan ride-service page |
| https://www.foodpanda.pk/ | Direct access blocked by bot protection; no bypass attempted |
| https://www.foodpanda.com/about-foodpanda/ | Corporate source surfaced during public search |
| https://bykea.com/ | Direct access blocked by bot protection; public search attempted |
| https://getsafepay.pk/blog/content/safepay-raast | Official gateway source surfaced during research; gateway not integrated |

No competitor code, logos, product photos, ratings or promotional claims were copied. Exact service availability and current competitor prices are not asserted. The original inDrive homepage redirected to a different country; Pakistan-specific official search results were used instead.

## 11. Beginner notes

Start with config.ts, then the page component for the feature, then its form component, validation schema and SQL function. Avoid editing several layers at once. Keep commits small. No microservices, Kubernetes or custom authentication cryptography is introduced: a modular Next.js app plus managed PostgreSQL is a more understandable starting point.

For a real driver/merchant marketplace, extend this foundation with merchant ownership, order groups, fulfilment assignments, settlements, safe identity checks, geographic serviceability, dispatch, notification queues and dedicated partner portals. Those are separate product modules, not just buttons or a change to the site URL.
