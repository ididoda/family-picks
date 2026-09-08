// ESPN uses different abbreviations for a handful of teams
const ESPN_ABBR_MAP: Record<string, string> = {
  JAX: 'JAC',
  WSH: 'WAS',
}

export function normalizeAbbr(espnAbbr: string): string {
  return ESPN_ABBR_MAP[espnAbbr] ?? espnAbbr
}

export type EspnGame = {
  espnId: string
  awayTeam: string
  homeTeam: string
  kickoffTime: string
  status: 'scheduled' | 'in_progress' | 'final'
  awayScore: number | null
  homeScore: number | null
  winningTeam: string | null
}

export async function fetchEspnWeek(weekNumber: number, year: number): Promise<EspnGame[]> {
  const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?seasontype=2&week=${weekNumber}&dates=${year}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error(`ESPN API error: ${res.status}`)

  const data = await res.json()
  const events = data.events ?? []

  return events.map((event: Record<string, unknown>) => {
    const competition = (event.competitions as Record<string, unknown>[])[0]
    const competitors = competition.competitors as Record<string, unknown>[]
    const statusType = (competition.status as Record<string, unknown>).type as Record<string, unknown>

    const away = competitors.find((c) => c.homeAway === 'away')!
    const home = competitors.find((c) => c.homeAway === 'home')!

    const awayAbbr = normalizeAbbr(((away.team as Record<string, unknown>).abbreviation as string).toUpperCase())
    const homeAbbr = normalizeAbbr(((home.team as Record<string, unknown>).abbreviation as string).toUpperCase())
    const awayScore = away.score ? parseInt(away.score as string) : null
    const homeScore = home.score ? parseInt(home.score as string) : null

    const statusName = statusType.name as string
    const completed = statusType.completed as boolean

    let status: EspnGame['status'] = 'scheduled'
    if (completed) status = 'final'
    else if (statusName === 'STATUS_IN_PROGRESS' || statusName === 'STATUS_HALFTIME') status = 'in_progress'

    let winningTeam: string | null = null
    if (status === 'final' && awayScore !== null && homeScore !== null) {
      winningTeam = awayScore > homeScore ? awayAbbr : homeAbbr
    }

    return {
      espnId: event.id as string,
      awayTeam: awayAbbr,
      homeTeam: homeAbbr,
      kickoffTime: event.date as string,
      status,
      awayScore,
      homeScore,
      winningTeam,
    }
  })
}
