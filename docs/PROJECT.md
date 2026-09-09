# Family Picks — Project Status

Living handoff doc. Update it when the shape of the project changes.

_Last updated: 2026-09-08 — after PR #5._

---

## What this is

A private family NFL pick'em web app for the 2026 season. 9 players, one shared
link, no accounts. Replaces a ~20-year pen-and-paper / spreadsheet tradition.
Mobile-first (iOS Safari).

**Players (fixed roster):** Ryan, Nicole, Mike, Mom, Dad, Annie, Nathan, Aidan, Kate
**Commissioner:** Ryan (tied to his player row via `players.is_commissioner`)

## Live

| | |
|---|---|
| Production | https://family-picks-one.vercel.app |
| Repo | https://github.com/ididoda/family-picks (branch `main`) |
| Vercel project | `ididodas-projects/family-picks` (auto-deploys on push to `main`) |
| Supabase project | `xylgpfedfvkgnirhrmob` |
| Odds provider | The Odds API (free tier, ~500 req/mo; a full pull = 2 credits) |

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · Tailwind v4 · Supabase (Postgres +
PostgREST) · Vercel. No test suite. `npm run dev` / `npm run build`.

> `AGENTS.md` warning stands: this Next.js version has breaking changes vs. older
> training data — check `node_modules/next/dist/docs/` before writing framework code.

---

## Data model (`supabase/schema.sql`)

- **players** — `id, name, is_active, created_at`, PIN auth (`pin_hash, pin_set_at,
  pin_attempts, locked_until`), `is_commissioner`. The PIN columns are **revoked
  from the anon/authenticated API**; only `id, name, is_active, created_at,
  is_commissioner` are readable client-side. All 9 rows share a `created_at`, so
  every `order('created_at')` also orders by `name` for stability.
- **seasons** — `year, is_active`. One active season (2026).
- **weeks** — `season_id, week_number, status` (`open` | `complete`). All 18
  regular-season weeks are loaded.
- **games** — `week_id, away_team, home_team, kickoff_time, status`
  (`scheduled` | `in_progress` | `final`), `away_score, home_score, winning_team`.
  272 games (full season) loaded from ESPN.
- **picks** — `player_id, game_id, picked_team, submitted_at`. Unique on
  `(player_id, game_id)`. Written by upsert, one row per tap.
- **game_insights** — `game_id` PK, `data` jsonb, `updated_at`. Odds + records +
  form + H2H blob, refreshed weekly by the commissioner.
- **pick_audit** — append-only log (`action, player_id, game_id, picked_team,
  changed_at`). A trigger on `picks` (`log_pick_change`) writes every
  INSERT/UPDATE/DELETE. App never touches it; service-role reads only.

### RLS posture (intentionally permissive — private family link)

- `players`: public read of safe columns only; **no public write** (all player
  writes go through `/api/commissioner/players` with the service role).
- `seasons` / `weeks` / `games`: public read; `weeks` + `games` also public
  insert/update (commissioner UI writes them directly, PIN-gated in-app).
- `picks`: public read/insert/update (players write their own; no delete policy —
  commissioner clears via `/api/commissioner/pick` service-role route).
- `game_insights`: public read, service-role write.
- `pick_audit`: RLS on, **no policies** → invisible to anon; service-role only.

### Migrations (`supabase/migrations/`, all applied to the live DB)

| File | What |
|---|---|
| `0001_pin_auth.sql` | PIN columns; revoke table SELECT, re-grant safe columns |
| `0002_commissioner_writes.sql` | write policies for `games` + `weeks` |
| `0003_commissioner_flag.sql` | `players.is_commissioner`; Ryan = true |
| `0004_game_insights.sql` | `game_insights` table |
| `0005_pick_audit.sql` | `pick_audit` table + `log_pick_change` trigger |

`schema.sql` is the from-scratch source of truth; the migrations are the deltas
that were applied to the running DB. A fresh setup runs `schema.sql` then
`seed.sql`.

---

## Auth model — "light PIN"

