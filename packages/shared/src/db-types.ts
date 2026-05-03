/**
 * Supabase database types — `public` schema.
 *
 * REGENERATE WITH:
 *
 *   supabase login
 *   supabase gen types typescript \
 *     --project-id pdrwvbefaihpkxkghghb \
 *     --schema public \
 *     > packages/shared/src/db-types.ts
 *
 * This file is hand-written to mirror `infra/supabase/migrations/0001_init.sql`
 * 1:1 so the rest of the app can typecheck before the CLI is available.
 * Re-run the command above whenever migrations change.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      cities: {
        Row: {
          id: number;
          name: string;
          country_code: string;
          latitude: number | null;
          longitude: number | null;
          population: number | null;
          name_ru: string | null;
          name_kk: string | null;
        };
        Insert: {
          id: number;
          name: string;
          country_code: string;
          latitude?: number | null;
          longitude?: number | null;
          population?: number | null;
          name_ru?: string | null;
          name_kk?: string | null;
        };
        Update: {
          id?: number;
          name?: string;
          country_code?: string;
          latitude?: number | null;
          longitude?: number | null;
          population?: number | null;
          name_ru?: string | null;
          name_kk?: string | null;
        };
        Relationships: [];
      };
      games: {
        Row: {
          id: string;
          white_id: string | null;
          black_id: string | null;
          mode: "bot" | "ranked" | "friend" | "tournament";
          time_control: string;
          status:
            | "waiting"
            | "active"
            | "checkmate"
            | "stalemate"
            | "draw"
            | "resigned"
            | "timeout"
            | "aborted";
          last_move_at: string | null;
          result: "1-0" | "0-1" | "1/2-1/2" | null;
          pgn: string;
          final_fen: string | null;
          wager_amount: number;
          elo_white_before: number | null;
          elo_black_before: number | null;
          elo_white_after: number | null;
          elo_black_after: number | null;
          started_at: string;
          ended_at: string | null;
        };
        Insert: {
          id?: string;
          white_id?: string | null;
          black_id?: string | null;
          mode: "bot" | "ranked" | "friend" | "tournament";
          time_control: string;
          status:
            | "waiting"
            | "active"
            | "checkmate"
            | "stalemate"
            | "draw"
            | "resigned"
            | "timeout"
            | "aborted";
          last_move_at?: string | null;
          result?: "1-0" | "0-1" | "1/2-1/2" | null;
          pgn: string;
          final_fen?: string | null;
          wager_amount?: number;
          elo_white_before?: number | null;
          elo_black_before?: number | null;
          elo_white_after?: number | null;
          elo_black_after?: number | null;
          started_at?: string;
          ended_at?: string | null;
        };
        Update: {
          id?: string;
          white_id?: string | null;
          black_id?: string | null;
          mode?: "bot" | "ranked" | "friend" | "tournament";
          time_control?: string;
          status?:
            | "waiting"
            | "active"
            | "checkmate"
            | "stalemate"
            | "draw"
            | "resigned"
            | "timeout"
            | "aborted";
          last_move_at?: string | null;
          result?: "1-0" | "0-1" | "1/2-1/2" | null;
          pgn?: string;
          final_fen?: string | null;
          wager_amount?: number;
          elo_white_before?: number | null;
          elo_black_before?: number | null;
          elo_white_after?: number | null;
          elo_black_after?: number | null;
          started_at?: string;
          ended_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "games_white_id_fkey";
            columns: ["white_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "games_black_id_fkey";
            columns: ["black_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      game_moves: {
        Row: {
          id: number;
          game_id: string;
          ply: number;
          san: string;
          uci: string;
          fen_after: string;
          time_left_ms: number;
          made_at: string;
        };
        Insert: {
          id?: number;
          game_id: string;
          ply: number;
          san: string;
          uci: string;
          fen_after: string;
          time_left_ms: number;
          made_at?: string;
        };
        Update: {
          id?: number;
          game_id?: string;
          ply?: number;
          san?: string;
          uci?: string;
          fen_after?: string;
          time_left_ms?: number;
          made_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "game_moves_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          }
        ];
      };
      city_score_events: {
        Row: {
          id: number;
          city_id: number;
          user_id: string;
          game_id: string | null;
          points: number;
          created_at: string;
        };
        Insert: {
          id?: number;
          city_id: number;
          user_id: string;
          game_id?: string | null;
          points: number;
          created_at?: string;
        };
        Update: {
          id?: number;
          city_id?: number;
          user_id?: string;
          game_id?: string | null;
          points?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "city_score_events_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "city_score_events_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "city_score_events_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          }
        ];
      };
      city_leaderboard_snapshots: {
        Row: {
          id: number;
          city_id: number;
          score: number;
          active_players: number;
          captured_at: string;
        };
        Insert: {
          id?: number;
          city_id: number;
          score: number;
          active_players: number;
          captured_at?: string;
        };
        Update: {
          id?: number;
          city_id?: number;
          score?: number;
          active_players?: number;
          captured_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "city_leaderboard_snapshots_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          }
        ];
      };
      coin_transactions: {
        Row: {
          id: number;
          user_id: string;
          amount: number;
          reason: "signup_bonus" | "daily_quest" | "streak_bonus" | "daily_login" | "wager_stake" | "wager_win" | "wager_refund" | "puzzle_solve" | "rated_win" | "shop_purchase" | "battlepass_reward" | "admin_grant";
          game_id: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: number;
          user_id: string;
          amount: number;
          reason: "signup_bonus" | "daily_quest" | "streak_bonus" | "daily_login" | "wager_stake" | "wager_win" | "wager_refund" | "puzzle_solve" | "rated_win" | "shop_purchase" | "battlepass_reward" | "admin_grant";
          game_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: number;
          user_id?: string;
          amount?: number;
          reason?: "signup_bonus" | "daily_quest" | "streak_bonus" | "daily_login" | "wager_stake" | "wager_win" | "wager_refund" | "puzzle_solve" | "rated_win" | "shop_purchase" | "battlepass_reward" | "admin_grant";
          game_id?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "coin_transactions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "coin_transactions_game_id_fkey";
            columns: ["game_id"];
            isOneToOne: false;
            referencedRelation: "games";
            referencedColumns: ["id"];
          }
        ];
      };
      daily_wager_state: {
        Row: {
          user_id: string;
          date: string;
          total_staked: number;
        };
        Insert: {
          user_id: string;
          date: string;
          total_staked?: number;
        };
        Update: {
          user_id?: string;
          date?: string;
          total_staked?: number;
        };
        Relationships: [
          {
            foreignKeyName: "daily_wager_state_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_id: string | null;
          city_id: number | null;
          country_code: string | null;
          elo_rating: number;
          coin_balance: number;
          pro_until: string | null;
          streak_count: number;
          streak_last_at: string | null;
          longest_streak: number;
          streak_grace_month: string | null;
          streak_grace_tokens_used: number;
          locale: "ru" | "kk" | "en";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_id?: string | null;
          city_id?: number | null;
          country_code?: string | null;
          elo_rating?: number;
          coin_balance?: number;
          pro_until?: string | null;
          streak_count?: number;
          streak_last_at?: string | null;
          longest_streak?: number;
          streak_grace_month?: string | null;
          streak_grace_tokens_used?: number;
          locale?: "ru" | "kk" | "en";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_id?: string | null;
          city_id?: number | null;
          country_code?: string | null;
          elo_rating?: number;
          coin_balance?: number;
          pro_until?: string | null;
          streak_count?: number;
          streak_last_at?: string | null;
          longest_streak?: number;
          streak_grace_month?: string | null;
          streak_grace_tokens_used?: number;
          locale?: "ru" | "kk" | "en";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey";
            columns: ["id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "profiles_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      city_leaderboard_weekly: {
        Row: {
          city_id: number;
          name: string;
          country_code: string;
          latitude: number | null;
          longitude: number | null;
          score: number;
          active_players: number;
          previous_score: number;
        };
        Insert: never;
        Update: never;
        Relationships: [
          {
            foreignKeyName: "city_leaderboard_weekly_city_id_fkey";
            columns: ["city_id"];
            isOneToOne: false;
            referencedRelation: "cities";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Functions: {
      submit_move: {
        Args: {
          p_game_id: string;
          p_uci: string;
          p_san: string;
          p_fen_after: string;
          p_time_left_ms: number;
        };
        Returns: Json;
      };
      refresh_city_leaderboard: {
        Args: Record<PropertyKey, never>;
        Returns: void;
      };
      queue_ranked_match: {
        Args: {
          p_time_control: string;
          p_wager_amount: number;
        };
        Returns: Json;
      };
      get_wager_allowance: {
        Args: Record<PropertyKey, never>;
        Returns: Json;
      };
      create_ranked_wager_game: {
        Args: {
          p_white_id: string;
          p_black_id: string;
          p_time_control: string;
          p_wager_amount: number;
          p_white_elo: number;
          p_black_elo: number;
        };
        Returns: string;
      };
      apply_wager_outcome: {
        Args: {
          p_game_id: string;
        };
        Returns: Json;
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}

// Convenience aliases used across the app.
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profiles"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

export type City = Database["public"]["Tables"]["cities"]["Row"];

export type Game = Database["public"]["Tables"]["games"]["Row"];
export type GameInsert = Database["public"]["Tables"]["games"]["Insert"];

export type GameMove = Database["public"]["Tables"]["game_moves"]["Row"];
export type GameMoveInsert = Database["public"]["Tables"]["game_moves"]["Insert"];
