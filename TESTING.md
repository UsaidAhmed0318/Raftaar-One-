# Manual integration acceptance checklist

Run on a disposable staging database after schema creation. Record outcomes, environment, package lock version and failures before declaring readiness. Automated coverage: source structure, help answers, database logic for the ride system (registration, offers, transitions, permissions) and a two-browser ride flow.

Use customer A, customer B and an administrator with different verified emails. Configure SMTP and test with real inboxes. Keep all inventory and transactions explicitly marked test data.

| Test | Expected outcome |
|---|---|
| Signup with unconfirmed email | Sign-in denied when provider confirmation is required |
| Password shorter than provider minimum | Rejected by auth server, including direct API attempts |
| Expired password-reset link | Safe error; no password change |
| Sign out then call mutation | 401 or access denied |
| Customer A selects B's order via direct database API | No B records returned |
| Customer A attempts profile role update | Permission denied |
| Signup metadata contains role=admin | Profile remains customer |
| Customer calls admin RPC directly | Admin only error |
| Anonymous queries products | Only active products, no private records |
| No inventory configured | Explicit empty state, not pretend merchants |
| Cart item price changes before checkout | Price mismatch error, then refresh and reconfirm |
| Payload includes made-up product price | Price ignored; authoritative DB price used |
| Duplicate product IDs in payload | Rejected |
| Negative, fractional or excessive quantity | Rejected |
| Two customers buy the last stock concurrently | At most one succeeds; stock never negative |
| Same request UUID submitted concurrently | One persisted order and one stock decrement |
| Order insert fails after decrement | Entire transaction rolls back |
| Insufficient stock | No partial order and no partial inventory change |
| Cancel placed/confirmed order twice | Stock restored once; no second increment |
| Try cancelled to delivered | Invalid transition rejected |
| Try dispatched to cancelled | Rejected by configured workflow |
| Booking without auth | No persisted record |
| Booking replay with same UUID | Same request returned, no duplicate |
| Multiple partner applications from one account | Unique application constraint enforced |
| Application approved | Status changes only; no automatic driver privilege |
| Admin updates catalog/status | Audit record created with actor UUID |
| Cross-origin mutation | Rejected even with a valid token |
| Oversized JSON and malformed JSON | Safe error, no mutation |
| Abuse same account repeatedly | RPC rate limit enforced |
| Help asked about private records | Only general answers; no account data disclosed |
| Help question with no match | Suggested questions and support contact |
| Unregistered user opens driver dashboard | Told to apply; cannot go online or take rides |
| Suspended driver | Cannot ping, see requests or make offers |
| Rider posts a ride with no drivers online | Honest notice; request stays open until cancelled |
| Two drivers offer; rider accepts one | Other offers rejected; only one active ride per driver |
| Driver marker while trip is assigned | Moves live on the rider map; ETA updates |
| Photo upload over 10 MB or wrong type | Rejected with a clear message |
| 320–1440px viewport and zoom | Usable forms, no clipping/horizontal page overflow |
| Keyboard and screen reader | Visible focus, labelled controls, announced notices |
| Reduced motion preference | Decorative movement disabled |
| Staging indexing | robots disallow and noindex remain active |
| Supabase outage | Failure state instead of successful submission |
| Production restore drill | Database and operational recovery verified |

Automate the concurrency, RLS and integration checks before production. Structural tests only check source presence; they are not a substitute. Add quote-expiration rules, full unit tests, accessibility auditing and service-specific end-to-end fixtures as scope grows.
