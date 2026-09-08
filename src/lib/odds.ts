// The Odds API — NFL spreads + totals. Server-only (needs ODDS_API_KEY).
// One pull returns the whole slate; the caller matches to games by AWAY@HOME.

import type { GameOdds } from './insight-types'
export type { GameOdds }

const FULL_NAME_TO_ABBR: Record<string, string> = {
  'Arizona Cardinals': 'ARI',
  'Atlanta Falcons': 'ATL',
  'Baltimore Ravens': 'BAL',
  'Buffalo Bills': 'BUF',
  'Carolina Panthers': 'CAR',
  'Chicago Bears': 'CHI',
  'Cincinnati Bengals': 'CIN',
  'Cleveland Browns': 'CLE',
  'Dallas Cowboys': 'DAL',
  'Denver Broncos': 'DEN',
  'Detroit Lions': 'DET',
  'Green Bay Packers': 'GB',
  'Houston Texans': 'HOU',
  'Indianapolis Colts': 'IND',
  'Jacksonville Jaguars': 'JAC',
  'Kansas City Chiefs': 'KC',
  'Las Vegas Raiders': 'LV',
  'Los Angeles Chargers': 'LAC',
  'Los Angeles Rams': 'LAR',
  'Miami Dolphins': 'MIA',
  'Minnesota Vikings': 'MIN',
  'New England Patriots': 'NE',
  'New Orleans Saints': 'NO',
  'New York Giants': 'NYG',
  'New York Jets': 'NYJ',
  'Philadelphia Eagles': 'PHI',
  'Pittsburgh Steelers': 'PIT',
  'San Francisco 49ers': 'SF',
  'Seattle Seahawks': 'SEA',
  'Tampa Bay Buccaneers': 'TB',
  'Tennessee Titans': 'TEN',
  'Washington Commanders': 'WAS',
}

// First book found wins, in this order.
const BOOK_PREFERENCE = ['draftkings', 'fanduel', 'betmgm', 'caesars', 'betrivers']

type OddsApiEvent = {
  home_team: string
  away_team: string
  bookmakers: {
    key: string
    markets: { key: string; outcomes: { name: string; point?: number }[] }[]
  }[]
}

function pickBook(ev: OddsApiEvent) {
  for (const key of BOOK_PREFERENCE) {
    const b = ev.bookmakers.find((x) => x.key === key)
    if (b) return b
  }
  return ev.bookmakers[0] ?? null
}

// Returns a map keyed by "AWAY@HOME" (abbreviations).
export async function fetchNflOdds(): Promise<Record<string, GameOdds>> {
  const key = process.env.ODDS_API_KEY
  if (!key) throw new Error('ODDS_API_KEY is not set')

  const url =
    `https://api.the-odds-api.com/v4/sports/americanfootball_nfl/odds/` +
    `?apiKey=${key}&regions=us&markets=spreads,totals&oddsFormat=american`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Odds API error: ${res.status}`)

  const events = (await res.json()) as OddsApiEvent[]
  const out: Record<string, GameOdds> = {}

  for (const ev of events) {
    const away = FULL_NAME_TO_ABBR[ev.away_team]
    const home = FULL_NAME_TO_ABBR[ev.home_team]
    if (!away || !home) continue

    const book = pickBook(ev)
    let odds: GameOdds = { spreadFavorite: null, spreadLine: null, total: null, book: book?.key ?? null }

    if (book) {
      const spreads = book.markets.find((m) => m.key === 'spreads')
      if (spreads) {
        const favOutcome = spreads.outcomes
          .filter((o) => typeof o.point === 'number')
          .sort((a, b) => (a.point as number) - (b.point as number))[0]
        if (favOutcome) {
          odds.spreadFavorite = FULL_NAME_TO_ABBR[favOutcome.name] ?? null
          odds.spreadLine = favOutcome.point ?? null
        }
      }
      const totals = book.markets.find((m) => m.key === 'totals')
      const over = totals?.outcomes.find((o) => o.name === 'Over')
      if (typeof over?.point === 'number') odds.total = over.point
    }

    out[`${away}@${home}`] = odds
  }

  return out
}
