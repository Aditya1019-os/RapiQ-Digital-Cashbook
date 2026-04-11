import { createClient } from '@/lib/supabase/server'
import { TransactionsClient } from '@/components/transactions/TransactionsClient'

export default async function TransactionsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id')
    .eq('user_id', user!.id)
    .single()

  const { data: transactions } = await supabase
    .from('transactions')
    .select('*, transaction_lines(id, description, quantity, unit_price, vat_rate, gross_amount)')
    .eq('merchant_id', merchant!.id)
    .order('transaction_number', { ascending: false })
    .limit(100)

  return <TransactionsClient merchant={merchant!} transactions={transactions || []} />
}
