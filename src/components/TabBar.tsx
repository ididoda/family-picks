'use client'

type Tab = 'home' | 'weekly' | 'season'

type Props = {
  active: Tab
  onChange: (tab: Tab) => void
}

const tabs: { id: Tab; label: string }[] = [
  { id: 'home', label: 'Home' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'season', label: 'Season' },
]

export default function TabBar({ active, onChange }: Props) {
  return (
    <nav
      className="flex border-t"
      style={{ borderColor: 'rgba(255,255,255,0.08)', background: '#0f1729' }}
    >
      {tabs.map((tab) => {
        const isActive = tab.id === active
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className="flex-1 py-3 text-sm font-semibold uppercase tracking-widest transition-colors outline-none"
            style={{
              fontFamily: 'var(--font-barlow-condensed)',
              color: isActive ? '#C8102E' : 'rgba(255,255,255,0.4)',
              borderTop: isActive ? '2px solid #C8102E' : '2px solid transparent',
            }}
          >
            {tab.label}
          </button>
        )
      })}
    </nav>
  )
}
