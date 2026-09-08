'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getStoredPlayerId, setStoredPlayerId } from '@/lib/player'
import PinInput from './PinInput'

type PlayerSlot = { id: string; name: string; hasPin: boolean; locked: boolean }

export default function PlayerSelect() {
  const router = useRouter()
  const [slots, setSlots] = useState<PlayerSlot[]>([])
  const [selected, setSelected] = useState<PlayerSlot | null>(null)
  const [firstPin, setFirstPin] = useState<string | null>(null) // claim: value awaiting confirmation
  const [error, setError] = useState<string | null>(null)
  const [lockedMsg, setLockedMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [attempt, setAttempt] = useState(0) // bump to remount PinInput

  useEffect(() => {
    if (getStoredPlayerId()) {
      router.replace('/home')
      return
    }
    fetch('/api/players')
      .then((r) => r.json())
      .then((data) => Array.isArray(data) && setSlots(data))
      .catch(() => {})
  }, [router])

  const mode = selected && !selected.hasPin ? 'claim' : 'login'
  const claimStage = firstPin ? 'confirm' : 'create'

  const prompt = useMemo(() => {
    if (mode === 'login') return 'Enter your PIN'
    return claimStage === 'create' ? 'Create a 4-digit PIN' : 'Re-enter your PIN'
  }, [mode, claimStage])

  function pickName(slot: PlayerSlot) {
    if (slot.locked) return
    setSelected(slot)
    setFirstPin(null)
    setError(null)
    setLockedMsg(null)
    setAttempt((n) => n + 1)
  }

  function back() {
    setSelected(null)
    setFirstPin(null)
    setError(null)
    setLockedMsg(null)
  }

  async function submit(playerId: string, pin: string) {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId, pin }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && data.ok) {
        setStoredPlayerId(playerId)
        router.replace('/home')
        return
      }
      if (res.status === 423) {
        const until = data.lockedUntil ? new Date(data.lockedUntil) : null
        setLockedMsg(
          until
            ? `Too many tries. Locked until ${until.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}.`
            : 'Too many tries. Locked for a few minutes.'
        )
      } else if (data.error === 'wrong') {
        setError(
          data.attemptsLeft > 0 ? `Incorrect PIN — ${data.attemptsLeft} left` : 'Incorrect PIN'
        )
      } else {
        setError(data.error || 'Something went wrong')
      }
      setFirstPin(null)
      setAttempt((n) => n + 1)
    } catch {
      setError('Network error — try again')
      setAttempt((n) => n + 1)
    } finally {
      setBusy(false)
    }
  }

  function handlePin(pin: string) {
    if (!selected || busy) return

    if (mode === 'login') {
      submit(selected.id, pin)
      return
    }

    // claim: enter then confirm
    if (!firstPin) {
      setFirstPin(pin)
      setError(null)
      setAttempt((n) => n + 1)
      return
    }
    if (pin !== firstPin) {
      setError("PINs didn't match — start over")
      setFirstPin(null)
      setAttempt((n) => n + 1)
      return
    }
    submit(selected.id, pin)
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
          <p className="text-sm tracking-widest uppercase text-white/50">2026 NFL Season</p>
        </div>

        {!selected ? (
          <>
            <p
              className="text-center text-xl font-semibold tracking-wider uppercase mb-6 text-white/80"
              style={{ fontFamily: 'Barlow Condensed, sans-serif' }}
            >
              Who are you?
            </p>
            <div className="grid grid-cols-3 gap-3">
              {slots.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => pickName(slot)}
                  disabled={slot.locked}
                  className="py-4 rounded-xl font-semibold tracking-wide uppercase transition-all active:scale-95 disabled:opacity-40"
                  style={{
                    fontFamily: 'var(--font-barlow-condensed), sans-serif',
                    fontSize: '1.05rem',
                    background: '#1a2540',
                    color: '#ffffffcc',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  {slot.name}
                  {slot.locked && (
                    <span className="block text-[0.6rem] tracking-widest text-white/30">locked</span>
                  )}
                </button>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center gap-6">
            <button
              onClick={back}
              className="self-start text-xs uppercase tracking-widest font-semibold text-white/40"
              style={{ fontFamily: 'var(--font-barlow-condensed)' }}
            >
              ‹ Back
            </button>

            <p
              className="text-xl font-semibold tracking-wider uppercase text-white/80"
              style={{ fontFamily: 'var(--font-barlow-condensed)' }}
            >
              {selected.name}
            </p>
            <p
              className="text-sm uppercase tracking-widest text-white/40 -mt-3"
              style={{ fontFamily: 'var(--font-barlow-condensed)' }}
            >
              {prompt}
            </p>

            {lockedMsg ? (
              <p
                className="text-sm font-semibold uppercase tracking-wider text-center"
                style={{ fontFamily: 'var(--font-barlow-condensed)', color: '#C8102E' }}
              >
                {lockedMsg}
              </p>
            ) : (
              <PinInput
                key={attempt}
                onComplete={handlePin}
                disabled={busy}
                error={!!error}
              />
            )}

            {error && (
              <p
                className="text-sm font-semibold uppercase tracking-widest"
                style={{ fontFamily: 'var(--font-barlow-condensed)', color: '#C8102E' }}
              >
                {error}
              </p>
            )}
            {mode === 'claim' && !error && !lockedMsg && (
              <p className="text-xs text-white/30 text-center">
                This PIN is how you sign in on another phone. Pick something you&apos;ll remember.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