- First visit: tap your name → **create a 4-digit PIN** (entered twice). Returning
  on a new device: tap your name → **enter your PIN**. Device is trusted after
  that (`localStorage` `fp_player_id`), matching the original "remembers you"
  design.
- PIN verified server-side only (`/api/auth/pin`, scrypt via `node:crypto`).
  5 wrong tries → 5-minute lockout (`pin_attempts` / `locked_until`).
- **Not hard enforcement.** After login the client is trusted; `picks` writes go
  straight to Supabase. Fine for a 9-person family pool. The PIN's real job is
  stopping "pick as someone else" from a fresh device.
- Forgot PIN → commissioner **Reset PIN** (Players tab) clears the hash; they set
  a new one next visit.
- **Commissioner** = `players.is_commissioner`. Only Ryan sees the ⚙ in the
  header; `/commissioner` checks the flag and shows "Commissioner only" otherwise.
  There is **no separate commissioner PIN** anymore (`COMMISSIONER_PIN` env var is
  unused — left in place, harmless).

---

## How scoring / settlement works

**No cron. The commissioner triggers it.** Scoring is fully derived — there is no
wins/losses table.

1. **Sync Results** (Commissioner → Results) → fetches ESPN scoreboard for the
   current week, matches games by `AWAY@HOME`, writes `status`, scores, and
   `winning_team` (`awayScore > homeScore ? away : home`).
2. **Set Winning Team** — per-game manual override on the same screen.
3. Once `games.winning_team` is set, correct/wrong shows automatically in the
   Weekly grid, Season standings, print summary, and CSV (`pick == winning_team`).
4. **Mark Week Complete** (Weeks tab) → `weeks.status = 'complete'`. This is what
   feeds the week into Season standings + the weekly-winner banner. It does not
   score anything itself.

- Missed pick = no row = 0 for the week (not counted as a loss).
- **Tie games** are recorded as a home win (edge case; fix with manual override).

---

## Commissioner weekly runbook

Reach it via the ⚙ in the header (Ryan only).

1. **Tue/Wed — new week opens**
   - Weeks tab → the current week should already exist (all 18 are loaded). If a
     future week has no games: Results → **Fetch Schedule**.
   - Results → **Refresh Odds & Insights** (pulls spreads/O-U from The Odds API +
     builds the per-game blob).
2. **Sun/Mon — after games**
   - Results → **Sync Results** (repeat as games finish, or once at the end).
   - Spot-check; use **Set Winning Team** for any mismatch or tie.
   - Someone texted you their picks late? **Enter Picks** tab → pick week +
     player → set them (works after kickoff).
3. **When the week is done**
   - Weeks tab → **Mark Week _N_ Complete**.
   - Backup tab → **Download all picks (CSV)** and/or open the **Week _N_
     printable summary** → Save as PDF for the group text.

---

## Features built

