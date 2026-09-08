'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getStoredPlayerId, setStoredPlayerId } from '@/lib/player'

type Player = { id: string; name: string }

export default function PlayerSelect() {
  const router = useRouter()
  const [players, setPlayers] = useState<Player[]>([])
  const [selecting, setSelecting] = useState<string | null>(null)

  useEffect(() => {
    const stored = getStoredPlayerId()
    if (stored) {
      router.replace('/home')
      return
    }

    supabase
      .from('players')
      .select('id, name')
      .eq('is_active', true)
      .order('created_at')
      .then(({ data }) => {
        if (data) setPlayers(data)
      })
  }, [router])

  async function handleSelect(player: Player) {
    setSelecting(player.id)
    setStoredPlayerId(player.id)
    router.push('/home')
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1
            className="text-5xl font-extrabold tracking-widest uppercase mb-1"
            style={{ fontFamily: 'var(--font-barlow-condensed), sans-serif', color: '#C8102E' }}
          >
            Family Picks
          </h1>
          <p className="text-sm tracking-widest uppercase text-white/50">
            2026 NFL Season
          </p>
        </div>

        <p
          className="text-center text-xl font-semibold tracking-wider uppercase mb-6 text-white/80"
          style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
        >
          Who are you?
        </p>

        <div className="grid grid-cols-3 gap-3">
          {players.map((player) => (
            <button
              key={player.id}
              onClick={() => handleSelect(player)}
              disabled={!!selecting}
              className="py-4 rounded-xl font-semibold text-sm tracking-wide uppercase transition-all active:scale-95"
              style={{
                fontFamily: 'var(--font-barlow-condensed), sans-serif',
                fontSize: '1.05rem',
                background: selecting === player.id ? '#C8102E' : '#1a2540',
                color: selecting === player.id ? '#fff' : '#ffffffcc',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {player.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
