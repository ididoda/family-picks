'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { getStoredPlayerId, clearStoredPlayerId } from '@/lib/player'
import Header from './Header'
import TabBar from './TabBar'
import HomeTab from './tabs/HomeTab'
import WeeklyTab from './tabs/WeeklyTab'
import SeasonTab from './tabs/SeasonTab'
import PickPanel from './PickPanel'

type Tab = 'home' | 'weekly' | 'season'
type Player = { id: string; name: string }
type Game = { id: string; away_team: string; home_team: string; kickoff_time: string; status: string }
type Pick = { player_id: string; game_id: string; picked_team: string }
type Week = { id: string; week_number: number; status: string }

export default function HomeApp() {
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('home')
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [week, setWeek] = useState<Week | null>(null)
  const [games, setGames] = useState<Game[]>([])
  const [picks, setPicks] = useState<Pick[]>([])
  const [panelOpen, setPanelOpen] = useState(false)

  useEffect(() => {
    const playerId = getStoredPlayerId()
    if (!playerId) {
      router.replace('/')
      return
    }

    async function load(playerId: string) {
      const [{ data: allPlayers }, { data: player }, { data: activeSeason }] = await Promise.all([
        supabase.from('players').select('id, name').eq('is_active', true).order('created_at'),
        supabase.from('players').select('id, name').eq('id', playerId).single(),
        supabase.from('seasons').select('id').eq('is_active', true).single(),
      ])

      if (!player) {
        clearStoredPlayerId()
        router.replace('/')
        return
      }

      setCurrentPlayer(player)
      setPlayers(allPlayers ?? [])

      if (!activeSeason) return

      const { data: currentWeek } = await supabase
        .from('weeks')
        .select('id, week_number, status')
        .eq('season_id', activeSeason.id)
        .order('week_number', { ascending: false })
        .limit(1)
        .single()

      if (!currentWeek) return
      setWeek(currentWeek)

      const { data: weekGames } = await supabase
        .from('games')
        .select('id, away_team, home_team, kickoff_time, status')
        .eq('week_id', currentWeek.id)
        .order('kickoff_time')

      const gameList = weekGames ?? []
      setGames(gameList)

      if (gameList.length > 0) {
        const gameIds = gameList.map((g) => g.id)
        const { data: weekPicks } = await supabase
          .from('picks')
          .select('player_id, game_id, picked_team')
          .in('game_id', gameIds)
        setPicks(weekPicks ?? [])
      }
    }

    load(playerId)
  }, [router])

  function handlePlayerClick() {
    clearStoredPlayerId()
    router.replace('/')
  }

  // My picks as a game_id -> picked_team map for the panel
  const myPickMap: Record<string, string> = {}
  if (currentPlayer) {
    for (const pick of picks) {
      if (pick.player_id === currentPlayer.id) {
        myPickMap[pick.game_id] = pick.picked_team
      }
    }
  }

  function handlePicksChange(newPickMap: Record<string, string>) {
    if (!currentPlayer) return
    // Merge updated picks back into the flat picks array
    const otherPicks = picks.filter((p) => p.player_id !== currentPlayer.id)
    const myNewPicks = Object.entries(newPickMap).map(([game_id, picked_team]) => ({
      player_id: currentPlayer.id,
      game_id,
      picked_team,
    }))
    setPicks([...otherPicks, ...myNewPicks])
  }

  if (!currentPlayer) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <Header playerName={currentPlayer.name} onPlayerClick={handlePlayerClick} />

      <main className="flex flex-col flex-1 overflow-y-auto">
        {tab === 'home' && (
          <HomeTab
            currentPlayer={currentPlayer}
            players={players}
            week={week}
            games={games}
            picks={picks}
            onMakePicks={() => setPanelOpen(true)}
          />
        )}
        {tab === 'weekly' && (
          <WeeklyTab players={players} currentPlayerId={currentPlayer.id} />
        )}
        {tab === 'season' && (
          <SeasonTab players={players} currentPlayerId={currentPlayer.id} />
        )}
      </main>

      <TabBar active={tab} onChange={setTab} />

      {week && (
        <PickPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          weekNumber={week.week_number}
          games={games}
          playerId={currentPlayer.id}
          existingPicks={myPickMap}
          onPicksChange={handlePicksChange}
        />
      )}
    </div>
  )
}
