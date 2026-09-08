'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getStoredPlayerId } from '@/lib/player'
import CommissionerApp from '@/components/commissioner/CommissionerApp'

type State = 'checking' | 'ok' | 'denied'

export default function Page() {
  const router = useRouter()
  const [state, setState] = useState<State>('checking')

  useEffect(() => {
    const playerId = getStoredPlayerId()
    if (!playerId) {
      router.replace('/')
      return
    }
    supabase
      .from('players')
      .select('is_commissioner')
      .eq('id', playerId)
      .single()
      .then(({ data }) => setState(data?.is_commissioner ? 'ok' : 'denied'))
  }, [router])

  if (state === 'checking') {
    return (
      <div className="flex items-center justify-center min-h-full">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
      </div>
    )
  }

  if (state === 'denied') {
    return (
      <div className="flex flex-col items-center justify-center min-h-full px-6 gap-4 text-center">
        <p
          className="text-2xl font-extrabold uppercase tracking-widest"
          style={{ fontFamily: 'var(--font-barlow-condensed)', color: '#C8102E' }}
        >
          Commissioner only
        </p>
        <a
          href="/home"
          className="text-xs uppercase tracking-widest font-semibold"
          style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.4)' }}
        >
          ← Back to picks
        </a>
      </div>
    )
  }

  return <CommissionerApp />
}
