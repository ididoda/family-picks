'use client'

import { useState, useRef, useEffect } from 'react'

type Props = { onUnlock: () => void }

export default function PinGate({ onUnlock }: Props) {
  const [digits, setDigits] = useState(['', '', '', ''])
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  useEffect(() => { refs[0].current?.focus() }, [])

  async function handleChange(i: number, val: string) {
    if (!/^\d?$/.test(val)) return
    const next = [...digits]
    next[i] = val
    setDigits(next)
    setError(false)

    if (val && i < 3) {
      refs[i + 1].current?.focus()
    }

    if (next.every((d) => d !== '') && val) {
      await submit(next.join(''))
    }
  }

  async function handleKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs[i - 1].current?.focus()
    }
  }

  async function submit(pin: string) {
    setLoading(true)
    const res = await fetch('/api/commissioner', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin }),
    })
    if (res.ok) {
      sessionStorage.setItem('commissioner', '1')
      onUnlock()
    } else {
      setError(true)
      setDigits(['', '', '', ''])
      setTimeout(() => refs[0].current?.focus(), 50)
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-full px-6 gap-8">
      <div className="text-center">
        <h1
          className="text-4xl font-extrabold uppercase tracking-widest"
          style={{ fontFamily: 'var(--font-barlow-condensed)', color: '#C8102E' }}
        >
          Commissioner
        </h1>
        <p className="text-sm uppercase tracking-widest mt-1" style={{ color: 'rgba(255,255,255,0.3)' }}>
          Enter PIN to continue
        </p>
      </div>

      <div className="flex gap-3">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={refs[i]}
            type="tel"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            className="w-14 h-16 text-center text-2xl font-bold rounded-xl outline-none transition-all"
            style={{
              fontFamily: 'var(--font-barlow-condensed)',
              background: '#1a2540',
              color: '#fff',
              border: error ? '2px solid #C8102E' : '2px solid rgba(255,255,255,0.12)',
            }}
            disabled={loading}
          />
        ))}
      </div>

      {error && (
        <p
          className="text-sm font-semibold uppercase tracking-widest"
          style={{ color: '#C8102E', fontFamily: 'var(--font-barlow-condensed)' }}
        >
          Incorrect PIN
        </p>
      )}
    </div>
  )
}
