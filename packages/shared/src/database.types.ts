
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "add_on_subscriptions": {
                  Row: {
                    "active": boolean,"add_on": Database["public"]['Enums']["add_on"],"company_id": string,"created_at": string,"current_period_end": string | null,"status": string,"stripe_subscription_id": string,"stripe_subscription_item_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: never,"add_on": Database["public"]['Enums']["add_on"],"company_id": string,"created_at"?: string,"current_period_end"?: string | null,"status": string,"stripe_subscription_id": string,"stripe_subscription_item_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "active"?: never,"add_on"?: Database["public"]['Enums']["add_on"],"company_id"?: string,"created_at"?: string,"current_period_end"?: string | null,"status"?: string,"stripe_subscription_id"?: string,"stripe_subscription_item_id"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "add_on_subscriptions_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"companies": {
                  Row: {
                    "billing_email": string | null,"created_at": string,"id": string,"name": string,"referral_code": string,"referred_by_company_id": string | null,"stripe_customer_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "billing_email"?: string | null,"created_at"?: string,"id"?: string,"name": string,"referral_code": string,"referred_by_company_id"?: string | null,"stripe_customer_id"?: string | null
                  }
                  Update: {
                    "billing_email"?: string | null,"created_at"?: string,"id"?: string,"name"?: string,"referral_code"?: string,"referred_by_company_id"?: string | null,"stripe_customer_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "companies_referred_by_company_id_fkey"
      columns: ["referred_by_company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"memberships": {
                  Row: {
                    "company_id": string,"created_at": string,"role": Database["public"]['Enums']["role"],"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"role": Database["public"]['Enums']["role"],"user_id": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"role"?: Database["public"]['Enums']["role"],"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "memberships_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"platform_status": {
                  Row: {
                    "id": number,"message": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id": number,"message": string
                  }
                  Update: {
                    "id"?: number,"message"?: string
                  }
                  Relationships: [
                    
                  ]
                },"profiles": {
                  Row: {
                    "billing_email": string | null,"created_at": string,"full_name": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "billing_email"?: string | null,"created_at"?: string,"full_name"?: string,"user_id": string
                  }
                  Update: {
                    "billing_email"?: string | null,"created_at"?: string,"full_name"?: string,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"referral_rewards": {
                  Row: {
                    "coupon": string,"granted_at": string,"referred_company_id": string,"referred_subscription_id": string,"referring_company_id": string,"referring_subscription_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "coupon"?: string,"granted_at"?: string,"referred_company_id": string,"referred_subscription_id": string,"referring_company_id": string,"referring_subscription_id"?: string | null
                  }
                  Update: {
                    "coupon"?: string,"granted_at"?: string,"referred_company_id"?: string,"referred_subscription_id"?: string,"referring_company_id"?: string,"referring_subscription_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "referral_rewards_referred_company_id_fkey"
      columns: ["referred_company_id"]
isOneToOne: true
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "referral_rewards_referring_company_id_fkey"
      columns: ["referring_company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"stripe_events": {
                  Row: {
                    "id": string,"received_at": string,"type": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id": string,"received_at"?: string,"type": string
                  }
                  Update: {
                    "id"?: string,"received_at"?: string,"type"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "apply_stripe_subscription":
{ Args: { "add_on": Database["public"]['Enums']["add_on"],"company": string,"item_id": string,"period_end": string,"status": string,"subscription_id": string }; Returns: undefined
                           },
"company_has_add_on":
{ Args: { "add_on": Database["public"]['Enums']["add_on"],"company": string }; Returns: boolean
                           },
"generate_referral_code":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"is_admin":
{ Args: { "company": string }; Returns: boolean
                           },
"is_member":
{ Args: { "company": string }; Returns: boolean
                           },
"membership_role":
{ Args: { "company": string }; Returns: Database["public"]['Enums']["role"]
                           },
"sign_up_company":
{ Args: { "company_name": string,"full_name": string,"referral_code"?: string }; Returns: string
                           }
          }
          Enums: {
            "add_on": "client_portal","role": "admin"|"site_team"|"subcontractor"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "add_on": ["client_portal"],"role": ["admin", "site_team", "subcontractor"]
          }
        }
} as const
