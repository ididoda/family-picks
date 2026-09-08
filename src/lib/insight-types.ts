// Shared shapes for the per-game insight blob (safe to import client-side).

export type GameOdds = {
  spreadFavorite: string | null // abbr of favored team
  spreadLine: number | null // points, negative for the favorite
  total: number | null // over/under
  book: string | null
}

export type TeamForm = {
  record: { w: number; l: number }
  last5: ('W' | 'L')[] // most recent first
}

export type GameInsight = {
  odds: GameOdds | null
  away: TeamForm
  home: TeamForm
  h2h: { winner: string; week: number }[] // this season, most recent first
}
