import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { fetchNflOdds } from './odds'
import type { GameOdds, TeamForm, GameInsight } from './insight-types'

type Admin = SupabaseClient<Database>

export type { TeamForm, GameInsight }

type FinalGame = {
  away_team: string
  home_team: string
  winning_team: string | null
  kickoff_time: string
  week: { week_number: number } | null
}

function formFor(team: string, finals: FinalGame[]): TeamForm {
  const played = finals
    .filter((g) => g.away_team === team || g.home_team === team)
    .sort((a, b) => b.kickoff_time.localeCompare(a.kickoff_time))

  let w = 0
  let l = 0
  const last5: ('W' | 'L')[] = []
  for (const g of played) {
    const won = g.winning_team === team
    if (won) w++
    else l++
    if (last5.length < 5) last5.push(won ? 'W' : 'L')
  }
  return { record: { w, l }, last5 }
}

// Build the insight blob for every game in a week.
export async function buildWeekInsights(
  supabase: Admin,
  weekId: string
): Promise<{ game_id: string; data: GameInsight }[]> {
  // Games this week
  const { data: weekGames } = await supabase
    .from('games')
    .select('id, away_team, home_team')
    .eq('week_id', weekId)
  if (!weekGames?.length) return []

  // Active season, for the pool of finals used for records / form / H2H
  const { data: season } = await supabase.from('seasons').select('id').eq('is_active', true).single()
  const { data: seasonWeeks } = season
    ? await supabase.from('weeks').select('id').eq('season_id', season.id)
    : { data: [] }
  const weekIds = (seasonWeeks ?? []).map((w) => w.id)

  const { data: finalsRaw } = weekIds.length
    ? await supabase
        .from('games')
        .select('away_team, home_team, winning_team, kickoff_time, week:weeks(week_number)')
        .in('week_id', weekIds)
        .eq('status', 'final')
    : { data: [] }
  const finals = (finalsRaw ?? []) as unknown as FinalGame[]

  let odds: Record<string, GameOdds> = {}
  try {
    odds = await fetchNflOdds()
  } catch {
    // odds are best-effort; records/form still populate
  }

  return weekGames.map((g) => {
    const key = `${g.away_team}@${g.home_team}`
    const h2h = finals
      .filter(
        (f) =>
          (f.away_team === g.away_team && f.home_team === g.home_team) ||
          (f.away_team === g.home_team && f.home_team === g.away_team)
      )
      .filter((f) => f.winning_team)
      .sort((a, b) => b.kickoff_time.localeCompare(a.kickoff_time))
      .map((f) => ({ winner: f.winning_team as string, week: f.week?.week_number ?? 0 }))

    return {
      game_id: g.id,
      data: {
        odds: odds[key] ?? null,
        away: formFor(g.away_team, finals),
        home: formFor(g.home_team, finals),
        h2h,
      },
    }
  })
}
