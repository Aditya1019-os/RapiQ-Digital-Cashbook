import { createClient } from '@/lib/supabase/server'
import { DashboardClient } from '@/components/dashboard/DashboardClient'
import { startOfDay, endOfDay, subDays, startOfMonth, endOfMonth } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TZ = 'Europe/Berlin'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, business_name, tse_serial_number, tse_tss_id, subscription_plan, trial_ends_at')
    .eq('user_id', user!.id)
    .single()

  if (!merchant) return <div>Fehler beim Laden</div>

  const now = toZonedTime(new Date(), TZ)
  const todayStart = startOfDay(now).toISOString()
  const todayEnd = endOfDay(now).toISOString()
  const monthStart = startOfMonth(now).toISOString()
  const monthEnd = endOfMonth(now).toISOString()
  const thirtyDaysAgo = subDays(now, 30).toISOString()
  const sevenDaysAgo = subDays(now, 7).toISOString()

  // Today's totals
  const { data: todayTx } = await supabase
    .from('transactions')
    .select('total, payment_method, finished_at')
    .eq('merchant_id', merchant.id)
    .eq('status', 'completed')
    .gte('finished_at', todayStart)
    .lte('finished_at', todayEnd)

  // Last 7 days for bar chart
  const { data: weekTx } = await supabase
    .from('transactions')
    .select('total, finished_at')
    .eq('merchant_id', merchant.id)
    .eq('status', 'completed')
    .gte('finished_at', sevenDaysAgo)
    .order('finished_at')

  // This month
  const { data: monthTx } = await supabase
    .from('transactions')
    .select('total, finished_at')
    .eq('merchant_id', merchant.id)
    .eq('status', 'completed')
    .gte('finished_at', monthStart)
    .lte('finished_at', monthEnd)

  // Last 30 days for heatmap
  const { data: thirtyDayTx } = await supabase
    .from('transactions')
    .select('total, finished_at')
    .eq('merchant_id', merchant.id)
    .eq('status', 'completed')
    .gte('finished_at', thirtyDaysAgo)
    .order('finished_at')

  // Recent transactions
  const { data: recentTx } = await supabase
    .from('transactions')
    .select('id, transaction_number, total, payment_method, finished_at, status')
    .eq('merchant_id', merchant.id)
    .order('finished_at', { ascending: false })
    .limit(8)

  return (
    <DashboardClient
      merchant={merchant}
      todayTx={todayTx || []}
      weekTx={weekTx || []}
      monthTx={monthTx || []}
      thirtyDayTx={thirtyDayTx || []}
      recentTx={recentTx || []}
    />
  )
}
