const KEY = 'fp_player_id'

export function getStoredPlayerId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(KEY)
}

export function setStoredPlayerId(id: string) {
  localStorage.setItem(KEY, id)
}

export function clearStoredPlayerId() {
  localStorage.removeItem(KEY)
}
