# Scaling Bullseye Darts — from one pub to national/international

## TL;DR — how big can it get?

| Stage | Venues | Concurrent users | Monthly matches | Infra cost | What you do |
|---|---|---|---|---|---|
| Launch | 1–10 | ~50 | ~10k | **R0 — free tier** | Nothing. Run as-is. |
| Growing | 10–100 | ~500 | ~100k | **$0–25/mo** | Flip to Supabase Pro |
| National | 100–1,000 | ~5,000 | ~1M | **$25–100/mo** | Add caching + observability |
| International | 1,000+ | 20k+ | 5M+ | **$100–500/mo** | Read replicas, sharding by region |

**A pub darts app is a LOW-traffic workload.** Matches take 20+ minutes and each player
throws a handful of light HTTP writes per match. 200 pubs × 10 players each, all playing
on league night (19:00–22:00) is roughly **40–80 concurrent active sessions nationally** —
a single free Postgres instance barely notices.

### Where the real limits are (Supabase free tier)

| Limit | Free tier | When you'd hit it |
|---|---|---|
| DB size | 500 MB | ~1M matches (each match row ≈ 0.5 KB) |
| Bandwidth | 5 GB/mo | ~2M page loads — huge |
| Concurrent connections | ~60 direct | Only if you skip connection pooling (Supabase pools by default via Supavisor) |
| Auth users | 50,000 MAU | Years away |

So: **the free tier carries your first several thousand venues.** The paid jump ($25/mo
Supabase Pro) buys 8 GB DB + 250 GB bandwidth — that's the whole national-stage bill.

## What's already built for scale (in the app today)

1. **Stateless front-end.** The whole app is a static bundle — put it behind any CDN
   (Cloudflare free) and it scales to any audience with zero code changes. The server
   never renders pages.
2. **Row-Level Security everywhere.** Postgres does the authorization, not app code —
   thousands of tenants (venues) share one database safely.
3. **Presence via heartbeat, not websockets-per-user.** One tiny UPDATE per 45s per
   signed-in player. Even 10,000 online players = ~3.7 writes/sec. Trivial.
4. **Indexed queries.** Venue leaderboards, fixtures and history queries all hit
   composite indexes (see schema v3).
5. **Fire-and-forget analytics.** app_events inserts never block the UI; retention
   pruning keeps the table small (180 days).
6. **Offline-first.** If the cloud is down, venues keep scoring locally and sync later —
   a pub never stops playing because of an outage.

## The growth ladder — what to do at each stage

### Stage 1 — Launch (now)
- Deploy static build + run `supabase/schema.sql`.
- Set up Google/Facebook/X providers + SMTP (DEPLOYMENT.md).
- Register venues via the Competition → Venues tab (self-service, zero ops).

### Stage 2 — Growing (10+ venues)
- Supabase Pro ($25/mo) when you approach 500 MB DB or 5 GB bandwidth.
- Add Cloudflare in front of the static host (free): CDN + SSL + DDoS shield.
- Turn on Supabase **pg_cron** retention job (comment in schema.sql).
- Weekly logical backups (Supabase dashboard → one click).

### Stage 3 — National (100+ venues)
- Supabase compute upgrade (2× micro → small).
- **Materialized view** for venue leaderboards refreshed every 5 min:
  ```sql
  create materialized view venue_leaderboard as
  select venue_id, (p->>'name') as player, count(*) filter (where p->>'won' = 'true') as wins,
         count(*) as played
  from matches m, jsonb_array_elements(players) p
  where venue_id is not null group by venue_id, player;
  ```
- Move analytics reads to a read replica or export to a warehouse.
- Status page + uptime monitoring (BetterStack/Healthchecks.io, free).

### Stage 4 — International (1,000+ venues)
- Read replicas in EU/US regions (Supabase supports this on paid plans).
- Region-pin deployments: a subdomain per region (eu.dartsapp.com, us...) sharing one
  schema — Postgres handles millions of rows fine; geography matters only for latency.
- If write volume ever spikes (it won't soon): partition `matches` by month.
- Optional: move presence to Supabase Realtime channels if you want sub-second
  "who's playing" updates across venues.

## Security posture (national-app requirements, built in)

| Requirement | Status |
|---|---|
| TLS everywhere | ✅ host + Supabase enforce it |
| Passwords hashed, never stored by app | ✅ Supabase auth (bcrypt) |
| Social OAuth (Google/Facebook/X) via PKCE | ✅ configured in app |
| Email confirmation + reset flows | ✅ Supabase built-in + SMTP guide |
| Row-Level Security on every table | ✅ schema.sql |
| Least-privilege anon key in client | ✅ no service keys ship |
| Self-service data export | ✅ Account → Download my data |
| Self-service erasure (POPIA art. 25 / GDPR art. 17) | ✅ Account → Delete account (SQL function) |
| Consent capture at registration | ✅ checkbox + Terms/Privacy page |
| Anonymous analytics only | ✅ pseudonymous id, no PII in app_events |
| Rate limiting | ⬜ enable Supabase Auth rate limits + Cloudflare rules at Stage 2 |
| Audit trail for venue owners | ⬜ Stage 3 (app_events covers most of it) |

## Operational runbook (print this)

- **Backup:** Supabase → Database → Backups → create logical backup (weekly).
- **Restore:** point a new project at the backup; redeploy `dist/` with new keys — 15 min.
- **Abuse report / compromised account:** Supabase → Auth → delete/ban user.
- **GDPR/POPIA request:** the user self-serves via Account page; for help email, use the
  registered venue contact.
- **Crisis (cloud down):** nothing to do — every venue plays on, offline mode.
