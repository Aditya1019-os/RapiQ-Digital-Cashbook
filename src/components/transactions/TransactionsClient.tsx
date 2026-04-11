'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertTriangle, ExternalLink, RotateCcw, Loader2, ChevronDown, ChevronUp, Shield } from 'lucide-react'
import { formatCurrency, formatDateTime, truncateSignature, cn } from '@/lib/utils'
import type { Transaction, TransactionLine } from '@/types/database'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

interface TxWithLines extends Transaction {
  transaction_lines: Pick<TransactionLine, 'id' | 'description' | 'quantity' | 'unit_price' | 'vat_rate' | 'gross_amount'>[]
}

interface Props {
  merchant: { id: string }
  transactions: TxWithLines[]
}

const TZ = 'Europe/Berlin'

export function TransactionsClient({ merchant, transactions }: Props) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [stornoId, setStornoId] = useState<string | null>(null)
  const [stornoLoading, setStornoLoading] = useState(false)
  const [stornoError, setStornoError] = useState('')
  const [filter, setFilter] = useState<'all' | 'cash' | 'card' | 'storno'>('all')
  const [search, setSearch] = useState('')

  const filtered = transactions.filter(tx => {
    if (filter === 'storno') return tx.status === 'storno'
    if (filter === 'cash') return tx.payment_method === 'cash'
    if (filter === 'card') return tx.payment_method === 'card'
    if (search) {
      const q = search.toLowerCase()
      return (
        String(tx.transaction_number).includes(q) ||
        tx.total.toFixed(2).includes(q)
      )
    }
    return true
  })

  async function handleStorno(tx: TxWithLines) {
    if (!confirm(`Buchung #${String(tx.transaction_number).padStart(4, '0')} wirklich stornieren?\n\nDies erstellt eine Gegenbuchung. Die Originalbuchung bleibt erhalten (GoBD).`)) return

    setStornoId(tx.id)
    setStornoLoading(true)
    setStornoError('')

    try {
      const res = await fetch('/api/transactions/storno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction_id: tx.id, merchant_id: merchant.id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      router.refresh()
    } catch (err) {
      setStornoError(err instanceof Error ? err.message : 'Storno fehlgeschlagen')
    } finally {
      setStornoId(null)
      setStornoLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-5 max-w-2xl pb-24 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Buchungen</h1>
        <p className="text-sm text-gray-500">{transactions.length} Buchungen gesamt</p>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <input
          type="search"
          placeholder="Suche nach Buchungsnr. oder Betrag…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
        />
        <div className="flex gap-2 flex-wrap">
          {(['all', 'cash', 'card', 'storno'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn('px-3 py-1.5 rounded-xl text-xs font-medium transition',
                filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
              )}
            >
              {f === 'all' ? 'Alle' : f === 'cash' ? 'Bar' : f === 'card' ? 'Karte' : 'Stornos'}
            </button>
          ))}
        </div>
      </div>

      {stornoError && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl p-3 text-sm">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          {stornoError}
        </div>
      )}

      {/* Transactions list */}
      <div className="space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Keine Buchungen gefunden</div>
        ) : (
          filtered.map(tx => {
            const isExpanded = expandedId === tx.id
            const isStorno = tx.status === 'storno'
            const berlinDate = tx.finished_at ? toZonedTime(new Date(tx.finished_at), TZ) : null

            return (
              <div key={tx.id} className={cn('bg-white dark:bg-gray-900 rounded-2xl border overflow-hidden',
                isStorno ? 'border-red-200 dark:border-red-800' : 'border-gray-200 dark:border-gray-800'
              )}>
                {/* Header row */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50 transition"
                  onClick={() => setExpandedId(isExpanded ? null : tx.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn('w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                      isStorno ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                      tx.payment_method === 'cash' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    )}>
                      {isStorno ? 'S' : tx.payment_method === 'cash' ? '€' : '▦'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">#{String(tx.transaction_number).padStart(4, '0')}</span>
                        {isStorno && <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-1.5 py-0.5 rounded font-medium">STORNO</span>}
                        {tx.storno_of && <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">Storno von</span>}
                      </div>
                      <p className="text-xs text-gray-400">
                        {berlinDate ? format(berlinDate, 'dd.MM.yyyy HH:mm') : '—'}
                        {' · '}
                        {tx.payment_method === 'cash' ? 'Bar' : 'Karte'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn('font-bold', isStorno && 'text-red-600 dark:text-red-400')}>
                      {isStorno ? '-' : ''}{formatCurrency(Math.abs(tx.total))}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-gray-100 dark:border-gray-800 p-4 space-y-4 bg-gray-50/50 dark:bg-gray-800/20">
                    {/* Line items */}
                    <div className="space-y-1.5">
                      {tx.transaction_lines.map(line => (
                        <div key={line.id} className="flex items-center justify-between text-sm gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={cn('text-xs px-1 py-0.5 rounded font-bold flex-shrink-0',
                              line.vat_rate === 7 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            )}>
                              {line.vat_rate}%
                            </span>
                            <span className="truncate">{line.description}</span>
                          </div>
                          <span className="font-mono flex-shrink-0">{formatCurrency(line.gross_amount)}</span>
                        </div>
                      ))}
                    </div>

                    {/* VAT summary */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-3 space-y-1 text-xs">
                      {tx.vat_7_net > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">7% MwSt. auf {formatCurrency(tx.vat_7_net)}</span>
                          <span>{formatCurrency(tx.vat_7_amount)}</span>
                        </div>
                      )}
                      {tx.vat_19_net > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">19% MwSt. auf {formatCurrency(tx.vat_19_net)}</span>
                          <span>{formatCurrency(tx.vat_19_amount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between font-bold border-t border-gray-100 dark:border-gray-700 pt-1 mt-1">
                        <span>Gesamt</span>
                        <span>{formatCurrency(tx.total)}</span>
                      </div>
                    </div>

                    {/* TSE data */}
                    <div className="bg-white dark:bg-gray-900 rounded-xl p-3 text-xs space-y-1">
                      <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400 font-medium mb-2">
                        <Shield className="h-3.5 w-3.5" />
                        TSE-Signatur
                      </div>
                      {[
                        ['Seriennummer', tx.tse_serial],
                        ['Vorgangsnr.', tx.tse_transaction_number],
                        ['Signaturzähler', String(tx.tse_signature_counter || 0)],
                        ['Signatur', tx.tse_signature_base64 ? truncateSignature(tx.tse_signature_base64) : '-'],
                      ].map(([label, value]) => (
                        <div key={label} className="flex justify-between gap-2">
                          <span className="text-gray-400">{label}</span>
                          <span className="font-mono text-right break-all">{value || '-'}</span>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Link
                        href={`/receipts/${tx.id}`}
                        target="_blank"
                        className="flex items-center gap-1.5 flex-1 justify-center bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium py-2 rounded-xl transition"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Beleg anzeigen
                      </Link>
                      {tx.status === 'completed' && !tx.storno_of && (
                        <button
                          onClick={() => handleStorno(tx)}
                          disabled={stornoLoading && stornoId === tx.id}
                          className="flex items-center gap-1.5 flex-1 justify-center bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 text-sm font-medium py-2 rounded-xl transition disabled:opacity-50"
                        >
                          {stornoLoading && stornoId === tx.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RotateCcw className="h-3.5 w-3.5" />
                          )}
                          Storno
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
