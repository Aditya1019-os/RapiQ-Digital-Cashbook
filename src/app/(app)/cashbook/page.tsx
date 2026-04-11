import { createClient } from '@/lib/supabase/server'
import { CashbookClient } from '@/components/cashbook/CashbookClient'
import { startOfDay, endOfDay } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

export default async function CashbookPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, business_name')
    .eq('user_id', user!.id)
    .single()

  const now = toZonedTime(new Date(), 'Europe/Berlin')
  const todayStart = startOfDay(now).toISOString()
  const todayEnd = endOfDay(now).toISOString()

  // Today's calculator cash total
  const { data: todayTx } = await supabase
    .from('transactions')
    .select('total, payment_method')
    .eq('merchant_id', merchant!.id)
    .eq('status', 'completed')
    .eq('payment_method', 'cash')
    .gte('finished_at', todayStart)
    .lte('finished_at', todayEnd)

  const cashExpected = (todayTx || []).reduce((s, t) => s + t.total, 0)

  // Today's cashbook entry if exists
  const today = now.toISOString().split('T')[0]
  const { data: todayEntry } = await supabase
    .from('cashbook_entries')
    .select('*')
    .eq('merchant_id', merchant!.id)
    .eq('entry_date', today)
    .single()

  // Audit log (last 30 entries)
  const { data: auditLog } = await supabase
    .from('audit_log')
    .select('*')
    .eq('merchant_id', merchant!.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Last 10 cashbook entries
  const { data: pastEntries } = await supabase
    .from('cashbook_entries')
    .select('*')
    .eq('merchant_id', merchant!.id)
    .order('entry_date', { ascending: false })
    .limit(10)

  return (
    <CashbookClient
      merchant={merchant!}
      cashExpected={cashExpected}
      todayEntry={todayEntry || null}
      auditLog={auditLog || []}
      pastEntries={pastEntries || []}
      today={today}
    />
  )
}
