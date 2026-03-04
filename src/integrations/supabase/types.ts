export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      badges: {
        Row: {
          badge_type: string
          earned_at: string
          group_id: string | null
          id: string
          user_id: string
        }
        Insert: {
          badge_type: string
          earned_at?: string
          group_id?: string | null
          id?: string
          user_id: string
        }
        Update: {
          badge_type?: string
          earned_at?: string
          group_id?: string | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "badges_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_scores: {
        Row: {
          challenge_id: string
          checkin_id: string
          created_at: string
          id: string
          points: number
          user_id: string
          verification_reason: string | null
          verified: boolean
        }
        Insert: {
          challenge_id: string
          checkin_id: string
          created_at?: string
          id?: string
          points?: number
          user_id: string
          verification_reason?: string | null
          verified?: boolean
        }
        Update: {
          challenge_id?: string
          checkin_id?: string
          created_at?: string
          id?: string
          points?: number
          user_id?: string
          verification_reason?: string | null
          verified?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "challenge_scores_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "weekly_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_scores_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "checkins"
            referencedColumns: ["id"]
          },
        ]
      }
      checkins: {
        Row: {
          caption: string | null
          capture_timestamp: string | null
          created_at: string
          group_id: string
          id: string
          photo_url: string
          selfie_url: string | null
          shared_to_campus: boolean
          user_id: string
        }
        Insert: {
          caption?: string | null
          capture_timestamp?: string | null
          created_at?: string
          group_id: string
          id?: string
          photo_url: string
          selfie_url?: string | null
          shared_to_campus?: boolean
          user_id: string
        }
        Update: {
          caption?: string | null
          capture_timestamp?: string | null
          created_at?: string
          group_id?: string
          id?: string
          photo_url?: string
          selfie_url?: string | null
          shared_to_campus?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checkins_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_invites: {
        Row: {
          created_at: string
          group_id: string
          id: string
          invite_method: string
          invited_by: string
          invited_identifier: string | null
          invited_name: string
          joined_user_id: string | null
          reminded_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          invite_method?: string
          invited_by: string
          invited_identifier?: string | null
          invited_name: string
          joined_user_id?: string | null
          reminded_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          invite_method?: string
          invited_by?: string
          invited_identifier?: string | null
          invited_name?: string
          joined_user_id?: string | null
          reminded_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_invites_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_members: {
        Row: {
          group_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Insert: {
          group_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id: string
        }
        Update: {
          group_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      group_messages: {
        Row: {
          created_at: string
          deleted: boolean | null
          group_id: string
          id: string
          is_system_message: boolean | null
          message_text: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          deleted?: boolean | null
          group_id: string
          id?: string
          is_system_message?: boolean | null
          message_text: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          deleted?: boolean | null
          group_id?: string
          id?: string
          is_system_message?: boolean | null
          message_text?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "group_messages_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string
          created_by_user_id: string | null
          custom_habit: string | null
          habit_type: Database["public"]["Enums"]["habit_type"]
          id: string
          invite_code: string
          invites_enabled: boolean | null
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by_user_id?: string | null
          custom_habit?: string | null
          habit_type: Database["public"]["Enums"]["habit_type"]
          id?: string
          invite_code?: string
          invites_enabled?: boolean | null
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by_user_id?: string | null
          custom_habit?: string | null
          habit_type?: Database["public"]["Enums"]["habit_type"]
          id?: string
          invite_code?: string
          invites_enabled?: boolean | null
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "group_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          checkin_id: string | null
          created_at: string
          description: string | null
          group_id: string | null
          id: string
          point_type: string
          points: number
          user_id: string
        }
        Insert: {
          checkin_id?: string | null
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          point_type: string
          points: number
          user_id: string
        }
        Update: {
          checkin_id?: string | null
          created_at?: string
          description?: string | null
          group_id?: string | null
          id?: string
          point_type?: string
          points?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "point_transactions_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          anonymous_on_campus: boolean
          campus: string | null
          created_at: string
          email: string
          email_frequency: string
          first_post_completed: boolean | null
          id: string
          name: string
          notification_daily_time: string | null
          notification_friend_activity: boolean | null
          notification_milestones: boolean | null
          onboarding_completed: boolean | null
          profile_photo_url: string | null
          show_on_campus_feed: boolean
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          anonymous_on_campus?: boolean
          campus?: string | null
          created_at?: string
          email: string
          email_frequency?: string
          first_post_completed?: boolean | null
          id?: string
          name: string
          notification_daily_time?: string | null
          notification_friend_activity?: boolean | null
          notification_milestones?: boolean | null
          onboarding_completed?: boolean | null
          profile_photo_url?: string | null
          show_on_campus_feed?: boolean
          theme?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          anonymous_on_campus?: boolean
          campus?: string | null
          created_at?: string
          email?: string
          email_frequency?: string
          first_post_completed?: boolean | null
          id?: string
          name?: string
          notification_daily_time?: string | null
          notification_friend_activity?: boolean | null
          notification_milestones?: boolean | null
          onboarding_completed?: boolean | null
          profile_photo_url?: string | null
          show_on_campus_feed?: boolean
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reactions: {
        Row: {
          checkin_id: string
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          checkin_id: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id: string
        }
        Update: {
          checkin_id?: string
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reactions_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "checkins"
            referencedColumns: ["id"]
          },
        ]
      }
      rest_days: {
        Row: {
          created_at: string
          group_id: string
          id: string
          rest_date: string
          user_id: string
          week_start: string
        }
        Insert: {
          created_at?: string
          group_id: string
          id?: string
          rest_date: string
          user_id: string
          week_start: string
        }
        Update: {
          created_at?: string
          group_id?: string
          id?: string
          rest_date?: string
          user_id?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "rest_days_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      streaks: {
        Row: {
          avg_checkin_time: string | null
          current_streak: number
          group_id: string
          id: string
          last_checkin_date: string | null
          longest_streak: number
          streak_broken_at: string | null
          total_checkins: number
          user_id: string
        }
        Insert: {
          avg_checkin_time?: string | null
          current_streak?: number
          group_id: string
          id?: string
          last_checkin_date?: string | null
          longest_streak?: number
          streak_broken_at?: string | null
          total_checkins?: number
          user_id: string
        }
        Update: {
          avg_checkin_time?: string | null
          current_streak?: number
          group_id?: string
          id?: string
          last_checkin_date?: string | null
          longest_streak?: number
          streak_broken_at?: string | null
          total_checkins?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "streaks_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_replies: {
        Row: {
          audio_url: string
          checkin_id: string
          created_at: string
          duration_seconds: number
          id: string
          parent_reply_id: string | null
          user_id: string
        }
        Insert: {
          audio_url: string
          checkin_id: string
          created_at?: string
          duration_seconds: number
          id?: string
          parent_reply_id?: string | null
          user_id: string
        }
        Update: {
          audio_url?: string
          checkin_id?: string
          created_at?: string
          duration_seconds?: number
          id?: string
          parent_reply_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_replies_checkin_id_fkey"
            columns: ["checkin_id"]
            isOneToOne: false
            referencedRelation: "checkins"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "voice_replies_parent_reply_id_fkey"
            columns: ["parent_reply_id"]
            isOneToOne: false
            referencedRelation: "voice_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      voice_reply_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          user_id: string
          voice_reply_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          user_id: string
          voice_reply_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          user_id?: string
          voice_reply_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "voice_reply_reactions_voice_reply_id_fkey"
            columns: ["voice_reply_id"]
            isOneToOne: false
            referencedRelation: "voice_replies"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_challenges: {
        Row: {
          challenge_key: string
          created_at: string
          group_id: string
          id: string
          next_challenge_key: string | null
          results_announced: boolean
          week_end: string
          week_start: string
        }
        Insert: {
          challenge_key: string
          created_at?: string
          group_id: string
          id?: string
          next_challenge_key?: string | null
          results_announced?: boolean
          week_end: string
          week_start: string
        }
        Update: {
          challenge_key?: string
          created_at?: string
          group_id?: string
          id?: string
          next_challenge_key?: string | null
          results_announced?: boolean
          week_end?: string
          week_start?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_challenges_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_recaps: {
        Row: {
          avg_post_time: string | null
          best_performer_days: number | null
          best_performer_name: string | null
          created_at: string
          current_streak: number
          day_statuses: Json
          days_posted: number
          earliest_post_day: string | null
          earliest_post_time: string | null
          group_consistency: number | null
          group_id: string | null
          group_rank: number | null
          group_total: number | null
          id: string
          longest_streak_month: number
          most_productive_day: string | null
          next_milestone_days: number | null
          next_milestone_name: string | null
          shareable_image_url: string | null
          streak_broken_on: string | null
          streak_change: number
          struggling_member_days: number | null
          struggling_member_name: string | null
          toughest_day: string | null
          user_consistency: number | null
          user_id: string
          viewed_at: string | null
          week_end: string
          week_start: string
        }
        Insert: {
          avg_post_time?: string | null
          best_performer_days?: number | null
          best_performer_name?: string | null
          created_at?: string
          current_streak?: number
          day_statuses?: Json
          days_posted?: number
          earliest_post_day?: string | null
          earliest_post_time?: string | null
          group_consistency?: number | null
          group_id?: string | null
          group_rank?: number | null
          group_total?: number | null
          id?: string
          longest_streak_month?: number
          most_productive_day?: string | null
          next_milestone_days?: number | null
          next_milestone_name?: string | null
          shareable_image_url?: string | null
          streak_broken_on?: string | null
          streak_change?: number
          struggling_member_days?: number | null
          struggling_member_name?: string | null
          toughest_day?: string | null
          user_consistency?: number | null
          user_id: string
          viewed_at?: string | null
          week_end: string
          week_start: string
        }
        Update: {
          avg_post_time?: string | null
          best_performer_days?: number | null
          best_performer_name?: string | null
          created_at?: string
          current_streak?: number
          day_statuses?: Json
          days_posted?: number
          earliest_post_day?: string | null
          earliest_post_time?: string | null
          group_consistency?: number | null
          group_id?: string | null
          group_rank?: number | null
          group_total?: number | null
          id?: string
          longest_streak_month?: number
          most_productive_day?: string | null
          next_milestone_days?: number | null
          next_milestone_name?: string | null
          shareable_image_url?: string | null
          streak_broken_on?: string | null
          streak_change?: number
          struggling_member_days?: number | null
          struggling_member_name?: string | null
          toughest_day?: string | null
          user_consistency?: number | null
          user_id?: string
          viewed_at?: string | null
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          created_at: string | null
          id: string | null
          name: string | null
          profile_photo_url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          profile_photo_url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          name?: string | null
          profile_photo_url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_campus_leaderboard: {
        Args: { p_campus: string; p_habit_filter?: string }
        Returns: {
          current_streak: number
          display_name: string
          habit_type: string
          is_anonymous: boolean
          profile_photo_url: string
          user_id: string
        }[]
      }
      get_campus_stats: {
        Args: { p_campus: string }
        Returns: {
          avg_streak: number
          top_habit: string
          top_habit_pct: number
          total_students: number
        }[]
      }
      get_group_member_preview: {
        Args: { p_group_id: string }
        Returns: {
          name: string
          profile_photo_url: string
        }[]
      }
      get_group_member_profiles: {
        Args: { p_group_id: string }
        Returns: {
          created_at: string
          id: string
          name: string
          profile_photo_url: string
          user_id: string
        }[]
      }
      get_public_profile: {
        Args: { p_user_id: string }
        Returns: {
          created_at: string
          id: string
          name: string
          profile_photo_url: string
          user_id: string
        }[]
      }
      get_rest_days_remaining: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: number
      }
      get_user_group_ids: { Args: { p_user_id: string }; Returns: string[] }
      is_group_member: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: boolean
      }
      lookup_group_by_invite_code: {
        Args: { code: string }
        Returns: {
          custom_habit: string
          habit_type: Database["public"]["Enums"]["habit_type"]
          id: string
          invites_enabled: boolean
          name: string
        }[]
      }
      take_rest_day: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: Json
      }
      update_user_streak: {
        Args: { p_group_id: string; p_user_id: string }
        Returns: undefined
      }
    }
    Enums: {
      habit_type:
        | "gym"
        | "study"
        | "wake_up_early"
        | "meditate"
        | "quit_bad_habit"
        | "journal"
        | "creative"
        | "cardio"
        | "drink_water"
        | "healthy_eating"
        | "other"
      member_role: "admin" | "member"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      habit_type: [
        "gym",
        "study",
        "wake_up_early",
        "meditate",
        "quit_bad_habit",
        "journal",
        "creative",
        "cardio",
        "drink_water",
        "healthy_eating",
        "other",
      ],
      member_role: ["admin", "member"],
    },
  },
} as const
