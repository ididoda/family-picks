import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Commissioner manual pick entry / override. Works regardless of kickoff.
// { playerId, gameId, team }  -> set (upsert)
// { playerId, gameId, team: null } -> clear
export async function POST(req: NextRequest) {
  const supabase = supabaseAdmin()

  let body: { playerId?: unknown; gameId?: unknown; team?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  const { playerId, gameId, team } = body
  if (typeof playerId !== 'string' || typeof gameId !== 'string') {
    return NextResponse.json({ error: 'playerId and gameId required' }, { status: 400 })
  }

  if (team === null) {
    const { error } = await supabase.from('picks').delete().eq('player_id', playerId).eq('game_id', gameId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, cleared: true })
  }

  if (typeof team !== 'string') {
    return NextResponse.json({ error: 'team must be a string or null' }, { status: 400 })
  }

  const { error } = await supabase.from('picks').upsert(
    { player_id: playerId, game_id: gameId, picked_team: team, submitted_at: new Date().toISOString() },
    { onConflict: 'player_id,game_id' }
  )
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
