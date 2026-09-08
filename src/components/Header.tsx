'use client'

type Props = {
  playerName: string
  isCommissioner?: boolean
  onPlayerClick: () => void
}

export default function Header({ playerName, isCommissioner, onPlayerClick }: Props) {
  return (
    <header
      className="flex items-center justify-between px-4 py-3 border-b"
      style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0f1729' }}
    >
      <h1
        className="text-xl font-extrabold tracking-widest uppercase"
        style={{ fontFamily: 'var(--font-barlow-condensed)', color: '#C8102E' }}
      >
        Family Picks
      </h1>
      <div className="flex items-center gap-2">
      {isCommissioner && (
        <a
          href="/commissioner"
          aria-label="Commissioner"
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm transition-opacity active:opacity-60"
          style={{
            background: '#1a2540',
            border: '1px solid rgba(255,255,255,0.12)',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          ⚙
        </a>
      )}
      <button
        onClick={onPlayerClick}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold uppercase tracking-wide transition-opacity active:opacity-70"
        style={{
          fontFamily: 'var(--font-barlow-condensed)',
          background: '#1a2540',
          border: '1px solid rgba(255,255,255,0.12)',
          color: '#ffffffcc',
        }}
      >
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
          style={{ background: '#C8102E', color: '#fff' }}
        >
          {playerName[0]}
        </span>
        {playerName}
      </button>
      </div>
    </header>
  )
}
