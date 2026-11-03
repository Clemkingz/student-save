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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: boolean
          school_status: Database["public"]["Enums"]["school_status"] | null
          simulation_mode: boolean
        }
        Insert: {
          id?: boolean
          school_status?: Database["public"]["Enums"]["school_status"] | null
          simulation_mode?: boolean
        }
        Update: {
          id?: boolean
          school_status?: Database["public"]["Enums"]["school_status"] | null
          simulation_mode?: boolean
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: number
          metadata: Json
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: never
          metadata?: Json
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: never
          metadata?: Json
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount_kobo: number
          category: string
          created_at: string
          id: string
          month: string
          user_id: string
        }
        Insert: {
          amount_kobo: number
          category: string
          created_at?: string
          id?: string
          month: string
          user_id: string
        }
        Update: {
          amount_kobo?: number
          category?: string
          created_at?: string
          id?: string
          month?: string
          user_id?: string
        }
        Relationships: []
      }
      lock_commitments: {
        Row: {
          created_at: string
          description: string
          end_date: string
          id: string
          locked_kobo: number
          plan_months: number
          start_date: string
          target_kobo: number
          user_id: string
          withdrawal_fee_kobo: number | null
          withdrawal_net_kobo: number | null
          withdrawn_at: string | null
        }
        Insert: {
          created_at?: string
          description?: string
          end_date: string
          id?: string
          locked_kobo: number
          plan_months: number
          start_date: string
          target_kobo: number
          user_id: string
          withdrawal_fee_kobo?: number | null
          withdrawal_net_kobo?: number | null
          withdrawn_at?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          end_date?: string
          id?: string
          locked_kobo?: number
          plan_months?: number
          start_date?: string
          target_kobo?: number
          user_id?: string
          withdrawal_fee_kobo?: number | null
          withdrawal_net_kobo?: number | null
          withdrawn_at?: string | null
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          email: boolean
          in_app: boolean
          push: boolean
          user_id: string
        }
        Insert: {
          email?: boolean
          in_app?: boolean
          push?: boolean
          user_id: string
        }
        Update: {
          email?: boolean
          in_app?: boolean
          push?: boolean
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_path: string | null
          created_at: string
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          created_at?: string
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      report_dismissals: {
        Row: {
          alert_id: string
          user_id: string
        }
        Insert: {
          alert_id: string
          user_id: string
        }
        Update: {
          alert_id?: string
          user_id?: string
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          auto_amount_kobo: number | null
          auto_enabled: boolean
          auto_frequency:
            | Database["public"]["Enums"]["contribution_frequency"]
            | null
          blocked_since: string | null
          client_key: string | null
          contribution_method: Database["public"]["Enums"]["contribution_method"]
          created_at: string
          due_date: string | null
          id: string
          name: string
          next_contribution_on: string | null
          schedule_day: number | null
          target_kobo: number
          user_id: string
          withdrawal_kobo: number | null
          withdrawn_at: string | null
        }
        Insert: {
          auto_amount_kobo?: number | null
          auto_enabled?: boolean
          auto_frequency?:
            | Database["public"]["Enums"]["contribution_frequency"]
            | null
          blocked_since?: string | null
          client_key?: string | null
          contribution_method?: Database["public"]["Enums"]["contribution_method"]
          created_at?: string
          due_date?: string | null
          id?: string
          name: string
          next_contribution_on?: string | null
          schedule_day?: number | null
          target_kobo: number
          user_id: string
          withdrawal_kobo?: number | null
          withdrawn_at?: string | null
        }
        Update: {
          auto_amount_kobo?: number | null
          auto_enabled?: boolean
          auto_frequency?:
            | Database["public"]["Enums"]["contribution_frequency"]
            | null
          blocked_since?: string | null
          client_key?: string | null
          contribution_method?: Database["public"]["Enums"]["contribution_method"]
          created_at?: string
          due_date?: string | null
          id?: string
          name?: string
          next_contribution_on?: string | null
          schedule_day?: number | null
          target_kobo?: number
          user_id?: string
          withdrawal_kobo?: number | null
          withdrawn_at?: string | null
        }
        Relationships: []
      }
      sim_accounts: {
        Row: {
          account_number: string
          name: string | null
          scenario: Database["public"]["Enums"]["sim_scenario"]
        }
        Insert: {
          account_number: string
          name?: string | null
          scenario: Database["public"]["Enums"]["sim_scenario"]
        }
        Update: {
          account_number?: string
          name?: string | null
          scenario?: Database["public"]["Enums"]["sim_scenario"]
        }
        Relationships: []
      }
      sim_banks: {
        Row: {
          code: string
          name: string
        }
        Insert: {
          code: string
          name: string
        }
        Update: {
          code?: string
          name?: string
        }
        Relationships: []
      }
      sim_clocks: {
        Row: {
          offset_days: number
          user_id: string
        }
        Insert: {
          offset_days?: number
          user_id: string
        }
        Update: {
          offset_days?: number
          user_id?: string
        }
        Relationships: []
      }
      sim_events: {
        Row: {
          deliveries: number
          event_key: string
          event_type: Database["public"]["Enums"]["sim_event_type"]
          id: string
          processed_at: string
          transfer_id: string
          user_id: string
        }
        Insert: {
          deliveries?: number
          event_key: string
          event_type: Database["public"]["Enums"]["sim_event_type"]
          id?: string
          processed_at?: string
          transfer_id: string
          user_id: string
        }
        Update: {
          deliveries?: number
          event_key?: string
          event_type?: Database["public"]["Enums"]["sim_event_type"]
          id?: string
          processed_at?: string
          transfer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sim_events_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "sim_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      sim_transfers: {
        Row: {
          amount_kobo: number
          counterparty: string
          created_at: string
          direction: Database["public"]["Enums"]["sim_direction"]
          id: string
          idempotency_key: string
          reference: string
          reverse_after: string | null
          scenario: Database["public"]["Enums"]["sim_scenario"]
          settle_after: string | null
          settled_at: string | null
          status: Database["public"]["Enums"]["sim_transfer_status"]
          user_id: string
        }
        Insert: {
          amount_kobo: number
          counterparty: string
          created_at?: string
          direction: Database["public"]["Enums"]["sim_direction"]
          id?: string
          idempotency_key: string
          reference: string
          reverse_after?: string | null
          scenario: Database["public"]["Enums"]["sim_scenario"]
          settle_after?: string | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["sim_transfer_status"]
          user_id: string
        }
        Update: {
          amount_kobo?: number
          counterparty?: string
          created_at?: string
          direction?: Database["public"]["Enums"]["sim_direction"]
          id?: string
          idempotency_key?: string
          reference?: string
          reverse_after?: string | null
          scenario?: Database["public"]["Enums"]["sim_scenario"]
          settle_after?: string | null
          settled_at?: string | null
          status?: Database["public"]["Enums"]["sim_transfer_status"]
          user_id?: string
        }
        Relationships: []
      }
      student_verifications: {
        Row: {
          course: string
          institution: string
          level: string
          matric_number: string
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          school_id_file_name: string
          school_id_path: string
          status: Database["public"]["Enums"]["verification_status"]
          submitted_at: string
          user_id: string
        }
        Insert: {
          course: string
          institution: string
          level: string
          matric_number: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id_file_name?: string
          school_id_path: string
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string
          user_id: string
        }
        Update: {
          course?: string
          institution?: string
          level?: string
          matric_number?: string
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          school_id_file_name?: string
          school_id_path?: string
          status?: Database["public"]["Enums"]["verification_status"]
          submitted_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount_kobo: number
          category: string
          commitment_id: string | null
          created_at: string
          deleted_at: string | null
          goal_id: string | null
          id: string
          idempotency_key: string
          kind: Database["public"]["Enums"]["transaction_kind"]
          note: string
          occurred_on: string
          receipt_created_at: string | null
          receipt_number: string | null
          recipient_account_number: string | null
          recipient_bank: string | null
          recipient_name: string | null
          sim_transfer_id: string | null
          source: Database["public"]["Enums"]["transaction_source"]
          status: Database["public"]["Enums"]["transaction_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_kobo: number
          category: string
          commitment_id?: string | null
          created_at?: string
          deleted_at?: string | null
          goal_id?: string | null
          id?: string
          idempotency_key: string
          kind: Database["public"]["Enums"]["transaction_kind"]
          note?: string
          occurred_on: string
          receipt_created_at?: string | null
          receipt_number?: string | null
          recipient_account_number?: string | null
          recipient_bank?: string | null
          recipient_name?: string | null
          sim_transfer_id?: string | null
          source?: Database["public"]["Enums"]["transaction_source"]
          status?: Database["public"]["Enums"]["transaction_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_kobo?: number
          category?: string
          commitment_id?: string | null
          created_at?: string
          deleted_at?: string | null
          goal_id?: string | null
          id?: string
          idempotency_key?: string
          kind?: Database["public"]["Enums"]["transaction_kind"]
          note?: string
          occurred_on?: string
          receipt_created_at?: string | null
          receipt_number?: string | null
          recipient_account_number?: string | null
          recipient_bank?: string | null
          recipient_name?: string | null
          sim_transfer_id?: string | null
          source?: Database["public"]["Enums"]["transaction_source"]
          status?: Database["public"]["Enums"]["transaction_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_commitment_id_fkey"
            columns: ["commitment_id"]
            isOneToOne: false
            referencedRelation: "lock_commitments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "goal_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_goal_id_fkey"
            columns: ["goal_id"]
            isOneToOne: false
            referencedRelation: "savings_goals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_sim_transfer_fkey"
            columns: ["sim_transfer_id"]
            isOneToOne: false
            referencedRelation: "sim_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_pins: {
        Row: {
          failed_attempts: number
          locked_until: string | null
          pin_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          failed_attempts?: number
          locked_until?: string | null
          pin_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          failed_attempts?: number
          locked_until?: string | null
          pin_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallets: {
        Row: {
          created_at: string
          currency: string
          reference: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          reference: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          reference?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      budget_usage: {
        Row: {
          amount_kobo: number | null
          category: string | null
          created_at: string | null
          id: string | null
          month: string | null
          spent_kobo: number | null
          user_id: string | null
        }
        Relationships: []
      }
      goal_progress: {
        Row: {
          auto_amount_kobo: number | null
          auto_enabled: boolean | null
          auto_frequency:
            | Database["public"]["Enums"]["contribution_frequency"]
            | null
          blocked_since: string | null
          contribution_method:
            | Database["public"]["Enums"]["contribution_method"]
            | null
          created_at: string | null
          due_date: string | null
          id: string | null
          name: string | null
          next_contribution_on: string | null
          saved_kobo: number | null
          schedule_day: number | null
          target_kobo: number | null
          user_id: string | null
          withdrawal_kobo: number | null
          withdrawn_at: string | null
        }
        Relationships: []
      }
      wallet_balances: {
        Row: {
          balance_kobo: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_list_verifications: { Args: never; Returns: Json }
      collect_lock_commitment: {
        Args: { p_commitment: string; p_pin: string }
        Returns: Json
      }
      contribute_to_goal: {
        Args: {
          p_amount: number
          p_goal: string
          p_idempotency_key: string
          p_pin: string
        }
        Returns: Json
      }
      create_budget: {
        Args: { p_amount: number; p_category: string }
        Returns: Json
      }
      create_goal: {
        Args: {
          p_due_date: string
          p_idempotency_key: string
          p_name: string
          p_target: number
        }
        Returns: Json
      }
      create_lock_commitment: {
        Args: {
          p_amount: number
          p_description: string
          p_idempotency_key: string
          p_pin: string
          p_plan_months: number
          p_start_date: string
        }
        Returns: Json
      }
      create_wallet: { Args: { p_pin: string }; Returns: Json }
      delete_transaction: {
        Args: { p_id: string; p_pin: string }
        Returns: Json
      }
      export_my_data: { Args: never; Returns: Json }
      get_app_today: { Args: never; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      pause_goal_contributions: { Args: { p_goal: string }; Returns: Json }
      record_income: {
        Args: {
          p_amount: number
          p_category: string
          p_idempotency_key: string
          p_note: string
          p_occurred_on: string
        }
        Returns: Json
      }
      reset_pin: {
        Args: { p_new_pin: string; p_password: string }
        Returns: Json
      }
      resolve_recipient: {
        Args: { p_account_number: string; p_bank_code: string }
        Returns: Json
      }
      review_student_verification: {
        Args: { p_approve: boolean; p_reason: string; p_user: string }
        Returns: Json
      }
      set_goal_contribution_settings: {
        Args: {
          p_amount: number
          p_frequency: Database["public"]["Enums"]["contribution_frequency"]
          p_goal: string
          p_method: Database["public"]["Enums"]["contribution_method"]
          p_pin: string
        }
        Returns: Json
      }
      set_opening_balance: {
        Args: { p_amount: number; p_idempotency_key: string }
        Returns: Json
      }
      set_school_status: {
        Args: { p_status: Database["public"]["Enums"]["school_status"] }
        Returns: Json
      }
      sim_advance_days: { Args: { p_days: number }; Returns: Json }
      sim_incoming_transfer: {
        Args: { p_amount: number; p_idempotency_key: string; p_sender: string }
        Returns: Json
      }
      sim_list_banks: { Args: never; Returns: Json }
      sim_replay_event: { Args: { p_event: string }; Returns: Json }
      sim_reset_my_data: { Args: never; Returns: Json }
      sim_settle_transfer: {
        Args: {
          p_outcome: Database["public"]["Enums"]["sim_event_type"]
          p_transfer: string
        }
        Returns: Json
      }
      sim_tick: { Args: never; Returns: Json }
      start_transfer: {
        Args: {
          p_account_number: string
          p_amount: number
          p_bank_code: string
          p_category: string
          p_idempotency_key: string
          p_kind: string
          p_note: string
          p_occurred_on: string
          p_pin: string
        }
        Returns: Json
      }
      submit_student_verification: {
        Args: {
          p_course: string
          p_institution: string
          p_level: string
          p_matric_number: string
          p_school_id_file_name: string
          p_school_id_path: string
        }
        Returns: Json
      }
      update_transaction: {
        Args: {
          p_amount: number
          p_category: string
          p_id: string
          p_note: string
          p_occurred_on: string
          p_pin: string
        }
        Returns: Json
      }
      withdraw_goal: {
        Args: { p_expected_saved: number; p_goal: string; p_pin: string }
        Returns: Json
      }
    }
    Enums: {
      contribution_frequency: "daily" | "weekly" | "monthly"
      contribution_method: "auto" | "manual" | "none"
      school_status: "in-school" | "out-of-school"
      sim_direction: "incoming" | "outgoing"
      sim_event_type: "success" | "failed" | "reversed"
      sim_scenario: "success" | "fail" | "hold" | "reverse" | "lookup_fail"
      sim_transfer_status: "pending" | "success" | "failed" | "reversed"
      transaction_kind:
        | "income"
        | "opening_balance"
        | "deposit"
        | "goal_withdrawal"
        | "lock_collection"
        | "transfer_reversal"
        | "expense"
        | "withdrawal"
        | "goal_contribution"
        | "lock_deposit"
        | "lock_fee"
      transaction_source: "manual" | "auto" | "simulated_bank"
      transaction_status: "pending" | "completed" | "failed"
      verification_status: "pending" | "verified" | "rejected"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      contribution_frequency: ["daily", "weekly", "monthly"],
      contribution_method: ["auto", "manual", "none"],
      school_status: ["in-school", "out-of-school"],
      sim_direction: ["incoming", "outgoing"],
      sim_event_type: ["success", "failed", "reversed"],
      sim_scenario: ["success", "fail", "hold", "reverse", "lookup_fail"],
      sim_transfer_status: ["pending", "success", "failed", "reversed"],
      transaction_kind: [
        "income",
        "opening_balance",
        "deposit",
        "goal_withdrawal",
        "lock_collection",
        "transfer_reversal",
        "expense",
        "withdrawal",
        "goal_contribution",
        "lock_deposit",
        "lock_fee",
      ],
      transaction_source: ["manual", "auto", "simulated_bank"],
      transaction_status: ["pending", "completed", "failed"],
      verification_status: ["pending", "verified", "rejected"],
    },
  },
} as const
