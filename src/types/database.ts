export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type BusinessCategory =
  | 'cafe'
  | 'bakery'
  | 'restaurant'
  | 'salon'
  | 'retail'
  | 'other'

export type LegalStructure =
  | 'einzelunternehmer'
  | 'gbr'
  | 'gmbh'
  | 'ug'

export type VatProfile = '7_only' | '19_only' | 'mixed'

export type PaymentMethod = 'cash' | 'card'

export type TransactionStatus = 'pending' | 'completed' | 'cancelled' | 'storno'

export type ProcessType = 'Kassenbeleg-V1' | 'Kassenbeleg-V1-Storno'

export interface Database {
  public: {
    Tables: {
      merchants: {
        Row: {
          id: string
          user_id: string
          business_name: string
          category: BusinessCategory
          address: string
          city: string
          postal_code: string
          legal_structure: LegalStructure
          steuernummer: string
          ust_id_nr: string | null
          vat_profile: VatProfile
          tse_client_id: string | null
          tse_serial_number: string | null
          tse_certificate: string | null
          onboarding_completed: boolean
          stripe_customer_id: string | null
          subscription_status: string | null
          subscription_plan: string | null
          subscription_period_end: string | null
          logo_url: string | null
          button_names: Json | null
          default_vat_rates: Json | null
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['merchants']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['merchants']['Insert']>
      }
      transactions: {
        Row: {
          id: string
          merchant_id: string
          transaction_number: number
          status: TransactionStatus
          payment_method: PaymentMethod | null
          subtotal: number
          vat_7_net: number
          vat_7_amount: number
          vat_19_net: number
          vat_19_amount: number
          total: number
          process_type: ProcessType
          tse_serial: string | null
          tse_transaction_number: string | null
          tse_signature_counter: number | null
          tse_process_data: string | null
          tse_start_time: string | null
          tse_finish_time: string | null
          tse_signature_base64: string | null
          tse_signing_time: string | null
          storno_of: string | null
          receipt_url: string | null
          cashier_note: string | null
          created_at: string
          finished_at: string | null
        }
        Insert: Omit<Database['public']['Tables']['transactions']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['transactions']['Insert']>
      }
      transaction_lines: {
        Row: {
          id: string
          transaction_id: string
          merchant_id: string
          description: string
          quantity: number
          unit_price: number
          vat_rate: number
          net_amount: number
          vat_amount: number
          gross_amount: number
          category: string
          menu_item_id: string | null
          is_discount: boolean
          discount_percent: number | null
          sort_order: number
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['transaction_lines']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['transaction_lines']['Insert']>
      }
      menu_items: {
        Row: {
          id: string
          merchant_id: string
          name: string
          price: number
          vat_rate: number
          category: string
          is_active: boolean
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: Omit<Database['public']['Tables']['menu_items']['Row'], 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Database['public']['Tables']['menu_items']['Insert']>
      }
      cashbook_entries: {
        Row: {
          id: string
          merchant_id: string
          entry_date: string
          card_terminal_total: number
          cash_counted: number
          cash_expected: number
          cash_difference: number
          calculator_total: number
          note: string | null
          tse_serial: string | null
          tse_transaction_number: string | null
          tse_signature_base64: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['cashbook_entries']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['cashbook_entries']['Insert']>
      }
      audit_log: {
        Row: {
          id: string
          merchant_id: string
          action: string
          entity_type: string
          entity_id: string
          old_values: Json | null
          new_values: Json | null
          ip_address: string | null
          user_agent: string | null
          created_at: string
        }
        Insert: Omit<Database['public']['Tables']['audit_log']['Row'], 'id' | 'created_at'>
        Update: never
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
  }
}

// Convenience types
export type Merchant = Database['public']['Tables']['merchants']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionLine = Database['public']['Tables']['transaction_lines']['Row']
export type MenuItem = Database['public']['Tables']['menu_items']['Row']
export type CashbookEntry = Database['public']['Tables']['cashbook_entries']['Row']
export type AuditLog = Database['public']['Tables']['audit_log']['Row']

export interface TransactionWithLines extends Transaction {
  transaction_lines: TransactionLine[]
  merchants?: Pick<Merchant, 'business_name' | 'address' | 'city' | 'postal_code' | 'steuernummer' | 'ust_id_nr' | 'logo_url'>
}
