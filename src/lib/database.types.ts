export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface Database {
  public: {
    Tables: {
      players: {
        Row: {
          id: string; name: string; is_active: boolean; created_at: string
          pin_hash: string | null; pin_set_at: string | null
          pin_attempts: number; locked_until: string | null; is_commissioner: boolean
        }
        Insert: {
          id?: string; name: string; is_active?: boolean; created_at?: string
          pin_hash?: string | null; pin_set_at?: string | null
          pin_attempts?: number; locked_until?: string | null; is_commissioner?: boolean
        }
        Update: {
          id?: string; name?: string; is_active?: boolean; created_at?: string
          pin_hash?: string | null; pin_set_at?: string | null
          pin_attempts?: number; locked_until?: string | null; is_commissioner?: boolean
        }
        Relationships: []
      }
      seasons: {
        Row: { id: string; year: number; is_active: boolean }
        Insert: { id?: string; year: number; is_active?: boolean }
        Update: { id?: string; year?: number; is_active?: boolean }
        Relationships: []
      }
      weeks: {
        Row: { id: string; season_id: string; week_number: number; status: string }
        Insert: { id?: string; season_id: string; week_number: number; status?: string }
        Update: { id?: string; season_id?: string; week_number?: number; status?: string }
        Relationships: [
          {
            foreignKeyName: 'weeks_season_id_fkey'
            columns: ['season_id']
            isOneToOne: false
            referencedRelation: 'seasons'
            referencedColumns: ['id']
          },
        ]
      }
      games: {
        Row: {
          id: string; week_id: string; away_team: string; home_team: string
          kickoff_time: string; status: string; away_score: number | null
          home_score: number | null; winning_team: string | null
        }
        Insert: {
          id?: string; week_id: string; away_team: string; home_team: string
          kickoff_time: string; status?: string; away_score?: number | null
          home_score?: number | null; winning_team?: string | null
        }
        Update: {
          id?: string; week_id?: string; away_team?: string; home_team?: string
          kickoff_time?: string; status?: string; away_score?: number | null
          home_score?: number | null; winning_team?: string | null
        }
        Relationships: [
          {
            foreignKeyName: 'games_week_id_fkey'
            columns: ['week_id']
            isOneToOne: false
            referencedRelation: 'weeks'
            referencedColumns: ['id']
          },
        ]
      }
      picks: {
        Row: { id: string; player_id: string; game_id: string; picked_team: string; submitted_at: string }
        Insert: { id?: string; player_id: string; game_id: string; picked_team: string; submitted_at?: string }
        Update: { id?: string; player_id?: string; game_id?: string; picked_team?: string; submitted_at?: string }
        Relationships: [
          {
            foreignKeyName: 'picks_player_id_fkey'
            columns: ['player_id']
            isOneToOne: false
            referencedRelation: 'players'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'picks_game_id_fkey'
            columns: ['game_id']
            isOneToOne: false
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
        ]
      }
      game_insights: {
        Row: { game_id: string; data: Json; updated_at: string }
        Insert: { game_id: string; data?: Json; updated_at?: string }
        Update: { game_id?: string; data?: Json; updated_at?: string }
        Relationships: [
          {
            foreignKeyName: 'game_insights_game_id_fkey'
            columns: ['game_id']
            isOneToOne: true
            referencedRelation: 'games'
            referencedColumns: ['id']
          },
        ]
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
