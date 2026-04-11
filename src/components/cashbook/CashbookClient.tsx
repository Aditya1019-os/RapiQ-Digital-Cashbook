'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, CheckCircle, AlertCircle, BookOpen, History, Lock } from 'lucide-react'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import { cn } from '@/lib/utils'
import type { CashbookEntry, AuditLog } from '@/types/database'

interface Props {
  merchant: { id: string; business_name: string }
  cashExpected: number
  todayEntry: CashbookEntry | null
  auditLog: AuditLog[]
  pastEntries: CashbookEntry[]
  today: string
}

export function CashbookClient({ merchant, cashExpected, todayEntry, auditLog, pastEntries, today }: Props) {
  const router = useRouter()
  const [cardTotal, setCardTotal] = useState(todayEntry?.card_terminal_total?.toString() || '')
  const [cashCounted, setCashCounted] = useState(todayEntry?.cash_counted?.toString() || '')
  const [note, setNote] = useState(todayEntry?.note || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<'entry' | 'audit'>('entry')

  const alreadySaved = !!todayEntry
  const cardTotalNum = parseFloat(cardTotal) || 0
  const cashCountedNum = parseFloat(cashCounted) || 0
  const cashDiff = cashCountedNum - cashExpected

  async function handleSave() {
    if (alreadySaved) return
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/cashbook/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: merchant.id,
          entry_date: today,
          card_terminal_total: cardTotalNum,
          cash_counted: cashCountedNum,
          cash_expected: cashExpected,
          note: note.trim() || null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSaved(true)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setLoading(false)
    }
  }

  const totalRevenue = cardTotalNum + cashCountedNum

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl pb-24 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Kassenbuch</h1>
        <p className="text-sm text-gray-500">Tagesabschluss — {formatDate(today)}</p>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setTab('entry')}
          className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition', tab === 'entry' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800')}
        >
          <BookOpen className="h-4 w-4" />
          Tagesabschluss
        </button>
        <button
          onClick={() => setTab('audit')}
          className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium transition', tab === 'audit' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800')}
        >
          <History className="h-4 w-4" />
          Protokoll
        </button>
      </div>

      {tab === 'entry' && (
        <>
          {alreadySaved && (
            <div className="flex items-center gap-3 bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 text-green-700 dark:text-green-400">
              <Lock className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">Tagesabschluss bereits gespeichert</p>
                <p className="text-sm opacity-80">GoBD: Einträge können nach dem Speichern nicht mehr geändert werden.</p>
              </div>
            </div>
          )}

          {/* Calculator cash summary */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-indigo-800 dark:text-indigo-300">Bar-Umsatz aus Kasse (erwartet)</span>
              <span className="text-xl font-bold text-indigo-700 dark:text-indigo-300">{formatCurrency(cashExpected)}</span>
            </div>
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Automatisch berechnet aus allen Bar-Buchungen heute</p>
          </div>

          <div className="space-y-4">
            {/* Card terminal */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Kartenterminal-Gesamt heute (aus Z-Beleg) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cardTotal}
                  onChange={e => setCardTotal(e.target.value)}
                  disabled={alreadySaved}
                  placeholder="0,00"
                  className="w-full pl-8 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Tagesabschluss-Betrag von Ihrem externen Kartenterminal</p>
            </div>

            {/* Cash counted */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Bargeld im Kassenlade (gezählt) *
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">€</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cashCounted}
                  onChange={e => setCashCounted(e.target.value)}
                  disabled={alreadySaved}
                  placeholder="0,00"
                  className="w-full pl-8 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Difference */}
            <div className={cn('rounded-2xl p-4', cashDiff === 0 ? 'bg-green-50 dark:bg-green-900/20' : cashDiff > 0 ? 'bg-amber-50 dark:bg-amber-900/20' : 'bg-red-50 dark:bg-red-900/20')}>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Kassendifferenz</span>
                <span className={cn('text-xl font-bold', cashDiff === 0 ? 'text-green-700 dark:text-green-400' : cashDiff > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-red-700 dark:text-red-400')}>
                  {cashDiff >= 0 ? '+' : ''}{formatCurrency(cashDiff)}
                </span>
              </div>
              <p className="text-xs mt-1 opacity-70">
                {cashDiff === 0 ? 'Kasse stimmt überein' : cashDiff > 0 ? 'Kassenüberschuss' : 'Kassenmangel'}
              </p>
            </div>

            {/* Total revenue */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 flex justify-between items-center">
              <span className="font-medium">Tagesumsatz gesamt</span>
              <span className="text-2xl font-bold">{formatCurrency(totalRevenue)}</span>
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm font-medium mb-1">Bemerkung (optional)</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                disabled={alreadySaved}
                rows={2}
                placeholder="z.B. Defektes Terminal, Sonderevent..."
                className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none resize-none disabled:opacity-60"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl p-3 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              {error}
            </div>
          )}

          {!alreadySaved && (
            <button
              onClick={handleSave}
              disabled={loading || !cardTotal || !cashCounted}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-5 w-5 animate-spin" />}
              {loading ? 'Wird gespeichert und TSE-signiert…' : 'Tagesabschluss speichern (unveränderlich)'}
            </button>
          )}

          <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300">
            <strong>GoBD-Hinweis:</strong> Einträge im Kassenbuch sind nach dem Speichern unveränderlich. Korrekturen erfolgen ausschließlich durch Stornobuchungen. §146 AO.
          </div>

          {/* Past entries */}
          {pastEntries.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Letzte Tagesabschlüsse</h3>
              <div className="space-y-2">
                {pastEntries.map(entry => (
                  <div key={entry.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{formatDate(entry.entry_date)}</p>
                      <p className="text-xs text-gray-400">Bar: {formatCurrency(entry.cash_counted)} · Karte: {formatCurrency(entry.card_terminal_total)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{formatCurrency(entry.cash_counted + entry.card_terminal_total)}</p>
                      <p className={cn('text-xs', entry.cash_difference === 0 ? 'text-green-500' : 'text-amber-500')}>
                        Diff: {entry.cash_difference >= 0 ? '+' : ''}{formatCurrency(entry.cash_difference)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'audit' && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <Lock className="h-4 w-4" />
            <span>Unveränderliches GoBD-Protokoll</span>
          </div>
          {auditLog.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">Noch keine Protokolleinträge</div>
          ) : (
            auditLog.map(entry => (
              <div key={entry.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-3 text-xs">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className={cn('inline-block px-1.5 py-0.5 rounded text-xs font-bold mb-1',
                      entry.action.includes('STORNO') ? 'bg-red-100 text-red-700' :
                      entry.action.includes('CREATE') ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    )}>
                      {entry.action}
                    </span>
                    <p className="text-gray-700 dark:text-gray-300 font-mono">{entry.entity_type} · {entry.entity_id.substring(0, 8)}…</p>
                    {entry.new_values && (
                      <p className="text-gray-400 mt-0.5">
                        {JSON.stringify(entry.new_values).substring(0, 80)}…
                      </p>
                    )}
                  </div>
                  <span className="text-gray-400 whitespace-nowrap flex-shrink-0">{formatDateTime(entry.created_at)}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
