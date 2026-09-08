import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { buildWeekInsights } from '@/lib/insights'

export async function POST(req: NextRequest) {
  const supabase = supabaseAdmin()

  let body: { weekId?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  if (typeof body.weekId !== 'string') {
    return NextResponse.json({ error: 'weekId required' }, { status: 400 })
  }

  let rows
  try {
    rows = await buildWeekInsights(supabase, body.weekId)
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }

  if (rows.length) {
    const { error } = await supabase
      .from('game_insights')
      .upsert(
        rows.map((r) => ({ game_id: r.game_id, data: r.data, updated_at: new Date().toISOString() })),
        { onConflict: 'game_id' }
      )
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const withOdds = rows.filter((r) => r.data.odds).length
  return NextResponse.json({ updated: rows.length, withOdds })
}
