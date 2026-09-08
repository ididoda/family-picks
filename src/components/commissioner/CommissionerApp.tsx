'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getTeam } from '@/lib/teams'
import { getStoredPlayerId } from '@/lib/player'

type Player = { id: string; name: string; is_active: boolean; hasPin: boolean; locked: boolean }
type Game = { id: string; away_team: string; home_team: string; kickoff_time: string; status: string; winning_team: string | null }
type Week = { id: string; week_number: number; status: string; season_id: string }
type Pick = { player_id: string; game_id: string; picked_team: string; submitted_at: string }
type Section = 'results' | 'weeks' | 'players' | 'picks' | 'submissions' | 'backup'

export default function CommissionerApp() {
  const [section, setSection] = useState<Section>('results')
  const [players, setPlayers] = useState<Player[]>([])
  const [weeks, setWeeks] = useState<Week[]>([])
  const [currentWeek, setCurrentWeek] = useState<Week | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [picks, setPicks] = useState<Pick[]>([])
  const [seasonId, setSeasonId] = useState<string | null>(null)
  const [saving, setSaving] = useState<string | null>(null)
  const [newPlayerName, setNewPlayerName] = useState('')
  const [espnStatus, setEspnStatus] = useState<string | null>(null)
  const [espnLoading, setEspnLoading] = useState<'fetch' | 'sync' | 'insights' | null>(null)

  // Manual pick entry
  const [entryWeekId, setEntryWeekId] = useState<string | null>(null)
  const [entryPlayerId, setEntryPlayerId] = useState<string | null>(null)
  const [entryGames, setEntryGames] = useState<Game[]>([])
  const [entryPicks, setEntryPicks] = useState<Record<string, string>>({})
  const [entrySaving, setEntrySaving] = useState<string | null>(null)

  useEffect(() => { loadAll() }, [])

  async function loadPlayers() {
    const res = await fetch('/api/commissioner/players')
    const data = await res.json()
    if (Array.isArray(data)) setPlayers(data)
  }

  async function loadAll() {
    const { data: season } = await supabase.from('seasons').select('id').eq('is_active', true).single()
    if (!season) return
    setSeasonId(season.id)

    const [, { data: allWeeks }] = await Promise.all([
      loadPlayers(),
      supabase.from('weeks').select('id, week_number, status, season_id').eq('season_id', season.id).order('week_number'),
    ])

    setWeeks(allWeeks ?? [])

    // Default to the current week: earliest not yet complete, else the last one
    const weeksList = allWeeks ?? []
    const current = weeksList.find((w) => w.status !== 'complete') ?? weeksList.at(-1) ?? null
    setCurrentWeek(current)
    if (current) loadWeekData(current.id)
  }

  async function loadWeekData(weekId: string) {
    const { data: weekGames } = await supabase
      .from('games').select('id, away_team, home_team, kickoff_time, status, winning_team')
      .eq('week_id', weekId).order('kickoff_time')
    setGames(weekGames ?? [])

    if ((weekGames ?? []).length) {
      const { data: weekPicks } = await supabase
        .from('picks').select('player_id, game_id, picked_team, submitted_at')
        .in('game_id', (weekGames ?? []).map((g) => g.id))
      setPicks(weekPicks ?? [])
    } else {
      setPicks([])
    }
  }

  async function setResult(gameId: string, winner: string) {
    setSaving(gameId)
    await supabase.from('games').update({ winning_team: winner, status: 'final' }).eq('id', gameId)
    setGames((prev) => prev.map((g) => g.id === gameId ? { ...g, winning_team: winner, status: 'final' } : g))
    setSaving(null)
  }

  async function clearResult(gameId: string) {
    setSaving(gameId)
    await supabase.from('games').update({ winning_team: null, status: 'scheduled' }).eq('id', gameId)
    setGames((prev) => prev.map((g) => g.id === gameId ? { ...g, winning_team: null, status: 'scheduled' } : g))
    setSaving(null)
  }

  async function createWeek() {
    if (!seasonId) return
    const nextNum = (weeks.at(-1)?.week_number ?? 0) + 1
    const { data } = await supabase.from('weeks').insert({ season_id: seasonId, week_number: nextNum, status: 'open' }).select().single()
    if (data) { setWeeks((prev) => [...prev, data]); setCurrentWeek(data); setGames([]); setPicks([]) }
  }

  async function markWeekComplete() {
    if (!currentWeek) return
    await supabase.from('weeks').update({ status: 'complete' }).eq('id', currentWeek.id)
    setCurrentWeek({ ...currentWeek, status: 'complete' })
    setWeeks((prev) => prev.map((w) => w.id === currentWeek.id ? { ...w, status: 'complete' } : w))
  }

  async function playerAction(body: Record<string, unknown>) {
    const res = await fetch('/api/commissioner/players', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    await loadPlayers()
    return res.ok
  }

  async function togglePlayer(player: Player) {
    setPlayers((prev) => prev.map((p) => p.id === player.id ? { ...p, is_active: !p.is_active } : p))
    await playerAction({ action: 'toggle', playerId: player.id })
  }

  const [confirmResetId, setConfirmResetId] = useState<string | null>(null)

  async function resetPin(player: Player) {
    if (confirmResetId !== player.id) {
      setConfirmResetId(player.id)
      return
    }
    setConfirmResetId(null)
    setPlayers((prev) => prev.map((p) => p.id === player.id ? { ...p, hasPin: false, locked: false } : p))
    await playerAction({ action: 'reset-pin', playerId: player.id })
  }

  async function fetchSchedule() {
    if (!currentWeek) return
    setEspnLoading('fetch')
    setEspnStatus(null)
    try {
      const res = await fetch('/api/commissioner/fetch-schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekId: currentWeek.id, weekNumber: currentWeek.week_number, year: 2026 }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setEspnStatus(`✓ Added ${data.added} of ${data.total} games`)
      await loadWeekData(currentWeek.id)
    } catch (e) {
      setEspnStatus(`Error: ${(e as Error).message}`)
    }
    setEspnLoading(null)
  }

  async function syncResults() {
    if (!currentWeek) return
    setEspnLoading('sync')
    setEspnStatus(null)
    try {
      const res = await fetch('/api/commissioner/sync-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekId: currentWeek.id, weekNumber: currentWeek.week_number, year: 2026 }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setEspnStatus(`✓ Synced ${data.updated} of ${data.total} games`)
      await loadWeekData(currentWeek.id)
    } catch (e) {
      setEspnStatus(`Error: ${(e as Error).message}`)
    }
    setEspnLoading(null)
  }

  async function refreshInsights() {
    if (!currentWeek) return
    setEspnLoading('insights')
    setEspnStatus(null)
    try {
      const res = await fetch('/api/commissioner/refresh-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekId: currentWeek.id }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setEspnStatus(`✓ Insights: ${data.updated} games, ${data.withOdds} with odds`)
    } catch (e) {
      setEspnStatus(`Error: ${(e as Error).message}`)
    }
    setEspnLoading(null)
  }

  async function addPlayer() {
    const name = newPlayerName.trim()
    if (!name) return
    setNewPlayerName('')
    await playerAction({ action: 'add', name })
  }

  // --- Manual pick entry ---
  async function loadEntry(weekId: string, playerId: string) {
    const { data: weekGames } = await supabase
      .from('games').select('id, away_team, home_team, kickoff_time, status, winning_team')
      .eq('week_id', weekId).order('kickoff_time')
    setEntryGames(weekGames ?? [])

    const ids = (weekGames ?? []).map((g) => g.id)
    if (!ids.length) { setEntryPicks({}); return }
    const { data: rows } = await supabase
      .from('picks').select('game_id, picked_team').eq('player_id', playerId).in('game_id', ids)
    const map: Record<string, string> = {}
    for (const r of rows ?? []) map[r.game_id] = r.picked_team
    setEntryPicks(map)
  }

  function selectEntryWeek(weekId: string) {
    setEntryWeekId(weekId)
    if (entryPlayerId) loadEntry(weekId, entryPlayerId)
    else { setEntryGames([]); setEntryPicks({}) }
  }

  function selectEntryPlayer(playerId: string) {
    setEntryPlayerId(playerId)
    if (entryWeekId) loadEntry(entryWeekId, playerId)
  }

  async function setEntryPick(gameId: string, team: string) {
    if (!entryPlayerId) return
    setEntrySaving(gameId)
    const current = entryPicks[gameId]
    const clear = current === team // tap the current pick to clear it

    setEntryPicks((prev) => {
      const n = { ...prev }
      if (clear) delete n[gameId]
      else n[gameId] = team
      return n
    })

    await fetch('/api/commissioner/pick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId: entryPlayerId, gameId, team: clear ? null : team }),
    })
    setEntrySaving(null)
  }

  async function downloadCsv() {
    const playerId = getStoredPlayerId()
    if (!playerId) return
    const res = await fetch('/api/commissioner/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ playerId }),
    })
    if (!res.ok) return
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `family-picks-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const sections: { id: Section; label: string }[] = [
    { id: 'results', label: 'Results' },
    { id: 'weeks', label: 'Weeks' },
    { id: 'players', label: 'Players' },
    { id: 'picks', label: 'Enter Picks' },
    { id: 'submissions', label: 'Submissions' },
    { id: 'backup', label: 'Backup' },
  ]

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b flex-shrink-0"
        style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0f1729' }}
      >
        <h1 className="text-xl font-extrabold uppercase tracking-widest" style={{ fontFamily: 'var(--font-barlow-condensed)', color: '#C8102E' }}>
          Commissioner
        </h1>
        <a href="/home" className="text-xs uppercase tracking-widest font-semibold" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-barlow-condensed)' }}>
          ← Back
        </a>
      </div>

      {/* Section tabs */}
      <div className="flex border-b overflow-x-auto flex-shrink-0" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className="flex-1 py-2.5 text-xs font-semibold uppercase tracking-widest whitespace-nowrap px-3 outline-none transition-colors"
            style={{
              fontFamily: 'var(--font-barlow-condensed)',
              color: section === s.id ? '#C8102E' : 'rgba(255,255,255,0.4)',
              borderBottom: section === s.id ? '2px solid #C8102E' : '2px solid transparent',
            }}
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">

        {/* RESULTS */}
        {section === 'results' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-widest font-semibold" style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.3)' }}>
              Week {currentWeek?.week_number ?? '—'} · ESPN
            </p>

            <div className="flex gap-2">
              <button
                onClick={fetchSchedule}
                disabled={!!espnLoading}
                className="flex-1 py-3 rounded-xl font-bold uppercase tracking-widest text-sm outline-none active:scale-95 transition-all disabled:opacity-50"
                style={{ fontFamily: 'var(--font-barlow-condensed)', background: '#1a2540', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {espnLoading === 'fetch' ? 'Fetching…' : 'Fetch Schedule'}
              </button>
              <button
                onClick={syncResults}
                disabled={!!espnLoading || games.length === 0}
                className="flex-1 py-3 rounded-xl font-bold uppercase tracking-widest text-sm outline-none active:scale-95 transition-all disabled:opacity-50"
                style={{ fontFamily: 'var(--font-barlow-condensed)', background: '#1a2540', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                {espnLoading === 'sync' ? 'Syncing…' : 'Sync Results'}
              </button>
            </div>

            <button
              onClick={refreshInsights}
              disabled={!!espnLoading || games.length === 0}
              className="py-3 rounded-xl font-bold uppercase tracking-widest text-sm outline-none active:scale-95 transition-all disabled:opacity-50"
              style={{ fontFamily: 'var(--font-barlow-condensed)', background: '#1a2540', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {espnLoading === 'insights' ? 'Refreshing…' : 'Refresh Odds & Insights'}
            </button>

            {espnStatus && (
              <p
                className="text-sm font-semibold text-center"
                style={{
                  fontFamily: 'var(--font-barlow-condensed)',
                  color: espnStatus.startsWith('✓') ? '#4ade80' : '#C8102E',
                }}
              >
                {espnStatus}
              </p>
            )}

            <p className="text-xs uppercase tracking-widest font-semibold" style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.3)' }}>
              Manual override · Set winning team
            </p>
            {games.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-barlow-condensed)' }}>No games this week.</p>
            )}
            {games.map((game) => (
              <div key={game.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex">
                  {[game.away_team, game.home_team].map((team, i) => {
                    const isWinner = game.winning_team === team
                    const isLoser = game.winning_team && game.winning_team !== team
                    return (
                      <button
                        key={team}
                        onClick={() => isWinner ? clearResult(game.id) : setResult(game.id, team)}
                        disabled={saving === game.id}
                        className="flex-1 flex flex-col items-center py-3 gap-0.5 transition-all active:scale-95 outline-none"
                        style={{
                          background: isWinner ? '#C8102E' : isLoser ? '#111827' : '#1a2540',
                          borderRight: i === 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                          opacity: isLoser ? 0.4 : 1,
                        }}
                      >
                        <span className="text-xl font-extrabold" style={{ fontFamily: 'var(--font-barlow-condensed)', color: '#fff' }}>{team}</span>
                        <span className="text-xs" style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.5)' }}>{getTeam(team).name}</span>
                        <span className="text-xs" style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.25)', fontSize: '0.6rem' }}>{i === 0 ? 'AWAY' : 'HOME'}</span>
                      </button>
                    )
                  })}
                </div>
                {game.winning_team && (
                  <div className="text-center py-1 text-xs font-semibold uppercase tracking-widest" style={{ fontFamily: 'var(--font-barlow-condensed)', background: 'rgba(74,222,128,0.08)', color: '#4ade80' }}>
                    ✓ {game.winning_team} wins · tap to clear
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* WEEKS */}
        {section === 'weeks' && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              {weeks.map((week) => (
                <div key={week.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: '#1a2540' }}>
                  <span className="font-bold uppercase tracking-wide" style={{ fontFamily: 'var(--font-barlow-condensed)', color: '#fff' }}>
                    Week {week.week_number}
                  </span>
                  <span
                    className="text-xs font-semibold uppercase tracking-widest px-2 py-1 rounded-full"
                    style={{
                      fontFamily: 'var(--font-barlow-condensed)',
                      background: week.status === 'complete' ? 'rgba(74,222,128,0.1)' : 'rgba(200,16,46,0.1)',
                      color: week.status === 'complete' ? '#4ade80' : '#C8102E',
                    }}
                  >
                    {week.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              {currentWeek?.status === 'open' && (
                <button
                  onClick={markWeekComplete}
                  className="w-full py-3 rounded-xl font-bold uppercase tracking-widest text-sm outline-none active:scale-95 transition-all"
                  style={{ fontFamily: 'var(--font-barlow-condensed)', background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}
                >
                  Mark Week {currentWeek.week_number} Complete
                </button>
              )}
              <button
                onClick={createWeek}
                className="w-full py-3 rounded-xl font-bold uppercase tracking-widest text-sm outline-none active:scale-95 transition-all"
                style={{ fontFamily: 'var(--font-barlow-condensed)', background: '#1a2540', color: 'rgba(255,255,255,0.6)', border: '1px solid rgba(255,255,255,0.1)' }}
              >
                + Create Week {(weeks.at(-1)?.week_number ?? 0) + 1}
              </button>
            </div>
          </div>
        )}

        {/* PLAYERS */}
        {section === 'players' && (
          <div className="flex flex-col gap-4">
            <div className="rounded-xl overflow-hidden" style={{ background: '#1a2540' }}>
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                {players.map((player) => (
                  <div key={player.id} className="flex items-center justify-between px-4 py-3 gap-2">
                    <div className="flex flex-col min-w-0">
                      <span
                        className="font-semibold uppercase tracking-wide text-sm truncate"
                        style={{ fontFamily: 'var(--font-barlow-condensed)', color: player.is_active ? '#fff' : 'rgba(255,255,255,0.3)' }}
                      >
                        {player.name}
                      </span>
                      <span
                        className="text-[0.6rem] uppercase tracking-widest"
                        style={{
                          fontFamily: 'var(--font-barlow-condensed)',
                          color: player.locked ? '#C8102E' : player.hasPin ? 'rgba(74,222,128,0.7)' : 'rgba(255,255,255,0.3)',
                        }}
                      >
                        {player.locked ? 'PIN locked' : player.hasPin ? 'PIN set' : 'no PIN yet'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(player.hasPin || player.locked) && (
                        <button
                          onClick={() => resetPin(player)}
                          className="text-[0.6rem] font-bold uppercase tracking-widest px-2.5 py-1.5 rounded-full outline-none transition-all active:scale-95"
                          style={{
                            fontFamily: 'var(--font-barlow-condensed)',
                            background: confirmResetId === player.id ? '#C8102E' : 'rgba(255,255,255,0.06)',
                            color: confirmResetId === player.id ? '#fff' : 'rgba(255,255,255,0.5)',
                            border: '1px solid rgba(255,255,255,0.1)',
                          }}
                        >
                          {confirmResetId === player.id ? 'Confirm' : 'Reset PIN'}
                        </button>
                      )}
                      <button
                        onClick={() => togglePlayer(player)}
                        className="text-xs font-bold uppercase tracking-widest px-3 py-1.5 rounded-full outline-none transition-all active:scale-95"
                        style={{
                          fontFamily: 'var(--font-barlow-condensed)',
                          background: player.is_active ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.06)',
                          color: player.is_active ? '#4ade80' : 'rgba(255,255,255,0.3)',
                          border: `1px solid ${player.is_active ? 'rgba(74,222,128,0.3)' : 'rgba(255,255,255,0.1)'}`,
                        }}
                      >
                        {player.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New player name"
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPlayer()}
                className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: '#1a2540', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'var(--font-barlow-condensed)' }}
              />
              <button
                onClick={addPlayer}
                className="px-4 py-3 rounded-xl font-bold uppercase text-sm outline-none active:scale-95 transition-all"
                style={{ fontFamily: 'var(--font-barlow-condensed)', background: '#C8102E', color: '#fff' }}
              >
                Add
              </button>
            </div>
          </div>
        )}

        {/* ENTER PICKS (manual) */}
        {section === 'picks' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-widest font-semibold" style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.3)' }}>
              Enter or override a player&apos;s picks · works after kickoff
            </p>

            <div className="flex gap-2">
              <select
                value={entryWeekId ?? ''}
                onChange={(e) => selectEntryWeek(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#1a2540', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'var(--font-barlow-condensed)' }}
              >
                <option value="">Week…</option>
                {weeks.map((w) => (
                  <option key={w.id} value={w.id}>Week {w.week_number}</option>
                ))}
              </select>
              <select
                value={entryPlayerId ?? ''}
                onChange={(e) => selectEntryPlayer(e.target.value)}
                className="flex-1 px-3 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: '#1a2540', color: '#fff', border: '1px solid rgba(255,255,255,0.1)', fontFamily: 'var(--font-barlow-condensed)' }}
              >
                <option value="">Player…</option>
                {players.filter((p) => p.is_active).map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>

            {entryWeekId && entryPlayerId && (
              <p className="text-xs" style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.4)' }}>
                {Object.keys(entryPicks).length}/{entryGames.length} picked · tap a team to set, tap it again to clear
              </p>
            )}

            {entryWeekId && entryPlayerId && entryGames.map((game) => {
              const picked = entryPicks[game.id]
              return (
                <div key={game.id} className="rounded-xl overflow-hidden" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex">
                    {[game.away_team, game.home_team].map((team, i) => {
                      const isSel = picked === team
                      const isOther = picked && picked !== team
                      return (
                        <button
                          key={team}
                          onClick={() => setEntryPick(game.id, team)}
                          disabled={entrySaving === game.id}
                          className="flex-1 flex flex-col items-center py-3 gap-0.5 transition-all active:scale-95 outline-none"
                          style={{
                            background: isSel ? '#C8102E' : isOther ? '#111827' : '#1a2540',
                            borderRight: i === 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                            opacity: isOther ? 0.4 : 1,
                          }}
                        >
                          <span className="text-xl font-extrabold" style={{ fontFamily: 'var(--font-barlow-condensed)', color: '#fff' }}>{team}</span>
                          <span className="text-xs" style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.5)' }}>{getTeam(team).name}</span>
                          <span className="text-xs" style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.25)', fontSize: '0.6rem' }}>{i === 0 ? 'AWAY' : 'HOME'}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {entryWeekId && entryPlayerId && entryGames.length === 0 && (
              <p style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-barlow-condensed)' }}>No games in this week.</p>
            )}
          </div>
        )}

        {/* SUBMISSIONS */}
        {section === 'submissions' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-widest font-semibold" style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.3)' }}>
              Week {currentWeek?.week_number ?? '—'} · {picks.length} picks submitted
            </p>
            <div className="rounded-xl overflow-hidden" style={{ background: '#1a2540' }}>
              <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                {players.filter((p) => p.is_active).map((player) => {
                  const playerPicks = picks.filter((p) => p.player_id === player.id)
                  const done = playerPicks.length === games.length && games.length > 0
                  const lastPick = playerPicks.sort((a, b) => b.submitted_at.localeCompare(a.submitted_at))[0]
                  return (
                    <div key={player.id} className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold uppercase tracking-wide text-sm" style={{ fontFamily: 'var(--font-barlow-condensed)', color: '#fff' }}>
                          {player.name}
                        </span>
                        <span
                          className="text-xs font-bold uppercase tracking-widest"
                          style={{ fontFamily: 'var(--font-barlow-condensed)', color: done ? '#4ade80' : playerPicks.length > 0 ? '#d4af37' : 'rgba(255,255,255,0.3)' }}
                        >
                          {games.length === 0 ? '—' : `${playerPicks.length}/${games.length}`}
                        </span>
                      </div>
                      {lastPick && (
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-barlow-condensed)' }}>
                          Last pick {new Date(lastPick.submitted_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* BACKUP */}
        {section === 'backup' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs uppercase tracking-widest font-semibold" style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.3)' }}>
              Fail-safe records
            </p>

            <button
              onClick={downloadCsv}
              className="py-3 rounded-xl font-bold uppercase tracking-widest text-sm outline-none active:scale-95 transition-all"
              style={{ fontFamily: 'var(--font-barlow-condensed)', background: '#1a2540', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              Download all picks (CSV)
            </button>

            <p className="text-xs uppercase tracking-widest font-semibold pt-2" style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.3)' }}>
              Printable week summary (PDF)
            </p>
            <div className="flex flex-col gap-2">
              {weeks.map((w) => (
                <a
                  key={w.id}
                  href={`/commissioner/print?week=${w.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between rounded-xl px-4 py-3"
                  style={{ background: '#1a2540', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <span className="font-bold uppercase tracking-wide text-sm" style={{ fontFamily: 'var(--font-barlow-condensed)', color: '#fff' }}>
                    Week {w.week_number}
                  </span>
                  <span className="text-xs uppercase tracking-widest" style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.4)' }}>
                    open ↗
                  </span>
                </a>
              ))}
            </div>

            <p className="text-xs pt-1" style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.3)' }}>
              Every pick change is also logged automatically to an append-only audit table.
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
