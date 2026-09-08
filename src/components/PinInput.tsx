'use client'

import { useEffect, useRef, useState } from 'react'

type Props = {
  onComplete: (pin: string) => void
  disabled?: boolean
  error?: boolean
  autoFocus?: boolean
}

// 4-digit PIN entry. Clears and refocuses whenever it remounts, so parents
// force a fresh entry after a failed attempt with a changing `key`.
export default function PinInput({ onComplete, disabled, error, autoFocus = true }: Props) {
  const [digits, setDigits] = useState(['', '', '', ''])
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ]

  useEffect(() => {
    if (autoFocus) refs[0].current?.focus()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFocus])

  function set(i: number, val: string) {
    if (!/^\d?$/.test(val)) return
    const next = [...digits]
    next[i] = val
    setDigits(next)
    if (val && i < 3) refs[i + 1].current?.focus()
    if (next.every((d) => d !== '')) onComplete(next.join(''))
  }

  function onKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) refs[i - 1].current?.focus()
  }

  return (
    <div className="flex gap-3">
      {digits.map((d, i) => (
        <input
          key={i}
          ref={refs[i]}
          type="tel"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={(e) => set(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          disabled={disabled}
          className="w-14 h-16 text-center text-2xl font-bold rounded-xl outline-none transition-all"
          style={{
            fontFamily: 'var(--font-barlow-condensed)',
            background: '#1a2540',
            color: '#fff',
            border: error ? '2px solid #C8102E' : '2px solid rgba(255,255,255,0.12)',
          }}
        />
      ))}
    </div>
  )
}
