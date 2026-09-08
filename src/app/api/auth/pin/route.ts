import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { hashPin, verifyPin, isValidPin } from '@/lib/pin'

const MAX_ATTEMPTS = 5
const LOCK_MINUTES = 5

// One endpoint for both cases:
//  - no PIN yet  -> claim the slot, store the PIN
//  - PIN exists  -> verify it (with lockout after repeated failures)
export async function POST(req: NextRequest) {
  const supabase = supabaseAdmin()

  let body: { playerId?: unknown; pin?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  const { playerId, pin } = body
  if (typeof playerId !== 'string' || !isValidPin(pin)) {
    return NextResponse.json({ error: 'PIN must be 4 digits' }, { status: 400 })
  }

  const { data: player } = await supabase
    .from('players')
    .select('id, pin_hash, pin_attempts, locked_until')
    .eq('id', playerId)
    .maybeSingle()
  if (!player) return NextResponse.json({ error: 'Unknown player' }, { status: 404 })

  // Claim
  if (!player.pin_hash) {
    await supabase
      .from('players')
      .update({
        pin_hash: hashPin(pin),
        pin_set_at: new Date().toISOString(),
        pin_attempts: 0,
        locked_until: null,
      })
      .eq('id', playerId)
    return NextResponse.json({ ok: true, claimed: true })
  }

  // Locked
  if (player.locked_until && new Date(player.locked_until).getTime() > Date.now()) {
    return NextResponse.json({ error: 'locked', lockedUntil: player.locked_until }, { status: 423 })
  }

  // Correct PIN
  if (verifyPin(pin, player.pin_hash)) {
    await supabase.from('players').update({ pin_attempts: 0, locked_until: null }).eq('id', playerId)
    return NextResponse.json({ ok: true })
  }

  // Wrong PIN
  const attempts = (player.pin_attempts ?? 0) + 1
  const lock = attempts >= MAX_ATTEMPTS
  const lockedUntil = lock ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString() : null
  await supabase
    .from('players')
    .update({ pin_attempts: lock ? 0 : attempts, locked_until: lockedUntil })
    .eq('id', playerId)

  return NextResponse.json(
    lock ? { error: 'locked', lockedUntil } : { error: 'wrong', attemptsLeft: MAX_ATTEMPTS - attempts },
    { status: lock ? 423 : 401 }
  )
}
