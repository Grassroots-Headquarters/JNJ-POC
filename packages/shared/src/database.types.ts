
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
            "companies": {
                  Row: {
                    "created_at": string,"id": string,"name": string,"referral_code": string,"referred_by_company_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"name": string,"referral_code": string,"referred_by_company_id"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"name"?: string,"referral_code"?: string,"referred_by_company_id"?: string | null
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
                    "accepted_at": string | null,"accepted_by": string | null,"cancelled_at": string | null,"code": string,"company_id": string,"created_at": string,"created_by": string | null,"expires_at": string,"full_name": string | null,"id": string,"phone": string,"role": Database["public"]['Enums']["role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"cancelled_at"?: string | null,"code": string,"company_id": string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string,"full_name"?: string | null,"id"?: string,"phone": string,"role": Database["public"]['Enums']["role"]
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"cancelled_at"?: string | null,"code"?: string,"company_id"?: string,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string,"full_name"?: string | null,"id"?: string,"phone"?: string,"role"?: Database["public"]['Enums']["role"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "invites_company_id_fkey"
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
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "accept_invite":
{ Args: { "code": string,"full_name": string,"trade"?: string }; Returns: string
                           },
"cancel_invite":
{ Args: { "invite": string }; Returns: undefined
                           },
"change_member_role":
{ Args: { "company": string,"role": Database["public"]['Enums']["role"],"user_id": string }; Returns: undefined
                           },
"create_invite":
{ Args: { "company": string,"full_name"?: string,"phone": string,"role": Database["public"]['Enums']["role"] }; Returns: {
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
                           }
          }
          Enums: {
            "role": "admin"|"site_team"|"subcontractor"
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
            "role": ["admin", "site_team", "subcontractor"]
          }
        }
} as const
