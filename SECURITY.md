# Security review and operating limits

This project has automated structural and database-logic checks, but it has not had an independent penetration test or audit. It is not a security certification.

## Implemented controls

| Control | Where |
|---|---|
| Verified user token for mutations | app/api/[action]/route.ts |
| Exact same-origin JSON mutation requirement | API route |
| Input schemas and bounds | lib/validation.ts |
| Owner-only account data | PostgreSQL RLS |
| Admin-only catalog/status writes | Security-definer functions with is_admin checks |
| Prevent signup role escalation | new_profile always defaults role to customer |
| Atomic checkout and stock locks | create_order |
| Server-calculated total and quote reconfirmation | create_order expected total comparison |
| Duplicate successful submission protection | Unique per-user request UUID |
| Restricted status transitions | change_status |
| Stock restoration before-dispatch cancellation | change_status order cancellation |
| Registered-driver enforcement | Driver functions check is_active_driver; rides and offers tables are closed to browsers |
| Ride privacy | Nearby driver positions rounded to about 100 m; phone numbers revealed only after a driver is chosen |
| Storage limits | Per-user folders for avatars and partner photos; admin-only product images; size and type limits |
| Per-account write/assistant minute buckets | consume_limit |
| Sensitive screens excluded from indexing | Metadata and robots |

## Required hardening

Supabase client sessions use browser local storage. XSS could expose those tokens. The included CSP still allows inline scripts/styles for framework compatibility; it is not a strict nonce policy. Implement nonce-based CSP and evaluate a secure-cookie server session architecture before production. React escapes normal output, but do not introduce dangerouslySetInnerHTML for user/model content.

Authentication password rules, breached-password controls, CAPTCHA, SMTP and provider rate limits are configured in Supabase, not the frontend form. The 12-character HTML minimum alone is not server enforcement. Enforce admin MFA at the data/API layer; an MFA screen by itself is insufficient.

The request body is size-checked after reading it. Configure a reverse proxy/WAF request-size limit and timeouts to stop oversized payloads before allocation. Add per-IP abuse controls, daily per-account quotas, global request budgets and suspicious-account monitoring. Current counters are per authenticated user and per minute; distributed signup attacks need additional controls.

Minute counters require a scheduled cleanup. Run only through trusted database operations:

~~~sql
delete from public.rate_limits where bucket < now() - interval '2 days';
~~~

Do not expose raw SQL or service-role access to users. Security-definer functions set search_path and use fixed table names, but review grants and function ownership after every migration. Restrict CREATE on public schema for untrusted database roles. Database admins are privileged and can read data; apply least privilege and access logging operationally.

Avoid logging passwords, tokens, addresses, help questions or full database error payloads. Current API errors are deliberately generic. Set a support incident response process and redact any later error-monitoring integration.

Use HTTPS, review HSTS with your domain configuration, rotate credentials, maintain backups and test restoration. Keep demo and production projects separate. The launch-ready flag is not access control.

Do not accept uploaded CNICs, licences or banking files into public/images. If identity checks are added later, use purpose-limited secure storage, malware scanning, verified consent, retention rules and a restricted review interface.

## Report a concern

Contact the project owner at usaidahmeddon@gmail.com. Do not email exploit payloads containing another user's information or secrets. There is no promised response SLA until the operator publishes one.
