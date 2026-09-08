import { NextRequest, NextResponse } from 'next/server'
import { fetchEspnWeek } from '@/lib/espn'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const supabase = supabaseAdmin()
  const { weekId, weekNumber, year } = await req.json()

  const [espnGames, { data: dbGames }] = await Promise.all([
    fetchEspnWeek(weekNumber, year),
    supabase.from('games').select('id, away_team, home_team, status').eq('week_id', weekId),
  ])

  const dbMap = new Map((dbGames ?? []).map((g) => [`${g.away_team}@${g.home_team}`, g]))

  let updated = 0
  for (const game of espnGames) {
    const dbGame = dbMap.get(`${game.awayTeam}@${game.homeTeam}`)
    if (!dbGame) continue

    const { error } = await supabase
      .from('games')
      .update({
        status: game.status,
        away_score: game.awayScore,
        home_score: game.homeScore,
        winning_team: game.winningTeam,
      })
      .eq('id', dbGame.id)

    if (!error) updated++
  }

  return NextResponse.json({ updated, total: espnGames.length })
}
