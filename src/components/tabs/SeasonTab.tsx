'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Player = { id: string; name: string }
type Row = {
  player: Player
  wins: number
  losses: number
  total: number
  pct: string
  streak: number
  streakType: 'W' | 'L' | null
  weeklyWins: number[]
}

type Props = {
  players: Player[]
  currentPlayerId: string
}

export default function SeasonTab({ players, currentPlayerId }: Props) {
  const [rows, setRows] = useState<Row[]>([])
  const [weekCount, setWeekCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!players.length) return

    async function load() {
      setLoading(true)

      const { data: activeSeason } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_active', true)
        .single()

      if (!activeSeason) { setLoading(false); return }

      const { data: weeks } = await supabase
        .from('weeks')
        .select('id, week_number, status')
        .eq('season_id', activeSeason.id)
        .eq('status', 'complete')
        .order('week_number')

      const completedWeeks = weeks ?? []
      setWeekCount(completedWeeks.length)

      if (!completedWeeks.length) {
        setRows(players.map((player) => ({
          player,
          wins: 0,
          losses: 0,
          total: 0,
          pct: '—',
          streak: 0,
          streakType: null,
          weeklyWins: [],
        })))
        setLoading(false)
        return
      }

      const weekIds = completedWeeks.map((w) => w.id)

      const { data: games } = await supabase
        .from('games')
        .select('id, week_id, winning_team')
        .in('week_id', weekIds)
        .eq('status', 'final')

      const { data: picks } = await supabase
        .from('picks')
        .select('player_id, game_id, picked_team')
        .in('game_id', (games ?? []).map((g) => g.id))

      const gameMap = new Map((games ?? []).map((g) => [g.id, g]))

      const computed: Row[] = players.map((player) => {
        const myPicks = (picks ?? []).filter((p) => p.player_id === player.id)

        const weeklyWins = completedWeeks.map((week) => {
          const weekGameIds = new Set(
            (games ?? []).filter((g) => g.week_id === week.id).map((g) => g.id)
          )
          return myPicks.filter((p) => {
            const game = gameMap.get(p.game_id)
            return weekGameIds.has(p.game_id) && game?.winning_team === p.picked_team
          }).length
        })

        const wins = weeklyWins.reduce((a, b) => a + b, 0)
        const gamesPlayed = myPicks.filter((p) => gameMap.get(p.game_id)?.winning_team).length
        const losses = gamesPlayed - wins
        const pct = gamesPlayed > 0 ? ((wins / gamesPlayed) * 100).toFixed(0) + '%' : '—'

        // Streak: iterate weeks in reverse
        let streak = 0
        let streakType: 'W' | 'L' | null = null
        for (let i = weeklyWins.length - 1; i >= 0; i--) {
          const weekGames = (games ?? []).filter((g) => g.week_id === completedWeeks[i].id)
          const weekPicksForPlayer = myPicks.filter((p) => weekGames.some((g) => g.id === p.game_id))
          const weekWins = weeklyWins[i]
          const weekLosses = weekPicksForPlayer.filter((p) => {
            const game = gameMap.get(p.game_id)
            return game?.winning_team && game.winning_team !== p.picked_team
          }).length
          const thisType: 'W' | 'L' = weekWins > weekLosses ? 'W' : 'L'
          if (streakType === null) streakType = thisType
          if (thisType === streakType) streak++
          else break
        }

        return { player, wins, losses, total: gamesPlayed, pct, streak, streakType, weeklyWins }
      })

      computed.sort((a, b) => b.wins - a.wins || a.losses - b.losses)
      setRows(computed)
      setLoading(false)
    }

    load()
  }, [players])

  if (loading) {
    return (
      <div className="flex items-center justify-center flex-1">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
      </div>
    )
  }

  const leader = rows[0]
  const seasonStarted = weekCount > 0

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {/* Season leader callout */}
      {seasonStarted && leader && leader.wins > 0 && (
        <div
          className="rounded-xl px-4 py-3"
          style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }}
        >
          <p
            className="text-xs uppercase tracking-widest font-semibold mb-0.5"
            style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(212,175,55,0.7)' }}
          >
            Season Leader
          </p>
          <p
            className="text-2xl font-extrabold uppercase tracking-wide"
            style={{ fontFamily: 'var(--font-barlow-condensed)', color: '#d4af37' }}
          >
            {leader.player.name}
          </p>
          <p
            className="text-sm font-semibold"
            style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(212,175,55,0.6)' }}
          >
            {leader.wins}–{leader.losses} · {leader.pct}
          </p>
        </div>
      )}

      {/* Standings table */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#1a2540' }}>
        {/* Column headers */}
        <div
          className="flex items-center px-4 py-2 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <span
            className="flex-1 text-xs uppercase tracking-widest font-semibold"
            style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.3)' }}
          >
            Player
          </span>
          <span
            className="w-10 text-center text-xs uppercase tracking-widest font-semibold"
            style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.3)' }}
          >
            W
          </span>
          <span
            className="w-10 text-center text-xs uppercase tracking-widest font-semibold"
            style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.3)' }}
          >
            L
          </span>
          <span
            className="w-12 text-center text-xs uppercase tracking-widest font-semibold"
            style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.3)' }}
          >
            PCT
          </span>
          <span
            className="w-14 text-center text-xs uppercase tracking-widest font-semibold"
            style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.3)' }}
          >
            Streak
          </span>
        </div>

        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {rows.map((row, i) => {
            const isMe = row.player.id === currentPlayerId
            const isLeader = i === 0 && seasonStarted && row.wins > 0

            return (
              <div
                key={row.player.id}
                className="flex items-center px-4 py-3"
                style={{ background: isMe ? 'rgba(200,16,46,0.05)' : 'transparent' }}
              >
                <div className="flex-1 flex items-center gap-2">
                  <span
                    className="text-xs font-bold w-5 text-center"
                    style={{
                      fontFamily: 'var(--font-barlow-condensed)',
                      color: isLeader ? '#d4af37' : 'rgba(255,255,255,0.2)',
                    }}
                  >
                    {isLeader ? '★' : i + 1}
                  </span>
                  <span
                    className="font-semibold uppercase tracking-wide"
                    style={{
                      fontFamily: 'var(--font-barlow-condensed)',
                      color: isMe ? '#fff' : 'rgba(255,255,255,0.8)',
                      fontSize: '0.95rem',
                    }}
                  >
                    {row.player.name}
                    {isMe && (
                      <span className="ml-1 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        (you)
                      </span>
                    )}
                  </span>
                </div>
                <span
                  className="w-10 text-center font-bold text-sm"
                  style={{ fontFamily: 'var(--font-barlow-condensed)', color: seasonStarted ? '#4ade80' : 'rgba(255,255,255,0.2)' }}
                >
                  {seasonStarted ? row.wins : '—'}
                </span>
                <span
                  className="w-10 text-center font-bold text-sm"
                  style={{ fontFamily: 'var(--font-barlow-condensed)', color: seasonStarted ? '#C8102E' : 'rgba(255,255,255,0.2)' }}
                >
                  {seasonStarted ? row.losses : '—'}
                </span>
                <span
                  className="w-12 text-center text-sm font-semibold"
                  style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.5)' }}
                >
                  {row.pct}
                </span>
                <span
                  className="w-14 text-center text-sm font-bold"
                  style={{
                    fontFamily: 'var(--font-barlow-condensed)',
                    color: row.streakType === 'W' ? '#4ade80' : row.streakType === 'L' ? '#C8102E' : 'rgba(255,255,255,0.2)',
                  }}
                >
                  {row.streakType ? `${row.streak}${row.streakType}` : '—'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {!seasonStarted && (
        <p
          className="text-center text-sm"
          style={{ color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-barlow-condensed)' }}
        >
          Standings will appear after Week 1 is complete
        </p>
      )}
    </div>
  )
}
