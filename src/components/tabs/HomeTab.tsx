'use client'

type Player = { id: string; name: string }
type Game = { id: string }
type Pick = { player_id: string; game_id: string }
type Week = { id: string; week_number: number; status: string }

type Props = {
  currentPlayer: Player
  players: Player[]
  week: Week | null
  games: Game[]
  picks: Pick[]
  onMakePicks: () => void
}

export default function HomeTab({ currentPlayer, players, week, games, picks, onMakePicks }: Props) {
  const totalGames = games.length

  function pickCountForPlayer(playerId: string) {
    return picks.filter((p) => p.player_id === playerId).length
  }

  const myPickCount = pickCountForPlayer(currentPlayer.id)
  const myPicksDone = myPickCount === totalGames && totalGames > 0

  const weeklyScores = players.map((player) => {
    const playerPicks = picks.filter((p) => p.player_id === player.id)
    return { player, picks: playerPicks.length }
  })

  if (!week) {
    return (
      <div className="flex flex-col items-center justify-center flex-1 px-6 text-center gap-3">
        <p className="text-4xl">🏈</p>
        <p
          className="text-xl font-bold uppercase tracking-widest"
          style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.5)' }}
        >
          Season hasn't started yet
        </p>
        <p className="text-sm text-white/30">Check back when Week 1 opens</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {/* Week banner */}
      <div
        className="rounded-xl px-4 py-3 flex items-center justify-between"
        style={{ background: '#1a2540' }}
      >
        <div>
          <p
            className="text-xs uppercase tracking-widest font-semibold"
            style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.4)' }}
          >
            Current Week
          </p>
          <p
            className="text-2xl font-extrabold uppercase tracking-wide"
            style={{ fontFamily: 'var(--font-barlow-condensed)', color: '#fff' }}
          >
            Week {week.week_number}
          </p>
        </div>
        <span
          className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full"
          style={{
            background: week.status === 'open' ? 'rgba(200,16,46,0.2)' : 'rgba(255,255,255,0.08)',
            color: week.status === 'open' ? '#C8102E' : 'rgba(255,255,255,0.4)',
            border: `1px solid ${week.status === 'open' ? '#C8102E' : 'rgba(255,255,255,0.1)'}`,
            fontFamily: 'var(--font-barlow-condensed)',
          }}
        >
          {week.status === 'open' ? 'Picks Open' : 'Complete'}
        </span>
      </div>

      {/* Make Picks button */}
      {week.status === 'open' && (
        <button
          onClick={onMakePicks}
          className="w-full py-4 rounded-xl font-bold uppercase tracking-widest text-lg transition-all active:scale-95"
          style={{
            fontFamily: 'var(--font-barlow-condensed)',
            background: myPicksDone ? '#1a2540' : '#C8102E',
            color: myPicksDone ? 'rgba(255,255,255,0.4)' : '#fff',
            border: myPicksDone ? '1px solid rgba(255,255,255,0.1)' : 'none',
          }}
        >
          {myPicksDone
            ? `Picks In — ${myPickCount}/${totalGames}`
            : totalGames === 0
            ? 'Games Not Posted Yet'
            : `Make Picks — ${myPickCount}/${totalGames}`}
        </button>
      )}

      {/* Submission status strip */}
      <div className="rounded-xl overflow-hidden" style={{ background: '#1a2540' }}>
        <p
          className="px-4 pt-3 pb-2 text-xs uppercase tracking-widest font-semibold"
          style={{ fontFamily: 'var(--font-barlow-condensed)', color: 'rgba(255,255,255,0.4)' }}
        >
          This Week
        </p>
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          {players.map((player) => {
            const count = pickCountForPlayer(player.id)
            const done = count === totalGames && totalGames > 0
            const isMe = player.id === currentPlayer.id
            return (
              <div
                key={player.id}
                className="flex items-center justify-between px-4 py-2.5"
                style={{ background: isMe ? 'rgba(200,16,46,0.05)' : 'transparent' }}
              >
                <span
                  className="font-semibold text-sm uppercase tracking-wide"
                  style={{
                    fontFamily: 'var(--font-barlow-condensed)',
                    color: isMe ? '#fff' : 'rgba(255,255,255,0.7)',
                  }}
                >
                  {player.name}
                  {isMe && (
                    <span className="ml-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      (you)
                    </span>
                  )}
                </span>
                <span
                  className="text-xs font-bold uppercase tracking-wide"
                  style={{
                    fontFamily: 'var(--font-barlow-condensed)',
                    color: done ? '#4ade80' : totalGames === 0 ? 'rgba(255,255,255,0.2)' : '#C8102E',
                  }}
                >
                  {totalGames === 0 ? '—' : done ? `✓ In` : `${count}/${totalGames}`}
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
