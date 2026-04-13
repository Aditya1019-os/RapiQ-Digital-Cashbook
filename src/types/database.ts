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

// ─── Row types ───────────────────────────────────────────────────────────────

export interface MerchantRow {
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
  tse_tss_id: string | null
  tse_client_id: string | null
  tse_serial_number: string | null
  tse_certificate: string | null
  stripe_customer_id: string | null
  subscription_status: string | null
  subscription_plan: string | null
  subscription_period_end: string | null
  trial_ends_at: string | null
  logo_url: string | null
  button_names: Json | null
  default_vat_rates: Json | null
  notification_prefs: Json | null
  onboarding_completed: boolean
  first_use_date: string | null
  created_at: string
  updated_at: string
}

export interface TransactionRow {
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
  process_type: string
  tse_tss_id: string | null
  tse_tx_id: string | null
  tse_serial: string | null
  tse_transaction_number: string | null
  tse_signature_counter: number | null
  tse_process_data: string | null
  tse_start_time: string | null
  tse_finish_time: string | null
  tse_signature_base64: string | null
  tse_qr_code_data: string | null
  storno_of: string | null
  receipt_url: string | null
  cashier_note: string | null
  created_at: string
  finished_at: string | null
}

export interface TransactionLineRow {
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

export interface MenuItemRow {
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

export interface CashbookEntryRow {
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

export interface AuditLogRow {
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

// ─── Supabase Database type ───────────────────────────────────────────────────

export interface Database {
  public: {
    Tables: {
      merchants: {
        Row: MerchantRow
        Insert: Omit<MerchantRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<MerchantRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      transactions: {
        Row: TransactionRow
        Insert: Omit<TransactionRow, 'id' | 'created_at'>
        Update: Partial<Omit<TransactionRow, 'id' | 'created_at'>>
        Relationships: []
      }
      transaction_lines: {
        Row: TransactionLineRow
        Insert: Omit<TransactionLineRow, 'id' | 'created_at'>
        Update: Partial<Omit<TransactionLineRow, 'id' | 'created_at'>>
        Relationships: []
      }
      menu_items: {
        Row: MenuItemRow
        Insert: Omit<MenuItemRow, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<MenuItemRow, 'id' | 'created_at' | 'updated_at'>>
        Relationships: []
      }
      cashbook_entries: {
        Row: CashbookEntryRow
        Insert: Omit<CashbookEntryRow, 'id' | 'created_at' | 'cash_difference'>
        Update: Partial<Omit<CashbookEntryRow, 'id' | 'created_at' | 'cash_difference'>>
        Relationships: []
      }
      audit_log: {
        Row: AuditLogRow
        Insert: Omit<AuditLogRow, 'id' | 'created_at'>
        Update: never
        Relationships: []
      }
      transaction_counters: {
        Row: { merchant_id: string; last_number: number }
        Insert: { merchant_id: string; last_number: number }
        Update: { last_number?: number }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      get_next_transaction_number: {
        Args: { p_merchant_id: string }
        Returns: number
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

// Convenience aliases
export type Merchant = MerchantRow
export type Transaction = TransactionRow
export type TransactionLine = TransactionLineRow
export type MenuItem = MenuItemRow
export type CashbookEntry = CashbookEntryRow
export type AuditLog = AuditLogRow

export interface TransactionWithLines extends TransactionRow {
  transaction_lines: TransactionLineRow[]
  merchants?: Pick<MerchantRow, 'business_name' | 'address' | 'city' | 'postal_code' | 'steuernummer' | 'ust_id_nr' | 'logo_url'>
}
