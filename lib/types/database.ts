export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      match_predictions: {
        Row: {
          created_at: string
          id: string
          match_id: number
          points_earned: number | null
          predicted_away_goals: number
          predicted_home_goals: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          match_id: number
          points_earned?: number | null
          predicted_away_goals: number
          predicted_home_goals: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: number
          points_earned?: number | null
          predicted_away_goals?: number
          predicted_home_goals?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_predictions_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          away_goals: number | null
          away_team_id: number | null
          created_at: string
          group_letter: string | null
          home_goals: number | null
          home_team_id: number | null
          id: number
          is_finished: boolean
          match_date: string | null
          match_number: number
          stage: string
          venue: string | null
        }
        Insert: {
          away_goals?: number | null
          away_team_id?: number | null
          created_at?: string
          group_letter?: string | null
          home_goals?: number | null
          home_team_id?: number | null
          id?: number
          is_finished?: boolean
          match_date?: string | null
          match_number: number
          stage: string
          venue?: string | null
        }
        Update: {
          away_goals?: number | null
          away_team_id?: number | null
          created_at?: string
          group_letter?: string | null
          home_goals?: number | null
          home_team_id?: number | null
          id?: number
          is_finished?: boolean
          match_date?: string | null
          match_number?: number
          stage?: string
          venue?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_away_team_id_fkey"
            columns: ["away_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_home_team_id_fkey"
            columns: ["home_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string
          id: string
          is_admin: boolean
          total_points: number
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name: string
          id: string
          is_admin?: boolean
          total_points?: number
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          id?: string
          is_admin?: boolean
          total_points?: number
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          code: string
          created_at: string
          flag_url: string | null
          group_letter: string
          id: number
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          flag_url?: string | null
          group_letter: string
          id?: number
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          flag_url?: string | null
          group_letter?: string
          id?: number
          name?: string
        }
        Relationships: []
      }
      tournament_predictions: {
        Row: {
          champion_team_id: number
          created_at: string
          id: string
          is_locked: boolean
          points_earned: number | null
          runner_up_team_id: number
          third_place_team_id: number
          updated_at: string
          user_id: string
        }
        Insert: {
          champion_team_id: number
          created_at?: string
          id?: string
          is_locked?: boolean
          points_earned?: number | null
          runner_up_team_id: number
          third_place_team_id: number
          updated_at?: string
          user_id: string
        }
        Update: {
          champion_team_id?: number
          created_at?: string
          id?: string
          is_locked?: boolean
          points_earned?: number | null
          runner_up_team_id?: number
          third_place_team_id?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_predictions_champion_team_id_fkey"
            columns: ["champion_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_predictions_runner_up_team_id_fkey"
            columns: ["runner_up_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_predictions_third_place_team_id_fkey"
            columns: ["third_place_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_predictions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// Helper types
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type TablesInsert<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// Convenience aliases
export type Team = Tables<"teams">;
export type Match = Tables<"matches">;
export type Profile = Tables<"profiles">;
export type MatchPrediction = Tables<"match_predictions">;
export type TournamentPrediction = Tables<"tournament_predictions">;

// Match with joined team data
export type MatchWithTeams = Match & {
  home_team: Team | null;
  away_team: Team | null;
};

// Match with prediction
export type MatchWithPrediction = MatchWithTeams & {
  prediction: MatchPrediction | null;
};
