import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function csvCell(v: unknown): string {
  const s = v == null ? '' : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// Full pick export as CSV — commissioner only. POST { playerId }.
export async function POST(req: NextRequest) {
  const supabase = supabaseAdmin()

  let body: { playerId?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  if (typeof body.playerId !== 'string') {
    return NextResponse.json({ error: 'playerId required' }, { status: 400 })
  }

  const { data: caller } = await supabase
    .from('players')
    .select('is_commissioner')
    .eq('id', body.playerId)
    .maybeSingle()
  if (!caller?.is_commissioner) {
    return NextResponse.json({ error: 'Commissioner only' }, { status: 403 })
  }

  const { data, error } = await supabase
    .from('picks')
    .select(
      'picked_team, submitted_at, players(name), games(away_team, home_team, kickoff_time, winning_team, status, weeks(week_number))'
    )
    .order('submitted_at')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  type Row = {
    picked_team: string
    submitted_at: string
    players: { name: string } | null
    games:
      | {
          away_team: string
          home_team: string
          kickoff_time: string
          winning_team: string | null
          status: string
          weeks: { week_number: number } | null
        }
      | null
  }

  const header = ['week', 'player', 'matchup', 'pick', 'result', 'submitted_at']
  const lines = [header.join(',')]

  for (const r of (data ?? []) as unknown as Row[]) {
    const g = r.games
    const result = !g?.winning_team
      ? 'pending'
      : g.winning_team === r.picked_team
        ? 'correct'
        : 'wrong'
    lines.push(
      [
        g?.weeks?.week_number ?? '',
        r.players?.name ?? '',
        g ? `${g.away_team}@${g.home_team}` : '',
        r.picked_team,
        result,
        r.submitted_at,
      ]
        .map(csvCell)
        .join(',')
    )
  }

  const stamp = new Date().toISOString().slice(0, 10)
  return new NextResponse(lines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="family-picks-${stamp}.csv"`,
    },
  })
}
