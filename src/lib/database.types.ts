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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      chat_channels: {
        Row: {
          allowed_tier_ids: string[] | null
          created_at: string
          creator_id: string
          id: string
          name: string | null
          type: Database["public"]["Enums"]["chat_channel_type"]
          updated_at: string
        }
        Insert: {
          allowed_tier_ids?: string[] | null
          created_at?: string
          creator_id: string
          id?: string
          name?: string | null
          type: Database["public"]["Enums"]["chat_channel_type"]
          updated_at?: string
        }
        Update: {
          allowed_tier_ids?: string[] | null
          created_at?: string
          creator_id?: string
          id?: string
          name?: string | null
          type?: Database["public"]["Enums"]["chat_channel_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_channels_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          channel_id: string
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          sender_id: string
        }
        Insert: {
          channel_id: string
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          sender_id: string
        }
        Update: {
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participants: {
        Row: {
          channel_id: string
          joined_at: string
          last_read_at: string
          profile_id: string
        }
        Insert: {
          channel_id: string
          joined_at?: string
          last_read_at?: string
          profile_id: string
        }
        Update: {
          channel_id?: string
          joined_at?: string
          last_read_at?: string
          profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participants_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_participants_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      content_reports: {
        Row: {
          created_at: string
          id: string
          post_id: string
          reason: string
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          reason: string
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          reason?: string
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_profiles: {
        Row: {
          bank_account_name: string | null
          bank_account_number: string | null
          bank_code: string | null
          banner_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          dms_enabled: boolean
          id: string
          is_published: boolean
          is_verified: boolean
          min_tier_id_for_dm: string | null
          paystack_subaccount_code: string | null
          slug: string
          social_links: Json | null
          subscriber_count: number
          total_earnings: number
        }
        Insert: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_code?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          dms_enabled?: boolean
          id: string
          is_published?: boolean
          is_verified?: boolean
          min_tier_id_for_dm?: string | null
          paystack_subaccount_code?: string | null
          slug: string
          social_links?: Json | null
          subscriber_count?: number
          total_earnings?: number
        }
        Update: {
          bank_account_name?: string | null
          bank_account_number?: string | null
          bank_code?: string | null
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          dms_enabled?: boolean
          id?: string
          is_published?: boolean
          is_verified?: boolean
          min_tier_id_for_dm?: string | null
          paystack_subaccount_code?: string | null
          slug?: string
          social_links?: Json | null
          subscriber_count?: number
          total_earnings?: number
        }
        Relationships: [
          {
            foreignKeyName: "creator_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_profiles_min_tier_id_for_dm_fkey"
            columns: ["min_tier_id_for_dm"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      donations: {
        Row: {
          amount: number
          amount_display: number | null
          amount_ngn: number | null
          created_at: string
          creator_id: string
          currency: string
          donor_name: string | null
          donor_note: string | null
          email: string
          fan_id: string | null
          fundraiser_id: string | null
          id: string
          paystack_reference: string | null
          platform_fee: number
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          amount_display?: number | null
          amount_ngn?: number | null
          created_at?: string
          creator_id: string
          currency?: string
          donor_name?: string | null
          donor_note?: string | null
          email: string
          fan_id?: string | null
          fundraiser_id?: string | null
          id?: string
          paystack_reference?: string | null
          platform_fee?: number
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          amount_display?: number | null
          amount_ngn?: number | null
          created_at?: string
          creator_id?: string
          currency?: string
          donor_name?: string | null
          donor_note?: string | null
          email?: string
          fan_id?: string | null
          fundraiser_id?: string | null
          id?: string
          paystack_reference?: string | null
          platform_fee?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "donations_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_fan_id_fkey"
            columns: ["fan_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_fundraiser_id_fkey"
            columns: ["fundraiser_id"]
            isOneToOne: false
            referencedRelation: "fundraisers"
            referencedColumns: ["id"]
          },
        ]
      }
      fundraisers: {
        Row: {
          auto_close_on_goal: boolean
          created_at: string
          creator_id: string
          current_amount: number
          description: string | null
          id: string
          is_active: boolean
          is_suspended: boolean
          show_leaderboard: boolean
          target_amount: number | null
          title: string
          updated_at: string
        }
        Insert: {
          auto_close_on_goal?: boolean
          created_at?: string
          creator_id: string
          current_amount?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_suspended?: boolean
          show_leaderboard?: boolean
          target_amount?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          auto_close_on_goal?: boolean
          created_at?: string
          creator_id?: string
          current_amount?: number
          description?: string | null
          id?: string
          is_active?: boolean
          is_suspended?: boolean
          show_leaderboard?: boolean
          target_amount?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fundraisers_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          created_at: string
          creator_id: string
          gross_amount: number
          id: string
          net_amount: number
          paid_at: string | null
          paystack_transfer_code: string | null
          period_end: string | null
          period_start: string | null
          platform_fee: number
          status: Database["public"]["Enums"]["payout_status"]
        }
        Insert: {
          created_at?: string
          creator_id: string
          gross_amount?: number
          id?: string
          net_amount?: number
          paid_at?: string | null
          paystack_transfer_code?: string | null
          period_end?: string | null
          period_start?: string | null
          platform_fee?: number
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Update: {
          created_at?: string
          creator_id?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          paid_at?: string | null
          paystack_transfer_code?: string | null
          period_end?: string | null
          period_start?: string | null
          platform_fee?: number
          status?: Database["public"]["Enums"]["payout_status"]
        }
        Relationships: [
          {
            foreignKeyName: "payouts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_announcements: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          message: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          message: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          message?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: string
          suggested_rate_eur: number
          suggested_rate_gbp: number
          suggested_rate_usd: number
          updated_at: string
        }
        Insert: {
          id?: string
          suggested_rate_eur?: number
          suggested_rate_gbp?: number
          suggested_rate_usd?: number
          updated_at?: string
        }
        Update: {
          id?: string
          suggested_rate_eur?: number
          suggested_rate_gbp?: number
          suggested_rate_usd?: number
          updated_at?: string
        }
        Relationships: []
      }
      platform_feedback: {
        Row: {
          created_at: string
          email: string | null
          id: string
          message: string
          page_url: string | null
          screenshot_url: string | null
          status: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          message: string
          page_url?: string | null
          screenshot_url?: string | null
          status?: string
          type?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          message?: string
          page_url?: string | null
          screenshot_url?: string | null
          status?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_pages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_published: boolean
          slug: string
          title: string
          updated_at: string
        }
        Insert: {
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          slug: string
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_published?: boolean
          slug?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      poll_options: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          post_id: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          post_id: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          post_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_options_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          created_at: string
          fan_id: string
          id: string
          option_id: string
          post_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          fan_id: string
          id?: string
          option_id: string
          post_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          fan_id?: string
          id?: string
          option_id?: string
          post_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_fan_id_fkey"
            columns: ["fan_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_option_id_fkey"
            columns: ["option_id"]
            isOneToOne: false
            referencedRelation: "poll_options"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_comments: {
        Row: {
          content: string
          created_at: string
          id: string
          parent_id: string | null
          post_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          parent_id?: string | null
          post_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_comments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      post_likes: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          content: string | null
          created_at: string
          creator_id: string
          embed_url: string | null
          has_poll: boolean
          id: string
          image_url: string | null
          is_public: boolean
          minimum_tier_amount: number
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          creator_id: string
          embed_url?: string | null
          has_poll?: boolean
          id?: string
          image_url?: string | null
          is_public?: boolean
          minimum_tier_amount?: number
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          creator_id?: string
          embed_url?: string | null
          has_poll?: boolean
          id?: string
          image_url?: string | null
          is_public?: boolean
          minimum_tier_amount?: number
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          admin_role: Database["public"]["Enums"]["admin_role"] | null
          avatar_url: string | null
          country: string
          created_at: string
          display_name: string | null
          email: string
          full_name: string
          id: string
          is_suspended: boolean
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          admin_role?: Database["public"]["Enums"]["admin_role"] | null
          avatar_url?: string | null
          country?: string
          created_at?: string
          display_name?: string | null
          email: string
          full_name: string
          id: string
          is_suspended?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          admin_role?: Database["public"]["Enums"]["admin_role"] | null
          avatar_url?: string | null
          country?: string
          created_at?: string
          display_name?: string | null
          email?: string
          full_name?: string
          id?: string
          is_suspended?: boolean
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      stream_settings: {
        Row: {
          alert_duration: number
          created_at: string
          creator_id: string
          overlay_token: string
          rate_eur: number
          rate_gbp: number
          rate_usd: number
          tts_enabled: boolean
          tts_min_ngn: number
          updated_at: string
          volume_chime: number
          volume_tts: number
        }
        Insert: {
          alert_duration?: number
          created_at?: string
          creator_id: string
          overlay_token?: string
          rate_eur?: number
          rate_gbp?: number
          rate_usd?: number
          tts_enabled?: boolean
          tts_min_ngn?: number
          updated_at?: string
          volume_chime?: number
          volume_tts?: number
        }
        Update: {
          alert_duration?: number
          created_at?: string
          creator_id?: string
          overlay_token?: string
          rate_eur?: number
          rate_gbp?: number
          rate_usd?: number
          tts_enabled?: boolean
          tts_min_ngn?: number
          updated_at?: string
          volume_chime?: number
          volume_tts?: number
        }
        Relationships: [
          {
            foreignKeyName: "stream_settings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: true
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancelled_at: string | null
          created_at: string
          creator_id: string
          current_period_end: string | null
          current_period_start: string | null
          fan_id: string
          id: string
          paystack_email_token: string | null
          paystack_subscription_code: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          tier_id: string
        }
        Insert: {
          cancelled_at?: string | null
          created_at?: string
          creator_id: string
          current_period_end?: string | null
          current_period_start?: string | null
          fan_id: string
          id?: string
          paystack_email_token?: string | null
          paystack_subscription_code?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          tier_id: string
        }
        Update: {
          cancelled_at?: string | null
          created_at?: string
          creator_id?: string
          current_period_end?: string | null
          current_period_start?: string | null
          fan_id?: string
          id?: string
          paystack_email_token?: string | null
          paystack_subscription_code?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          tier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_fan_id_fkey"
            columns: ["fan_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      tiers: {
        Row: {
          amount: number
          created_at: string
          creator_id: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          paystack_plan_code: string | null
          paystack_plan_codes: Json | null
          perks: Json | null
          sort_order: number
        }
        Insert: {
          amount: number
          created_at?: string
          creator_id: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          paystack_plan_code?: string | null
          paystack_plan_codes?: Json | null
          perks?: Json | null
          sort_order?: number
        }
        Update: {
          amount?: number
          created_at?: string
          creator_id?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          paystack_plan_code?: string | null
          paystack_plan_codes?: Json | null
          perks?: Json | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "tiers_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          creator_id: string
          creator_share: number
          fan_id: string | null
          id: string
          paid_at: string | null
          payout_id: string | null
          paystack_reference: string | null
          platform_fee: number
          settled: boolean
          status: Database["public"]["Enums"]["transaction_status"]
          subscription_id: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          creator_id: string
          creator_share?: number
          fan_id?: string | null
          id?: string
          paid_at?: string | null
          payout_id?: string | null
          paystack_reference?: string | null
          platform_fee?: number
          settled?: boolean
          status?: Database["public"]["Enums"]["transaction_status"]
          subscription_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          creator_id?: string
          creator_share?: number
          fan_id?: string | null
          id?: string
          paid_at?: string | null
          payout_id?: string | null
          paystack_reference?: string | null
          platform_fee?: number
          settled?: boolean
          status?: Database["public"]["Enums"]["transaction_status"]
          subscription_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "creator_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_fan_id_fkey"
            columns: ["fan_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_payout_id_fkey"
            columns: ["payout_id"]
            isOneToOne: false
            referencedRelation: "payouts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_unread_counts_for_channels: {
        Args: { p_channel_ids: string[]; p_user_id: string }
        Returns: {
          channel_id: string
          unread_count: number
        }[]
      }
      get_unread_message_count: { Args: { p_user_id: string }; Returns: number }
      has_active_subscription_to_tier: {
        Args: { p_fan_id: string; p_tier_id: string }
        Returns: boolean
      }
      has_post_access: {
        Args: { p_post_id: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: { roles: Database["public"]["Enums"]["admin_role"][] }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_participant_in_channel: {
        Args: { p_channel_id: string; p_user_id: string }
        Returns: boolean
      }
      meets_min_tier_requirement: {
        Args: { p_creator_id: string; p_fan_id: string }
        Returns: boolean
      }
      process_donation_success: {
        Args: {
          p_amount: number
          p_donation_id: string
          p_fundraiser_id: string
        }
        Returns: undefined
      }
      process_paystack_charge_success: {
        Args: {
          p_amount: number
          p_creator_id: string
          p_creator_share: number
          p_email_token: string
          p_fan_id: string
          p_platform_fee: number
          p_reference: string
          p_subscription_code: string
          p_tier_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      admin_role:
        | "super_admin"
        | "finance_manager"
        | "moderator"
        | "support_agent"
      chat_channel_type: "direct_message" | "group_chat"
      payout_status: "pending" | "calculated" | "paid" | "failed"
      subscription_status: "active" | "cancelled" | "past_due"
      transaction_status: "success" | "failed" | "refunded"
      user_role: "fan" | "creator"
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
      admin_role: [
        "super_admin",
        "finance_manager",
        "moderator",
        "support_agent",
      ],
      chat_channel_type: ["direct_message", "group_chat"],
      payout_status: ["pending", "calculated", "paid", "failed"],
      subscription_status: ["active", "cancelled", "past_due"],
      transaction_status: ["success", "failed", "refunded"],
      user_role: ["fan", "creator"],
    },
  },
} as const