**Players**
- Name + PIN registration / login; device remembered.
- **Home** — current week banner, "Make Picks" (X/16), submission strip (who's in).
- **Pick panel** — games grouped by time slot; per-kickoff locking; saves per tap
  (partial submission is fine — pick Thursday now, the rest later); optimistic
  save with rollback + error banner; **Details ▾** per game (spread, O/U, each
  team's record + last-5, head-to-head).
- **Weekly** — week **dropdown**; score shown **next to each name** on the left;
  your own picks always visible, everyone else's hidden per-game until that game
  kicks off; weekly-winner banner when complete.
- **Season** — standings (W / L / PCT / streak), leader callout. Only counts
  `complete` weeks.

**Commissioner** (`/commissioner`, `is_commissioner` gated)
- **Results** — Fetch Schedule, Sync Results, Refresh Odds & Insights, per-game
  Set Winning Team.
- **Weeks** — create week, mark complete.
- **Players** — add, toggle active, PIN status, two-tap Reset PIN.
- **Enter Picks** — set/clear any player's picks for any week, after kickoff.
- **Submissions** — who's submitted, last-pick timestamps.
- **Backup** — CSV export of all picks; per-week printable PDF summary
  (`/commissioner/print?week=<id>`).

**Data pipeline**
- `src/lib/espn.ts` — schedule + scores from ESPN's public scoreboard API.
- `src/lib/odds.ts` — The Odds API: spread + O/U, first available book
  (DK → FD → …). Needs `ODDS_API_KEY`.
- `src/lib/insights.ts` — assembles the `game_insights` blob (odds + records +
  form + H2H; records/form/H2H come from our own `games` data, so they fill in as
  weeks finalize).
- `scripts/load-season.mjs` — idempotent loader for all 18 weeks / 272 games from
  ESPN. `node --env-file=.env.local scripts/load-season.mjs [--dry-run] [--weeks 5-9]`.

## API routes

| Route | Method | Notes |
|---|---|---|
| `/api/players` | GET | name + `hasPin` + `locked` for the sign-in screen |
| `/api/auth/pin` | POST | claim-or-verify PIN; lockout |
| `/api/commissioner/players` | GET/POST | list w/ PIN status; add / toggle / reset-pin (service role) |
| `/api/commissioner/pick` | POST | commissioner set/clear a pick (service role) |
| `/api/commissioner/fetch-schedule` | POST | ESPN → `games` for a week (service role) |
| `/api/commissioner/sync-results` | POST | ESPN scores → `games` (service role) |
| `/api/commissioner/refresh-insights` | POST | build `game_insights` for a week |
| `/api/commissioner/export` | POST | full pick CSV; `is_commissioner` checked (403 otherwise) |

> The commissioner routes other than `export` are **not** auth-checked
> server-side (consistent with the pre-existing pattern; the panel is client-side
> gated). Worth hardening if this ever goes beyond family use.

## Environment variables

Set in `.env.local` (gitignored) and in Vercel (Production + Preview):

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `sb_publishable_…` client key |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_…` — server routes only, bypasses RLS |
| `ODDS_API_KEY` | The Odds API |
| `COMMISSIONER_PIN` | **unused** (legacy; safe to delete) |

`.claude/settings.local.json` allows `Bash(vercel env add:*)` for this repo.

---

## Deferred / roadmap

- **Insights pass 2** — power rating, weather (open-meteo), one-line Claude
  summary per game (needs `ANTHROPIC_API_KEY`).
- **Automated settlement** — a cron (Vercel Cron / GitHub Actions) that runs
  Sync Results + Refresh Insights on a schedule instead of manual buttons.
- **Scheduled off-site backup** — push weekly picks to a Google Sheet
  (service account) so a record survives Supabase itself.
- **One-tap PDF** — replace the print-to-PDF page with `@react-pdf/renderer` if
  the print flow is annoying on phones.
- **Notifications** — "picks lock in 2 hours" via email (Resend) or SMS.
- **PWA** — installable to the iOS home screen.
- **ATS tracking + tiebreaker** — against-the-spread record as the weekly
  tiebreaker (was in the original plan).
- Custom roster ordering (add `players.sort_order`) — currently alphabetical.
- `next lint` has 3 errors / 6 warnings (unescaped entity, `set-state-in-effect`,
  unused vars) — non-blocking, worth a cleanup pass.

## Known gotchas

- **Placeholder 2026 schedule.** ESPN's data this far out shifts. Re-running the
  loader / Fetch Schedule adds newly-announced games but does **not** correct
  matchups or times that moved — clear and reload the affected week.
- Tie games → recorded as home win (see settlement section).
- The `family-picks-ididodas-projects.vercel.app` alias is behind Vercel
  deployment protection (302). The public URL is `family-picks-one.vercel.app`.
- Before the family starts for real: `delete from picks;` to clear test data
  (check first — the audit table keeps its own copy).

## Local dev

```bash
npm install
npm run dev            # localhost:3000
npm run build          # typecheck + build (CI-equivalent)
node --env-file=.env.local scripts/load-season.mjs --dry-run
```

Migrations are run by hand in the Supabase SQL editor (no CLI wired up). New
schema changes: add a numbered file to `supabase/migrations/`, mirror it into
`schema.sql`, run it in the SQL editor, and include `notify pgrst, 'reload schema';`.
