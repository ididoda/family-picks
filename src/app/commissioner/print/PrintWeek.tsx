'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getStoredPlayerId } from '@/lib/player'

type Player = { id: string; name: string }
type Game = { id: string; away_team: string; home_team: string; kickoff_time: string; winning_team: string | null }
type Pick = { player_id: string; game_id: string; picked_team: string }

type State = 'checking' | 'denied' | 'ready'

export default function PrintWeek() {
  const params = useSearchParams()
  const weekId = params.get('week')

  const [state, setState] = useState<State>('checking')
  const [weekNumber, setWeekNumber] = useState<number | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [games, setGames] = useState<Game[]>([])
  const [picks, setPicks] = useState<Pick[]>([])

  useEffect(() => {
    const playerId = getStoredPlayerId()
    if (!playerId || !weekId) {
      setState('denied')
      return
    }

    async function load() {
      const { data: caller } = await supabase
        .from('players')
        .select('is_commissioner')
        .eq('id', playerId as string)
        .maybeSingle()
      if (!caller?.is_commissioner) {
        setState('denied')
        return
      }

      const [{ data: wk }, { data: allPlayers }, { data: weekGames }] = await Promise.all([
        supabase.from('weeks').select('week_number').eq('id', weekId as string).single(),
        supabase.from('players').select('id, name').eq('is_active', true).order('created_at').order('name'),
        supabase
          .from('games')
          .select('id, away_team, home_team, kickoff_time, winning_team')
          .eq('week_id', weekId as string)
          .order('kickoff_time'),
      ])

      setWeekNumber(wk?.week_number ?? null)
      setPlayers(allPlayers ?? [])
      const gs = weekGames ?? []
      setGames(gs)

      if (gs.length) {
        const { data: p } = await supabase
          .from('picks')
          .select('player_id, game_id, picked_team')
          .in('game_id', gs.map((g) => g.id))
        setPicks(p ?? [])
      }
      setState('ready')
    }

    load()
  }, [weekId])

  if (state === 'checking') return null
  if (state === 'denied') {
    return (
      <div style={{ padding: 24, fontFamily: 'system-ui', color: '#111' }}>
        Commissioner only, or no week specified. <a href="/commissioner">Back</a>
      </div>
    )
  }

  const scoreFor = (playerId: string) =>
    games.filter((g) => {
      if (!g.winning_team) return false
      const pk = picks.find((p) => p.player_id === playerId && p.game_id === g.id)
      return pk?.picked_team === g.winning_team
    }).length

  const anyScored = games.some((g) => g.winning_team)
  const scored = players.map((p) => ({ p, s: scoreFor(p.id) }))
  const max = Math.max(0, ...scored.map((x) => x.s))
  const winners = anyScored && max > 0 ? scored.filter((x) => x.s === max).map((x) => x.p.name) : []

  return (
    <div className="print-root">
      <style>{`
        .print-root { background: #fff; color: #111; padding: 24px; font-family: system-ui, sans-serif; }
        .print-root h1 { font-size: 20px; margin: 0 0 2px; }
        .print-root .meta { color: #666; font-size: 12px; margin-bottom: 16px; }
        .print-root table { border-collapse: collapse; font-size: 12px; }
        .print-root th, .print-root td { border: 1px solid #ccc; padding: 4px 6px; text-align: center; white-space: nowrap; }
        .print-root th.name, .print-root td.name { text-align: left; font-weight: 600; }
        .print-root td.correct { background: #d9f5df; color: #137333; }
        .print-root td.wrong { background: #fddcdc; color: #b00020; }
        .print-root .btn { margin-bottom: 16px; padding: 8px 14px; font-size: 13px; border: 1px solid #999; border-radius: 6px; background: #f3f3f3; cursor: pointer; }
        @media print { .no-print { display: none !important; } .print-root { padding: 0; } }
      `}</style>

      <button className="btn no-print" onClick={() => window.print()}>
        Print / Save as PDF
      </button>

      <h1>Family Picks — Week {weekNumber ?? '—'}</h1>
      <div className="meta">
        Generated {new Date().toLocaleString('en-US')}
        {winners.length > 0 && ` · Winner: ${winners.join(', ')} (${max} correct)`}
      </div>

      <table>
        <thead>
          <tr>
            <th className="name">Player</th>
            <th>W</th>
            {games.map((g) => (
              <th key={g.id}>
                {g.away_team}
                <br />@{g.home_team}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {players.map((player) => (
            <tr key={player.id}>
              <td className="name">
                {winners.includes(player.name) ? '★ ' : ''}
                {player.name}
              </td>
              <td>{anyScored ? scoreFor(player.id) : '—'}</td>
              {games.map((g) => {
                const pk = picks.find((p) => p.player_id === player.id && p.game_id === g.id)
                const cls = !g.winning_team || !pk
                  ? ''
                  : pk.picked_team === g.winning_team
                    ? 'correct'
                    : 'wrong'
                return (
                  <td key={g.id} className={cls}>
                    {pk?.picked_team ?? '—'}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
