'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getTeam } from '@/lib/teams'

type Player = { id: string; name: string }
type Game = { id: string; away_team: string; home_team: string; kickoff_time: string; status: string; winning_team: string | null }
type Pick = { player_id: string; game_id: string; picked_team: string }
type Week = { id: string; week_number: number; status: string }

type Props = {
  players: Player[]
  currentPlayerId: string
}

export default function WeeklyTab({ players, currentPlayerId }: Props) {
  const [weeks, setWeeks] = useState<Week[]>([])
  const [weekIndex, setWeekIndex] = useState(0)
  const [games, setGames] = useState<Game[]>([])
  const [picks, setPicks] = useState<Pick[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadWeeks() {
      const { data: activeSeason } = await supabase
        .from('seasons')
        .select('id')
        .eq('is_active', true)
        .single()

      if (!activeSeason) { setLoading(false); return }

      const { data } = await supabase
        .from('weeks')
        .select('id, week_number, status')
        .eq('season_id', activeSeason.id)
        .order('week_number')

      const allWeeks = data ?? []
      setWeeks(allWeeks)

      // Default to most recent week
      if (allWeeks.length) setWeekIndex(allWeeks.length - 1)
    }

    loadWeeks()
  }, [])

  useEffect(() => {
    if (!weeks.length) return
    const week = weeks[weekIndex]
    if (!week) return

    async function loadWeekData() {
      setLoading(true)
      const { data: weekGames } = await supabase
        .from('games')
        .select('id, away_team, home_team, kickoff_time, status, winning_team')
        .eq('week_id', week.id)
        .order('kickoff_time')

      const gameList = weekGames ?? []
      setGames(gameList)

      if (gameList.length) {
        const { data: weekPicks } = await supabase
          .from('picks')
          .select('player_id, game_id, picked_team')
          .in('game_id', gameList.map((g) => g.id))
        setPicks(weekPicks ?? [])
      } else {
        setPicks([])
      }
      setLoading(false)
    }

    loadWeekData()
  }, [weeks, weekIndex])

  function isVisible(game: Game) {
    return new Date(game.kickoff_time) <= new Date() || game.status !== 'scheduled'
  }

  function getPickForPlayer(playerId: string, gameId: string) {
    return picks.find((p) => p.player_id === playerId && p.game_id === gameId)
  }

  function getCellStyle(pick: Pick | undefined, game: Game, playerId: string) {
    const visible = isVisible(game)
    if (!visible) return { bg: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.15)', text: '·' }
    if (!pick) return { bg: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.2)', text: '—' }
    if (!game.winning_team) return { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)', text: pick.picked_team }
    const correct = pick.picked_team === game.winning_team
    return {
      bg: correct ? 'rgba(74,222,128,0.15)' : 'rgba(200,16,46,0.15)',
      color: correct ? '#4ade80' : '#C8102E',
      text: pick.picked_team,
    }
  }

  // Weekly winner: player with most correct picks this week
  const weeklyScores = players.map((player) => {
    const correct = games.filter((game) => {
      if (!game.winning_team) return false
      const pick = getPickForPlayer(player.id, game.id)
      return pick?.picked_team === game.winning_team
    }).length
    return { player, correct }
  })
  const maxCorrect = Math.max(...weeklyScores.map((s) => s.correct))
  const winners = weeklyScores.filter((s) => s.correct === maxCorrect && maxCorrect > 0)
  const currentWeek = weeks[weekIndex]
  const weekComplete = currentWeek?.status === 'complete'

  if (!weeks.length && !loading) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-6 text-center gap-3">
        <p
          className="text-xl font-bold uppercase tracking-widest"
          style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.3)' }}
        >
          No weeks yet
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 py-4">
      {/* Week selector */}
      <div className="flex items-center justify-between px-4">
        <button
          onClick={() => setWeekIndex((i) => Math.max(0, i - 1))}
          disabled={weekIndex === 0}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-60 disabled:opacity-20"
          style={{ background: '#1a2540', color: '#fff' }}
        >
          ‹
        </button>
        <p
          className="text-xl font-extrabold uppercase tracking-widest"
          style={{ fontFamily: 'var(--font-barlow-condensed)', color: '#fff' }}
        >
          Week {currentWeek?.week_number ?? '—'}
        </p>
        <button
          onClick={() => setWeekIndex((i) => Math.min(weeks.length - 1, i + 1))}
          disabled={weekIndex === weeks.length - 1}
          className="w-9 h-9 rounded-full flex items-center justify-center transition-opacity active:opacity-60 disabled:opacity-20"
          style={{ background: '#1a2540', color: '#fff' }}
        >
          ›
        </button>
      </div>

      {/* Weekly winner banner */}
      {weekComplete && winners.length > 0 && (
        <div
          className="mx-4 rounded-xl px-4 py-3"
          style={{ background: 'rgba(212,175,55,0.12)', border: '1px solid rgba(212,175,55,0.3)' }}
        >
          <p
            className="text-xs uppercase tracking-widest font-semibold mb-0.5"
            style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(212,175,55,0.7)' }}
          >
            Week {currentWeek.week_number} Winner
          </p>
          <p
            className="text-2xl font-extrabold uppercase tracking-wide"
            style={{ fontFamily: 'var(--font-barlow-condensed)', color: '#d4af37' }}
          >
            {winners.map((w) => w.player.name).join(' · ')}
          </p>
          <p
            className="text-sm font-semibold"
            style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(212,175,55,0.6)' }}
          >
            {maxCorrect} correct
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
        </div>
      ) : (
        /* Picks grid */
        <div className="overflow-x-auto">
          <table className="border-collapse" style={{ minWidth: 'max-content' }}>
            <thead>
              <tr>
                {/* Sticky player name header */}
                <th
                  className="sticky left-0 z-10 px-4 py-2 text-left text-xs uppercase tracking-widest font-semibold"
                  style={{
                    fontFamily: 'var(--font-barlow-condensed)',
                    color: 'rgba(255,255,255,0.3)',
                    background: '#0f1729',
                    minWidth: '90px',
                  }}
                >
                  Player
                </th>
                {games.map((game) => (
                  <th
                    key={game.id}
                    className="px-1 py-2 text-center"
                    style={{ minWidth: '48px' }}
                  >
                    <div
                      className="text-xs font-bold uppercase"
                      style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.4)' }}
                    >
                      {game.away_team}
                    </div>
                    <div
                      className="text-xs"
                      style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.2)' }}
                    >
                      @{game.home_team}
                    </div>
                  </th>
                ))}
                {/* Score column */}
                <th
                  className="px-3 py-2 text-center text-xs uppercase tracking-widest font-semibold"
                  style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.3)', minWidth: '48px' }}
                >
                  Score
                </th>
              </tr>
            </thead>
            <tbody>
              {players.map((player) => {
                const score = weeklyScores.find((s) => s.player.id === player.id)?.correct ?? 0
                const isMe = player.id === currentPlayerId
                const isWinner = weekComplete && winners.some((w) => w.player.id === player.id)

                return (
                  <tr key={player.id}>
                    {/* Sticky name cell */}
                    <td
                      className="sticky left-0 z-10 px-4 py-1.5 font-semibold uppercase tracking-wide text-sm"
                      style={{
                        fontFamily: 'var(--font-barlow-condensed)',
                        color: isWinner ? '#d4af37' : isMe ? '#fff' : 'rgba(255,255,255,0.7)',
                        background: '#0f1729',
                        borderRight: '1px solid rgba(255,255,255,0.06)',
                      }}
                    >
                      {isWinner ? '★ ' : ''}{player.name}
                    </td>

                    {/* Pick cells */}
                    {games.map((game) => {
                      const pick = getPickForPlayer(player.id, game.id)
                      const cell = getCellStyle(pick, game, player.id)
                      return (
                        <td key={game.id} className="px-1 py-1">
                          <div
                            className="flex items-center justify-center rounded text-xs font-bold uppercase mx-auto"
                            style={{
                              fontFamily: 'var(--font-barlow-condensed)',
                              background: cell.bg,
                              color: cell.color,
                              width: '40px',
                              height: '28px',
                              fontSize: '0.7rem',
                            }}
                          >
                            {cell.text}
                          </div>
                        </td>
                      )
                    })}

                    {/* Score cell */}
                    <td className="px-3 py-1 text-center">
                      <span
                        className="font-bold text-sm"
                        style={{
                          fontFamily: 'var(--font-barlow-condensed)',
                          color: isWinner ? '#d4af37' : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        {games.some((g) => g.winning_team) ? score : '—'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
