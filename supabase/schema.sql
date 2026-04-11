-- RapiQ Database Schema
-- GoBD / §146a AO / DSFinV-K v2.3 compliant

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Merchants ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS merchants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('cafe', 'bakery', 'restaurant', 'salon', 'retail', 'other')),
  address TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  postal_code TEXT NOT NULL DEFAULT '',
  legal_structure TEXT NOT NULL CHECK (legal_structure IN ('einzelunternehmer', 'gbr', 'gmbh', 'ug')),
  steuernummer TEXT NOT NULL,
  ust_id_nr TEXT,
  vat_profile TEXT NOT NULL DEFAULT 'mixed' CHECK (vat_profile IN ('7_only', '19_only', 'mixed')),
  -- fiskaly TSE fields
  tse_tss_id TEXT,
  tse_client_id TEXT,
  tse_serial_number TEXT,
  tse_certificate TEXT,
  -- Subscription
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'trial',
  subscription_plan TEXT DEFAULT 'starter',
  subscription_period_end TIMESTAMPTZ,
  trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),
  -- Settings
  logo_url TEXT,
  button_names JSONB DEFAULT '{"bakery":"Backwaren","cafe":"Heißgetränke","drinks":"Getränke","retail":"Sonstiges"}',
  default_vat_rates JSONB DEFAULT '{"bakery":7,"cafe":19,"drinks":19,"retail":19}',
  notification_prefs JSONB DEFAULT '{"end_of_day":true,"weekly_summary":true}',
  onboarding_completed BOOLEAN DEFAULT FALSE,
  first_use_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- ─── Transactions ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  transaction_number BIGINT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled', 'storno')),
  payment_method TEXT CHECK (payment_method IN ('cash', 'card')),
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_7_net DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_7_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_19_net DECIMAL(10,2) NOT NULL DEFAULT 0,
  vat_19_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  process_type TEXT NOT NULL DEFAULT 'Kassenbeleg-V1',
  -- fiskaly TSE data (mandatory per §6 KassenSichV)
  tse_tss_id TEXT,
  tse_tx_id TEXT,
  tse_serial TEXT,
  tse_transaction_number TEXT,
  tse_signature_counter INTEGER,
  tse_process_data TEXT,
  tse_start_time TIMESTAMPTZ,
  tse_finish_time TIMESTAMPTZ,
  tse_signature_base64 TEXT,
  tse_qr_code_data TEXT,
  -- Storno reference
  storno_of UUID REFERENCES transactions(id),
  receipt_url TEXT,
  cashier_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  finished_at TIMESTAMPTZ,
  UNIQUE(merchant_id, transaction_number)
);

-- ─── Transaction Lines ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transaction_lines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE RESTRICT,
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  vat_rate DECIMAL(5,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  vat_amount DECIMAL(10,2) NOT NULL,
  gross_amount DECIMAL(10,2) NOT NULL,
  category TEXT NOT NULL,
  menu_item_id UUID,
  is_discount BOOLEAN DEFAULT FALSE,
  discount_percent DECIMAL(5,2),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Menu Items ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  vat_rate DECIMAL(5,2) NOT NULL DEFAULT 19,
  category TEXT NOT NULL DEFAULT 'retail',
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Cashbook Entries ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cashbook_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  entry_date DATE NOT NULL,
  card_terminal_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  cash_counted DECIMAL(10,2) NOT NULL DEFAULT 0,
  cash_expected DECIMAL(10,2) NOT NULL DEFAULT 0,
  cash_difference DECIMAL(10,2) GENERATED ALWAYS AS (cash_counted - cash_expected) STORED,
  calculator_total DECIMAL(10,2) NOT NULL DEFAULT 0,
  note TEXT,
  tse_serial TEXT,
  tse_transaction_number TEXT,
  tse_signature_base64 TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(merchant_id, entry_date)
);

-- ─── Audit Log (immutable) ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES merchants(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Sequence counter for transaction numbers ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS transaction_counters (
  merchant_id UUID PRIMARY KEY REFERENCES merchants(id) ON DELETE CASCADE,
  last_number BIGINT NOT NULL DEFAULT 0
);

-- Function to get next transaction number atomically
CREATE OR REPLACE FUNCTION get_next_transaction_number(p_merchant_id UUID)
RETURNS BIGINT AS $$
DECLARE
  v_number BIGINT;
BEGIN
  INSERT INTO transaction_counters (merchant_id, last_number)
  VALUES (p_merchant_id, 1)
  ON CONFLICT (merchant_id) DO UPDATE
    SET last_number = transaction_counters.last_number + 1
  RETURNING last_number INTO v_number;
  RETURN v_number;
END;
$$ LANGUAGE plpgsql;

-- ─── Row Level Security ──────────────────────────────────────────────────────────
ALTER TABLE merchants ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cashbook_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_counters ENABLE ROW LEVEL SECURITY;

-- Merchants: user sees only their own merchant profile
CREATE POLICY "merchants_own" ON merchants
  FOR ALL USING (user_id = auth.uid());

-- Transactions: merchant sees only their own
CREATE POLICY "transactions_own" ON transactions
  FOR ALL USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Transaction lines: merchant sees only their own
CREATE POLICY "transaction_lines_own" ON transaction_lines
  FOR ALL USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Menu items: merchant sees only their own
CREATE POLICY "menu_items_own" ON menu_items
  FOR ALL USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Cashbook: merchant sees only their own
CREATE POLICY "cashbook_own" ON cashbook_entries
  FOR ALL USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Audit log: merchant reads only their own (no delete)
CREATE POLICY "audit_log_read_own" ON audit_log
  FOR SELECT USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Transaction counters
CREATE POLICY "counters_own" ON transaction_counters
  FOR ALL USING (
    merchant_id IN (SELECT id FROM merchants WHERE user_id = auth.uid())
  );

-- Public receipt access (receipts are public by URL)
CREATE POLICY "transactions_public_receipt" ON transactions
  FOR SELECT USING (status = 'completed');

-- ─── Updated_at trigger ──────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER merchants_updated_at
  BEFORE UPDATE ON merchants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── Prevent delete on immutable tables (GoBD) ───────────────────────────────────
CREATE OR REPLACE FUNCTION prevent_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Löschen ist nicht erlaubt. GoBD §146 AO verbietet das Löschen von Kassendaten.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER no_delete_transactions
  BEFORE DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

CREATE TRIGGER no_delete_transaction_lines
  BEFORE DELETE ON transaction_lines
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

CREATE TRIGGER no_delete_cashbook_entries
  BEFORE DELETE ON cashbook_entries
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

CREATE TRIGGER no_delete_audit_log
  BEFORE DELETE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION prevent_delete();

-- ─── Indexes ─────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_transactions_merchant_created ON transactions(merchant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_merchant_status ON transactions(merchant_id, status);
CREATE INDEX IF NOT EXISTS idx_transaction_lines_transaction ON transaction_lines(transaction_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_merchant ON menu_items(merchant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_cashbook_merchant_date ON cashbook_entries(merchant_id, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_merchant ON audit_log(merchant_id, created_at DESC);
