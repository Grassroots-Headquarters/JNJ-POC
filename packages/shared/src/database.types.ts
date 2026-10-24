
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
                    "active": boolean,"add_on": Database["public"]['Enums']["add_on"],"company_id": string,"created_at": string,"current_period_end": string | null,"last_event_at": string | null,"status": string,"stripe_subscription_id": string,"stripe_subscription_item_id": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: never,"add_on": Database["public"]['Enums']["add_on"],"company_id": string,"created_at"?: string,"current_period_end"?: string | null,"last_event_at"?: string | null,"status": string,"stripe_subscription_id": string,"stripe_subscription_item_id"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "active"?: never,"add_on"?: Database["public"]['Enums']["add_on"],"company_id"?: string,"created_at"?: string,"current_period_end"?: string | null,"last_event_at"?: string | null,"status"?: string,"stripe_subscription_id"?: string,"stripe_subscription_item_id"?: string | null,"updated_at"?: string
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
                },"assignments": {
                  Row: {
                    "company_id": string,"created_at": string,"is_job_lead": boolean,"job_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"is_job_lead"?: boolean,"job_id": string,"user_id": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"is_job_lead"?: boolean,"job_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "assignments_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "assignments_job_id_company_id_fkey"
      columns: ["job_id","company_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id","company_id"]
    },{
      foreignKeyName: "assignments_user_id_profiles_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
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
                },"invites": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"cancelled_at": string | null,"code": string,"company_id": string,"created_at": string,"created_by": string | null,"expires_at": string,"full_name": string | null,"id": string,"job_id": string | null,"phone": string,"role": Database["public"]['Enums']["role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"cancelled_at"?: string | null,"code": string,"company_id": string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string,"full_name"?: string | null,"id"?: string,"job_id"?: string | null,"phone": string,"role": Database["public"]['Enums']["role"]
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"cancelled_at"?: string | null,"code"?: string,"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string,"full_name"?: string | null,"id"?: string,"job_id"?: string | null,"phone"?: string,"role"?: Database["public"]['Enums']["role"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "invites_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invites_job_id_fkey"
      columns: ["job_id"]
isOneToOne: false
      referencedRelation: "jobs"
      referencedColumns: ["id"]
    }
                  ]
                },"jobs": {
                  Row: {
                    "address": string | null,"company_id": string,"created_at": string,"created_by": string | null,"id": string,"name": string,"start_date": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "address"?: string | null,"company_id": string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string,"start_date"?: string | null
                  }
                  Update: {
                    "address"?: string | null,"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string,"start_date"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "jobs_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    }
                  ]
                },"memberships": {
                  Row: {
                    "company_id": string,"created_at": string,"role": Database["public"]['Enums']["role"],"trade": string | null,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "company_id": string,"created_at"?: string,"role": Database["public"]['Enums']["role"],"trade"?: string | null,"user_id": string
                  }
                  Update: {
                    "company_id"?: string,"created_at"?: string,"role"?: Database["public"]['Enums']["role"],"trade"?: string | null,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "memberships_company_id_fkey"
      columns: ["company_id"]
isOneToOne: false
      referencedRelation: "companies"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "memberships_user_id_profiles_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["user_id"]
    }
                  ]
                },"outbound_sms": {
                  Row: {
                    "body": string,"created_at": string,"id": number,"to": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"created_at"?: string,"id"?: never,"to": string
                  }
                  Update: {
                    "body"?: string,"created_at"?: string,"id"?: never,"to"?: string
                  }
                  Relationships: [
                    
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
            "accept_invite":
{ Args: { "code": string,"full_name": string,"trade"?: string }; Returns: string
                           },
"add_on_status_is_on":
{ Args: { "status": string }; Returns: boolean
                           },
"apply_stripe_subscription":
{ Args: { "add_on": Database["public"]['Enums']["add_on"],"company": string,"event_created": string,"item_id": string,"period_end": string,"status": string,"subscription_id": string }; Returns: undefined
                           },
"assign_to_job":
{ Args: { "job": string,"job_lead"?: boolean,"user_id": string }; Returns: undefined
                           },
"cancel_invite":
{ Args: { "invite": string }; Returns: undefined
                           },
"change_member_role":
{ Args: { "company": string,"role": Database["public"]['Enums']["role"],"user_id": string }; Returns: undefined
                           },
"company_has_add_on":
{ Args: { "add_on": Database["public"]['Enums']["add_on"],"company": string }; Returns: boolean
                           },
"create_invite":
{ Args: { "company": string,"full_name"?: string,"job"?: string,"phone": string,"role": Database["public"]['Enums']["role"] }; Returns: {
              "accepted_at": string | null,
"accepted_by": string | null,
"cancelled_at": string | null,
"code": string,
"company_id": string,
"created_at": string,
"created_by": string | null,
"expires_at": string,
"full_name": string | null,
"id": string,
"job_id": string | null,
"phone": string,
"role": Database["public"]['Enums']["role"]
            }
                          SetofOptions: {
        from: "*"
        to: "invites"
        isOneToOne: true
        isSetofReturn: false
      } },
"generate_invite_code":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"generate_referral_code":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"invite_preview":
{ Args: { "code": string }; Returns: {
              "company_name": string,"invited_name": string,"role": Database["public"]['Enums']["role"],"status": string
            }[]
                           },
"invite_status":
{ Args: { "accepted_at": string,"cancelled_at": string,"expires_at": string }; Returns: string
                           },
"is_admin":
{ Args: { "company": string }; Returns: boolean
                           },
"is_assigned":
{ Args: { "job": string }; Returns: boolean
                           },
"is_member":
{ Args: { "company": string }; Returns: boolean
                           },
"membership_role":
{ Args: { "company": string }; Returns: Database["public"]['Enums']["role"]
                           },
"normalise_phone":
{ Args: { "input": string }; Returns: string
                           },
"remove_member":
{ Args: { "company": string,"user_id": string }; Returns: undefined
                           },
"resend_invite":
{ Args: { "invite": string }; Returns: {
              "accepted_at": string | null,
"accepted_by": string | null,
"cancelled_at": string | null,
"code": string,
"company_id": string,
"created_at": string,
"created_by": string | null,
"expires_at": string,
"full_name": string | null,
"id": string,
"job_id": string | null,
"phone": string,
"role": Database["public"]['Enums']["role"]
            }
                          SetofOptions: {
        from: "*"
        to: "invites"
        isOneToOne: true
        isSetofReturn: false
      } },
"sign_up_company":
{ Args: { "company_name": string,"full_name": string,"referral_code"?: string }; Returns: string
                           },
"unassign_from_job":
{ Args: { "job": string,"user_id": string }; Returns: undefined
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
