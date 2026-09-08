'use client'

import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getTeam } from '@/lib/teams'

type Game = {
  id: string
  away_team: string
  home_team: string
  kickoff_time: string
  status: string
}

type Props = {
  open: boolean
  onClose: () => void
  weekNumber: number
  games: Game[]
  playerId: string
  existingPicks: Record<string, string> // game_id -> picked_team
  onPicksChange: (picks: Record<string, string>) => void
}

function formatKickoff(iso: string) {
  const d = new Date(iso)
  const day = d.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'America/New_York' })
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York' })
  return `${day} ${time} ET`
}

function groupBySlot(games: Game[]) {
  const slots: { label: string; games: Game[] }[] = []
  const seen = new Map<string, number>()

  for (const game of games) {
    const d = new Date(game.kickoff_time)
    const label = d.toLocaleDateString('en-US', {
      weekday: 'long', month: 'short', day: 'numeric', timeZone: 'America/New_York'
    }) + ' · ' + d.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', timeZone: 'America/New_York'
    }) + ' ET'

    if (!seen.has(label)) {
      seen.set(label, slots.length)
      slots.push({ label, games: [] })
    }
    slots[seen.get(label)!].games.push(game)
  }

  return slots
}

export default function PickPanel({
  open, onClose, weekNumber, games, playerId, existingPicks, onPicksChange,
}: Props) {
  const [picks, setPicks] = useState<Record<string, string>>(existingPicks)
  const [saving, setSaving] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const sheetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setPicks(existingPicks)
  }, [existingPicks])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  async function handlePick(gameId: string, team: string) {
    const isLocked = isGameLocked(games.find(g => g.id === gameId)!)
    if (isLocked || saving === gameId) return

    const prev = picks
    setSaving(gameId)
    const newPicks = { ...picks, [gameId]: team }
    setPicks(newPicks)
    onPicksChange(newPicks)

    const { error } = await supabase.from('picks').upsert(
      { player_id: playerId, game_id: gameId, picked_team: team, submitted_at: new Date().toISOString() },
      { onConflict: 'player_id,game_id' }
    )
    if (error) {
      setPicks(prev)
      onPicksChange(prev)
      setSaveError('Could not save that pick — try again.')
    } else {
      setSaveError(null)
    }
    setSaving(null)
  }

  function isGameLocked(game: Game) {
    return new Date(game.kickoff_time) <= new Date() || game.status !== 'scheduled'
  }

  const slots = groupBySlot(games)
  const pickCount = Object.keys(picks).length
  const total = games.length

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: 'rgba(0,0,0,0.6)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className="fixed left-0 right-0 bottom-0 z-50 flex flex-col rounded-t-2xl transition-transform duration-300 ease-out"
        style={{
          background: '#0f1729',
          maxHeight: '92vh',
          transform: open ? 'translateY(0)' : 'translateY(100%)',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full" style={{ background: 'rgba(255,255,255,0.2)' }} />
        </div>

        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 flex-shrink-0 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div>
            <p
              className="text-xs uppercase tracking-widest font-semibold"
              style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.4)' }}
            >
              Week {weekNumber}
            </p>
            <p
              className="text-xl font-extrabold uppercase tracking-wide leading-tight"
              style={{ fontFamily: 'var(--font-barlow-condensed)', color: '#fff' }}
            >
              Make Your Picks
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <span
                className="text-2xl font-extrabold"
                style={{ fontFamily: 'var(--font-barlow-condensed)', color: pickCount === total ? '#4ade80' : '#C8102E' }}
              >
                {pickCount}
              </span>
              <span
                className="text-sm font-semibold"
                style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.3)' }}
              >
                /{total}
              </span>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-lg transition-opacity active:opacity-60"
              style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1 flex-shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <div
            className="h-full transition-all duration-300"
            style={{
              width: total ? `${(pickCount / total) * 100}%` : '0%',
              background: pickCount === total ? '#4ade80' : '#C8102E',
            }}
          />
        </div>

        {saveError && (
          <div
            className="flex-shrink-0 px-4 py-2 text-center text-xs font-semibold uppercase tracking-widest"
            style={{ fontFamily: 'var(--font-barlow-condensed)', background: 'rgba(200,16,46,0.15)', color: '#C8102E' }}
          >
            {saveError}
          </div>
        )}

        {/* Game list */}
        <div className="overflow-y-auto flex-1 pb-6">
          {slots.map((slot) => (
            <div key={slot.label}>
              <p
                className="px-4 pt-4 pb-2 text-xs uppercase tracking-widest font-semibold sticky top-0"
                style={{
                  fontFamily: 'var(--font-barlow-condensed)',
                  color: 'rgba(255,255,255,0.35)',
                  background: '#0f1729',
                }}
              >
                {slot.label}
              </p>

              <div className="flex flex-col gap-2 px-4">
                {slot.games.map((game) => {
                  const locked = isGameLocked(game)
                  const picked = picks[game.id]
                  const isSaving = saving === game.id

                  return (
                    <div
                      key={game.id}
                      className="rounded-xl overflow-hidden"
                      style={{ border: '1px solid rgba(255,255,255,0.06)' }}
                    >
                      <div className="flex">
                        {[game.away_team, game.home_team].map((team, i) => {
                          const teamInfo = getTeam(team)
                          const isSelected = picked === team
                          const isOther = picked && picked !== team

                          return (
                            <button
                              key={team}
                              onClick={() => handlePick(game.id, team)}
                              disabled={locked || isSaving}
                              className="flex-1 flex flex-col items-center justify-center py-4 px-2 transition-all active:scale-95"
                              style={{
                                background: isSelected
                                  ? '#C8102E'
                                  : isOther
                                  ? '#111827'
                                  : '#1a2540',
                                borderRight: i === 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                                opacity: locked && !isSelected ? 0.4 : 1,
                              }}
                            >
                              <span
                                className="text-2xl font-extrabold tracking-wider"
                                style={{
                                  fontFamily: 'var(--font-barlow-condensed)',
                                  color: isSelected ? '#fff' : isOther ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.85)',
                                }}
                              >
                                {team}
                              </span>
                              <span
                                className="text-xs mt-0.5"
                                style={{
                                  fontFamily: 'var(--font-barlow-condensed)',
                                  color: isSelected ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.25)',
                                }}
                              >
                                {teamInfo.name}
                              </span>
                              <span
                                className="text-xs mt-1 font-semibold uppercase tracking-widest"
                                style={{
                                  fontFamily: 'var(--font-barlow-condensed)',
                                  color: isSelected ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.15)',
                                  fontSize: '0.6rem',
                                }}
                              >
                                {i === 0 ? 'away' : 'home'}
                              </span>
                            </button>
                          )
                        })}
                      </div>

                      {locked && (
                        <div
                          className="text-center py-1 text-xs font-semibold uppercase tracking-widest"
                          style={{
                            fontFamily: 'var(--font-barlow-condensed)',
                            background: 'rgba(255,255,255,0.04)',
                            color: 'rgba(255,255,255,0.25)',
                          }}
                        >
                          Locked
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
