import { NextRequest, NextResponse } from 'next/server'
import { fetchEspnWeek } from '@/lib/espn'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const supabase = supabaseAdmin()
  const { weekId, weekNumber, year } = await req.json()

  const espnGames = await fetchEspnWeek(weekNumber, year)

  // Get existing games for this week to avoid duplicates
  const { data: existing } = await supabase
    .from('games')
    .select('away_team, home_team')
    .eq('week_id', weekId)

  const existingSet = new Set((existing ?? []).map((g) => `${g.away_team}@${g.home_team}`))

  const toInsert = espnGames
    .filter((g) => !existingSet.has(`${g.awayTeam}@${g.homeTeam}`))
    .map((g) => ({
      week_id: weekId,
      away_team: g.awayTeam,
      home_team: g.homeTeam,
      kickoff_time: g.kickoffTime,
      status: g.status,
    }))

  if (toInsert.length > 0) {
    const { error } = await supabase.from('games').insert(toInsert)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ added: toInsert.length, total: espnGames.length })
}
