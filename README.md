# Startup Business Summit 2026 — Bharat Mandapam

Event website for Prakhar Enterprises: pitch applications, pass sales with Razorpay, user accounts and an organiser dashboard.

- **Stack:** Node 22 + Express, SQLite (better-sqlite3), plain HTML/CSS/JS front-end (no build step)
- **Site:** `/` · **Organiser dashboard:** `/admin`

## Run locally

```bash
npm install
cp .env.example .env          # fill in values
npm run dev                   # http://localhost:3000
```

Sign up with an email listed in `ADMIN_EMAILS` to get the admin dashboard.

## Deploy on Render

1. Push this folder to a **private** GitHub repo.
2. Render → **New → Blueprint** → choose the repo. `render.yaml` creates the web service **with a 1 GB persistent disk** at `/var/data`.
3. Fill the env vars Render asks for:
   - `APP_ORIGIN` = your Render URL, e.g. `https://sbs-summit-2026.onrender.com` (add the custom domain later, comma-separated)
   - `ADMIN_EMAILS` = organiser emails
   - `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (start with `rzp_test_` keys)
4. Razorpay Dashboard → **Webhooks** → URL `https://YOUR-SITE/api/webhooks/razorpay`, events `payment.captured` and `order.paid`, set a secret → put it in `RAZORPAY_WEBHOOK_SECRET`.
5. Open the site, create the organiser account with the admin email, test a full purchase in test mode, then switch to live keys.

> **SQLite needs the persistent disk.** Render's free plan has no disk: the database would be wiped on every deploy/restart. The Starter plan + 1 GB disk is required. Render snapshots disks daily; also download the CSVs from `/admin` before and after the event.

## Changing prices / promo codes

Prices are set on the server only (`src/config.js`, or env `TIER_PRICES=delegate:1499,founder:2999,vip:9999`). Promo codes: env `PROMO_CODES=SBS10:10,FOUNDER20:20`. Restart after changing env vars.

## Security built in

| Area | What's done |
|---|---|
| Passwords | scrypt (memory-hard) with per-user salt, constant-time compare, common/weak passwords rejected |
| Sessions | 256-bit random token in `HttpOnly`, `Secure`, `SameSite=Lax`, `__Host-` cookie; only the SHA-256 hash is stored; new session on every login; sign-out-everywhere |
| Brute force | per-IP rate limits on sign-in, sign-up, writes and promo codes; account locks for 15 min after 8 wrong passwords; same error for "no account" and "wrong password" (with equal timing) |
| CSRF | every POST/PATCH must come from `APP_ORIGIN` and be JSON |
| XSS | strict Content-Security-Policy (no inline scripts), all user text escaped before display |
| SQL injection | only prepared statements; `LIKE` wildcards escaped |
| Payments | price computed on the server; Razorpay signature checked with HMAC + payment re-fetched from Razorpay; order must belong to the signed-in user; webhook signature verified; one ticket per order even on retries |
| Input | strict validation and length caps on every field, 32 KB body limit, https-only links |
| Headers | HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy, `x-powered-by` removed |
| Admin | server-side role check on every `/api/admin` route; CSV exports guarded against spreadsheet formula injection |
| Errors | no stack traces or internals sent to the browser |

## Not included yet

- Password reset by email (needs an email service such as Resend/SES). For now: the user calls the organisers, who verify the registered phone number and use **/admin → Password reset** to issue a temporary password.
- Email/WhatsApp confirmations after purchase.
- Camera QR scanning at the gate (the dashboard check-in takes the pass ID; most phone camera apps read the QR and show the ID).
