# Family Picks — Project Context

## What This Is
A private family NFL pick'em web app replacing a nearly 20-year tradition that started with pen and paper and evolved through spreadsheets. One link, no registration friction, fully automated scoring. Built mobile-first for iOS Safari.

**Players:** Ryan, Nicole, Mike, Mom, Dad, Annie, Nathan, Aidan, Kate (9 players, fixed roster)
**Commissioner:** Ryan
**Season:** 2026 NFL Season (Week 1 target)
**Repo:** `family-picks`

---

## Current Status
Demo complete and tested on iOS Safari. Production build not yet started — targeting August 2026 for test run, Week 1 of NFL season for launch.

The entire demo lives in `index.html` — a single self-contained file with no dependencies.

---

## What's Built (Demo)

### User Experience
- **Registration** — first visit shows 9 name buttons, tap once, device remembers you via localStorage all season
- **Home tab** — week banner with Make Picks button, submission status strip (who has/hasn't picked), weekly leaderboard ranked by this week's wins
- **Pick entry** — slides up from bottom, 16 games per week organized by time slot, per-slot locking at exact kickoff time, expand button on each game card showing spread, records, last 5 games as W/L dots, weather, pool history, plain-English summary for casual players, progress bar, success screen on submit
- **Weekly tab** — full picks grid for any week, green = correct, red = wrong, win totals at bottom, picks hidden until kickoff
- **Season tab** — full standings with total wins, win %, streaks, mini week-by-week bar charts
- **Commissioner view** — PIN protected (demo PIN: 1234), submission log with timestamps and device info, flag system for suspicious overwrites, assign picks to correct player, device registration management, system status panel

### Key Design Decisions
- No accounts, no passwords, no email collection — tap your name, you're in
- Picks board hidden until kickoff — reveals as games lock, adds strategy element
- Per-slot locking — Thursday game locks Thursday, 1pm games lock at 1pm Sunday, etc.
- Device fingerprint stored in localStorage for returning users
- Commissioner is just another player — same app, extra access via PIN

---

## Agreed Additions (Not Yet Built)
These were agreed during planning but not in the demo yet:

1. **Submission status strip** — visible to all players on home tab showing who has/hasn't submitted. Format: ✅ Ryan · ✅ Nicole · ⏳ Mike · etc.
2. **Weekly winner callout** — banner on home tab after week finalizes: "🏆 This Week: Ryan — 13/16"
3. **ATS tracking** — passively track picks against the spread, surface on leaderboard, use as tiebreaker
4. **Tiebreaker rule** — ATS record as tiebreaker when two players tie on weekly wins, documented in app

---

## Production Build — What Needs to Be Done

### Infrastructure Setup
- [ ] Create `family-picks` GitHub repo (done) and enable GitHub Pages
- [ ] Set up Airtable base — see table structure below
- [ ] Configure GitHub Actions for automation

### Airtable Tables Needed
```
Players        — name, device_fingerprint, registered_at
Weeks          — week_number, season, status (open/locked/complete), matchups (JSON), odds (JSON)
Picks          — player_name, week_number, game_index, pick (home/away), timestamp, device_id
Results        — week_number, game_index, winner (home/away), final_score
Submissions    — player_name, week_number, timestamp, device_id, status (active/flagged), flag_notes
```

### API Integrations
- **ESPN Public API** — schedule and scores (free, unofficial but rock solid)
  - Schedule endpoint: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard`
  - Used for: weekly matchups, live scores, final results
- **The Odds API** — spreads and over/unders
  - Account already exists (shared with another project)
  - Pull once per week (Tuesday/Wednesday when week opens), cache in Airtable
  - 500 calls/month free tier — at 1 call/week = 18 calls/season, no issue
  - API key stored as GitHub secret

### GitHub Actions Schedule
```
Tuesday 9am ET  — fetch weekly schedule from ESPN, fetch odds from The Odds API, write to Airtable
Sunday 12:30pm  — begin score checks every 30 min via ESPN API
Sunday 11:30pm  — final score check, mark week complete, update standings
Monday 9am      — weekly summary trigger (future: Twilio notifications)
```

### What Changes in Production vs Demo
- Replace all hardcoded `GAMES_W5`, `SEASON`, `PLAYERS` data with Airtable API calls
- Replace localStorage-only device memory with Airtable-backed fingerprint verification
- Commissioner PIN stored as environment variable, not hardcoded
- Submission log becomes real data from Airtable Submissions table
- Scoring calculated from Results table, not fake data

---

## Tech Stack
| Layer | Tool | Cost |
|-------|------|------|
| Hosting | GitHub Pages | Free |
| Database | Airtable | Free tier |
| Automation | GitHub Actions | Free tier |
| Schedule/Scores | ESPN Public API | Free |
| Odds | The Odds API | Free (500 calls/month) |
| Frontend | Vanilla HTML/CSS/JS | — |

No frameworks. No build process. No paid infrastructure for a 9-person family pool.

---

## Known Gotchas
- **Safari blocks `prompt()` dialogs** in sandboxed iframes — all interactions must be inline UI, no native dialogs
- **localStorage clears** if user wipes browser data — commissioner can reset device registration in Airtable
- **ESPN API is unofficial** — monitor for format changes, GitHub Action should alert on failure
- **The Odds API** is shared with another project — cache aggressively, 1 pull per week max

---

## Future Roadmap (Not This Season)
- Text notifications via Twilio — "Week 5 picks open", "Games lock in 1 hour"
- 20-year historical pool data import (data not available, will build forward from 2026)
- PWA upgrade for home screen install and push notifications
- League format options — confidence points, survivor side game, upset bonus, weekly high score bonus
- Scale to multi-league SaaS product — commissioner pays, players free, affiliate revenue (DraftKings/FanDuel)
- Monetization: ~$10-15/season commissioner subscription + affiliate deals
- Licensing note: team names and scores are fine, NFL logos are not

---

## File Structure (Current)
```
family-picks/
├── index.html        # Entire app — single file, self-contained
└── CLAUDE.md         # This file
```

Production will expand to:
```
family-picks/
├── index.html
├── CLAUDE.md
├── .github/
│   └── workflows/
│       ├── fetch-schedule.yml    # Tuesday — ESPN + odds pull
│       └── check-scores.yml      # Sunday — score checking loop
└── scripts/
    ├── fetch-schedule.js
    └── check-scores.js
```

---

## Session History Note
This project was planned and demoed in a Claude.ai conversation before moving to Claude Code. The demo was fully tested on iOS Safari. All design decisions, UX flows, and feature agreements are documented above. Resume from production build.
