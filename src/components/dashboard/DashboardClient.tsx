'use client'
import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend
} from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { formatCurrency, formatDate } from '@/lib/utils'
import { format, subDays, startOfDay, eachDayOfInterval } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'
import { Calculator, TrendingUp, CreditCard, Banknote, Shield, ArrowRight, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TxRow { total: number; payment_method?: string | null; finished_at?: string | null; id?: string; transaction_number?: number; status?: string }

interface Props {
  merchant: { id: string; business_name: string; tse_serial_number: string | null; tse_tss_id: string | null; subscription_plan: string | null; trial_ends_at: string | null }
  todayTx: TxRow[]
  weekTx: TxRow[]
  monthTx: TxRow[]
  thirtyDayTx: TxRow[]
  recentTx: TxRow[]
}

const TZ = 'Europe/Berlin'

function sumTx(txs: TxRow[]) { return txs.reduce((s, t) => s + (t.total || 0), 0) }

export function DashboardClient({ merchant, todayTx, weekTx, monthTx, thirtyDayTx, recentTx }: Props) {
  const router = useRouter()

  // Real-time updates
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel('dashboard-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'transactions',
        filter: `merchant_id=eq.${merchant.id}`,
      }, () => { router.refresh() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [merchant.id, router])

  // Today stats
  const todayTotal = sumTx(todayTx)
  const todayCash = sumTx(todayTx.filter(t => t.payment_method === 'cash'))
  const todayCard = sumTx(todayTx.filter(t => t.payment_method === 'card'))
  const todayCount = todayTx.length

  // Month stats
  const monthTotal = sumTx(monthTx)

  // Weekly bar chart data
  const weekData = useMemo(() => {
    const now = toZonedTime(new Date(), TZ)
    return eachDayOfInterval({ start: subDays(now, 6), end: now }).map(day => {
      const key = format(day, 'yyyy-MM-dd')
      const dayTotal = weekTx
        .filter(t => t.finished_at && format(toZonedTime(new Date(t.finished_at), TZ), 'yyyy-MM-dd') === key)
        .reduce((s, t) => s + t.total, 0)
      return { day: format(day, 'EEE', { locale: undefined }), date: key, total: dayTotal }
    })
  }, [weekTx])

  // Heatmap: last 30 days
  const heatmapData = useMemo(() => {
    const now = toZonedTime(new Date(), TZ)
    const days = eachDayOfInterval({ start: subDays(now, 29), end: now })
    const dailyTotals = days.map(day => {
      const key = format(day, 'yyyy-MM-dd')
      const total = thirtyDayTx
        .filter(t => t.finished_at && format(toZonedTime(new Date(t.finished_at), TZ), 'yyyy-MM-dd') === key)
        .reduce((s, t) => s + t.total, 0)
      return { date: key, total, label: format(day, 'd.M.') }
    })
    const avg = dailyTotals.filter(d => d.total > 0).reduce((s, d, _, a) => s + d.total / a.length, 0) || 1
    return dailyTotals.map(d => ({
      ...d,
      level: d.total === 0 ? 'none' : d.total >= avg * 1.2 ? 'high' : d.total >= avg * 0.8 ? 'mid' : 'low',
    }))
  }, [thirtyDayTx])

  // Donut chart data
  const pieData = [
    { name: 'Bar', value: todayCash, color: '#22c55e' },
    { name: 'Karte', value: todayCard, color: '#3b82f6' },
  ].filter(d => d.value > 0)

  // Best day this month
  const monthDailyTotals = useMemo(() => {
    const byDay: Record<string, number> = {}
    monthTx.forEach(t => {
      if (!t.finished_at) return
      const key = format(toZonedTime(new Date(t.finished_at), TZ), 'yyyy-MM-dd')
      byDay[key] = (byDay[key] || 0) + t.total
    })
    return Object.entries(byDay).map(([date, total]) => ({ date, total }))
  }, [monthTx])

  const bestDay = monthDailyTotals.reduce((best, d) => d.total > best.total ? d : best, { date: '-', total: 0 })
  const avgDaily = monthDailyTotals.length > 0
    ? monthDailyTotals.reduce((s, d) => s + d.total, 0) / monthDailyTotals.length
    : 0

  const heatColors: Record<string, string> = {
    none: 'bg-gray-100 dark:bg-gray-800',
    low: 'bg-red-200 dark:bg-red-900/40',
    mid: 'bg-amber-200 dark:bg-amber-700/40',
    high: 'bg-green-300 dark:bg-green-700/50',
  }

  const trialEndsAt = merchant.trial_ends_at ? new Date(merchant.trial_ends_at) : null
  const isTrialExpiringSoon = trialEndsAt && (trialEndsAt.getTime() - Date.now()) < 3 * 24 * 60 * 60 * 1000

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-4xl pb-24 md:pb-6">
      {/* Trial warning */}
      {isTrialExpiringSoon && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Ihr Testzeitraum endet {trialEndsAt ? `am ${formatDate(trialEndsAt)}` : 'bald'}
            </p>
          </div>
          <Link href="/settings#billing" className="text-xs bg-amber-600 text-white px-3 py-1.5 rounded-lg font-medium">
            Upgrade
          </Link>
        </div>
      )}

      {/* Today header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Heute</h1>
          <p className="text-sm text-gray-500">{format(new Date(), 'EEEE, d. MMMM yyyy')}</p>
        </div>
        <Link
          href="/calculator"
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2.5 rounded-xl transition text-sm"
        >
          <Calculator className="h-4 w-4" />
          Zur Kasse
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="col-span-2 bg-indigo-600 text-white rounded-2xl p-5">
          <p className="text-indigo-200 text-sm">Tagesumsatz</p>
          <p className="text-4xl font-bold mt-1">{formatCurrency(todayTotal)}</p>
          <p className="text-indigo-200 text-sm mt-1">{todayCount} Buchungen</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 text-green-600 mb-2">
            <Banknote className="h-4 w-4" />
            <span className="text-xs font-medium">Bar</span>
          </div>
          <p className="text-xl font-bold">{formatCurrency(todayCash)}</p>
        </div>
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-2 text-blue-600 mb-2">
            <CreditCard className="h-4 w-4" />
            <span className="text-xs font-medium">Karte</span>
          </div>
          <p className="text-xl font-bold">{formatCurrency(todayCard)}</p>
        </div>
      </div>

      {/* Month stats row */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Monats-umsatz', value: formatCurrency(monthTotal), icon: TrendingUp, color: 'text-indigo-600' },
          { label: 'Bester Tag', value: bestDay.total > 0 ? formatCurrency(bestDay.total) : '—', icon: TrendingUp, color: 'text-green-600' },
          { label: 'Ø Tagesumsatz', value: avgDaily > 0 ? formatCurrency(avgDaily) : '—', icon: TrendingUp, color: 'text-amber-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800">
            <p className="text-xs text-gray-500 mb-1">{stat.label}</p>
            <p className="text-lg font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {/* Weekly bar chart */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800">
          <h3 className="font-semibold mb-3">Letzte 7 Tage</h3>
          <ResponsiveContainer width="100%" height={140}>
            <BarChart data={weekData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <XAxis dataKey="day" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `€${v}`} />
              <Tooltip
                formatter={(v: number) => [formatCurrency(v), 'Umsatz']}
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              />
              <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                {weekData.map((entry, i) => (
                  <Cell key={i} fill={i === weekData.length - 1 ? '#4f46e5' : '#c7d2fe'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment split donut */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800">
          <h3 className="font-semibold mb-3">Zahlungsarten heute</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={140}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={60}
                  dataKey="value"
                  paddingAngle={3}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Legend iconType="circle" iconSize={8} formatter={(v: string) => <span className="text-xs">{v}</span>} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-36 flex items-center justify-center text-gray-400 text-sm">
              Noch keine Buchungen heute
            </div>
          )}
        </div>
      </div>

      {/* Heatmap */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800">
        <h3 className="font-semibold mb-3">Umsatz letzte 30 Tage</h3>
        <div className="flex flex-wrap gap-1">
          {heatmapData.map(d => (
            <div
              key={d.date}
              title={`${d.label}: ${formatCurrency(d.total)}`}
              className={cn('w-7 h-7 rounded-md cursor-default transition', heatColors[d.level])}
            />
          ))}
        </div>
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
          <span>Weniger</span>
          {['none', 'low', 'mid', 'high'].map(l => (
            <div key={l} className={cn('w-3 h-3 rounded', heatColors[l])} />
          ))}
          <span>Mehr</span>
        </div>
      </div>

      {/* Recent transactions */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="font-semibold">Letzte Buchungen</h3>
          <Link href="/transactions" className="text-xs text-indigo-600 flex items-center gap-1">
            Alle <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {recentTx.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              Noch keine Buchungen
            </div>
          ) : (
            recentTx.map(tx => (
              <Link key={tx.id} href={`/receipts/${tx.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition">
                <div className="flex items-center gap-3">
                  <div className={cn('w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                    tx.payment_method === 'cash' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                  )}>
                    {tx.payment_method === 'cash' ? '€' : '▦'}
                  </div>
                  <div>
                    <p className="text-sm font-medium">#{String(tx.transaction_number).padStart(4, '0')}</p>
                    <p className="text-xs text-gray-400">
                      {tx.finished_at ? format(toZonedTime(new Date(tx.finished_at), TZ), 'HH:mm') : '—'}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{formatCurrency(tx.total)}</p>
                  {tx.status === 'storno' && (
                    <span className="text-xs text-red-500">Storniert</span>
                  )}
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* TSE status */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-green-500" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-green-600 dark:text-green-400">TSE aktiv</p>
            <p className="text-xs text-gray-400 font-mono truncate">{merchant.tse_serial_number || 'Nicht konfiguriert'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
