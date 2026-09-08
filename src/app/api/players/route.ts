import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Public list for the registration screen: names plus whether a PIN is set /
// the slot is temporarily locked. Never returns the hash.
export async function GET() {
  const supabase = supabaseAdmin()
  const { data, error } = await supabase
    .from('players')
    .select('id, name, pin_hash, locked_until')
    .eq('is_active', true)
    .order('created_at')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const now = Date.now()
  return NextResponse.json(
    (data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      hasPin: !!p.pin_hash,
      locked: !!p.locked_until && new Date(p.locked_until).getTime() > now,
    }))
  )
}
