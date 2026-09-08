import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Full player list for the commissioner, including PIN status (never the hash).
export async function GET() {
  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('players')
    .select('id, name, is_active, pin_hash, locked_until')
    .order('created_at')
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const now = Date.now()
  return NextResponse.json(
    (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      is_active: p.is_active,
      hasPin: !!p.pin_hash,
      locked: !!p.locked_until && new Date(p.locked_until).getTime() > now,
    }))
  )
}

// Commissioner player management. Uses the service-role client because `players`
// has no public write policy. action: 'add' | 'toggle' | 'reset-pin'
export async function POST(req: NextRequest) {
  const supabase = supabaseAdmin()

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }

  if (body.action === 'add') {
    const name = String(body.name ?? '').trim()
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })
    const { data, error } = await supabase
      .from('players')
      .insert({ name })
      .select('id, name, is_active')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  if (body.action === 'toggle') {
    const { data: p } = await supabase
      .from('players')
      .select('is_active')
      .eq('id', String(body.playerId))
      .maybeSingle()
    if (!p) return NextResponse.json({ error: 'Unknown player' }, { status: 404 })
    const { error } = await supabase
      .from('players')
      .update({ is_active: !p.is_active })
      .eq('id', String(body.playerId))
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, is_active: !p.is_active })
  }

  if (body.action === 'reset-pin') {
    const { error } = await supabase
      .from('players')
      .update({ pin_hash: null, pin_set_at: null, pin_attempts: 0, locked_until: null })
      .eq('id', String(body.playerId))
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
