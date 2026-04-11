'use client'
import { useState } from 'react'
import { Download, FileText, Calculator, Building2, Loader2, CheckCircle, Info, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Merchant } from '@/types/database'
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns'

interface Props { merchant: Merchant }

type ExportType = 'dsfinvk' | 'datev' | 'elster'

export function ExportsClient({ merchant }: Props) {
  const [loading, setLoading] = useState<ExportType | null>(null)
  const [error, setError] = useState('')
  const [elsterExpanded, setElsterExpanded] = useState(true)

  // Date range state
  const now = new Date()
  const lastMonth = subMonths(now, 1)
  const [fromDate, setFromDate] = useState(format(startOfMonth(lastMonth), 'yyyy-MM-dd'))
  const [toDate, setToDate] = useState(format(endOfMonth(lastMonth), 'yyyy-MM-dd'))

  async function downloadExport(type: ExportType) {
    setLoading(type)
    setError('')
    try {
      const params = new URLSearchParams({ merchant_id: merchant.id, from: fromDate, to: toDate })
      const res = await fetch(`/api/exports/${type}?${params}`)
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Export fehlgeschlagen (${res.status})`)
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const ext = type === 'dsfinvk' ? 'zip' : type === 'datev' ? 'csv' : 'xml'
      a.href = url
      a.download = `rapiq-${type}-${fromDate}-${toDate}.${ext}`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export fehlgeschlagen')
    } finally {
      setLoading(null)
    }
  }

  const isGrowth = merchant.subscription_plan === 'growth' || merchant.subscription_plan === 'trial'

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl pb-24 md:pb-6">
      <div>
        <h1 className="text-2xl font-bold">Exporte & Steuerdaten</h1>
        <p className="text-sm text-gray-500">GoBD-konforme Exporte für Steuerberater und Finanzamt</p>
      </div>

      {/* Date range */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 space-y-3">
        <h3 className="font-semibold">Zeitraum</h3>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">Von</label>
            <input
              type="date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>
          <div className="flex-1">
            <label className="text-xs text-gray-500 block mb-1">Bis</label>
            <input
              type="date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'Dieser Monat', from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') },
            { label: 'Letzter Monat', from: format(startOfMonth(lastMonth), 'yyyy-MM-dd'), to: format(endOfMonth(lastMonth), 'yyyy-MM-dd') },
          ].map(preset => (
            <button
              key={preset.label}
              onClick={() => { setFromDate(preset.from); setToDate(preset.to) }}
              className="px-3 py-1 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl p-3 text-sm">
          {error}
        </div>
      )}

      {/* MeinELSTER XML — most prominent */}
      <div className="bg-gradient-to-br from-indigo-600 to-indigo-700 rounded-2xl p-5 text-white">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg">MeinELSTER XML</h3>
              <p className="text-indigo-200 text-sm">Kassenanmeldung §146a AO</p>
            </div>
          </div>
          <button
            onClick={() => downloadExport('elster')}
            disabled={loading === 'elster'}
            className="flex items-center gap-2 bg-white text-indigo-700 font-bold px-4 py-2 rounded-xl hover:bg-indigo-50 transition disabled:opacity-50"
          >
            {loading === 'elster' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            XML herunterladen
          </button>
        </div>

        <button
          onClick={() => setElsterExpanded(e => !e)}
          className="mt-4 w-full flex items-center gap-2 text-indigo-200 text-sm hover:text-white transition"
        >
          {elsterExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          Anleitung zur MeinELSTER-Anmeldung
        </button>

        {elsterExpanded && (
          <div className="mt-3 bg-white/10 rounded-xl p-4 space-y-2">
            <p className="text-sm font-semibold text-indigo-100">So melden Sie Ihre Kasse beim Finanzamt an:</p>
            {[
              'XML-Datei herunterladen (Button oben)',
              'Öffnen Sie www.elster.de und melden Sie sich an',
              'Navigieren Sie zu: Formulare & Leistungen → Alle Formulare',
              'Suchen Sie nach "Mitteilung über Kassensysteme" (§146a AO)',
              'Klicken Sie auf "Datei hochladen" und wählen Sie die XML-Datei',
              'Formular prüfen und elektronisch übermitteln',
              'Bestätigung abspeichern — fertig!',
            ].map((step, i) => (
              <div key={i} className="flex items-start gap-2 text-sm text-indigo-100">
                <span className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i+1}</span>
                <span>{step}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DSFinV-K */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
              <FileText className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-bold">DSFinV-K Export</h3>
              <p className="text-gray-500 text-sm">Digitale Schnittstelle Finanzverwaltung v2.3</p>
            </div>
          </div>
          <button
            onClick={() => downloadExport('dsfinvk')}
            disabled={loading === 'dsfinvk'}
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-xl transition disabled:opacity-50 text-sm flex-shrink-0"
          >
            {loading === 'dsfinvk' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            ZIP herunterladen
          </button>
        </div>
        <div className="mt-3 bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-xs text-gray-500 space-y-1">
          <p className="font-medium text-gray-700 dark:text-gray-300">Enthaltene Dateien:</p>
          {['transactions.csv', 'cashpoints.csv', 'lines.csv', 'items.csv', 'vat.csv', 'tse.csv'].map(f => (
            <div key={f} className="flex items-center gap-2">
              <CheckCircle className="h-3 w-3 text-green-500" />
              <span>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* DATEV */}
      <div className={cn('rounded-2xl border p-5', isGrowth ? 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800' : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700')}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', isGrowth ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-200 dark:bg-gray-700')}>
              <Calculator className={cn('h-5 w-5', isGrowth ? 'text-blue-600' : 'text-gray-400')} />
            </div>
            <div>
              <h3 className={cn('font-bold', !isGrowth && 'text-gray-400')}>DATEV Export</h3>
              <p className={cn('text-sm', isGrowth ? 'text-gray-500' : 'text-gray-400')}>Buchungsstapel für Ihren Steuerberater</p>
            </div>
          </div>
          {isGrowth ? (
            <button
              onClick={() => downloadExport('datev')}
              disabled={loading === 'datev'}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl transition disabled:opacity-50 text-sm flex-shrink-0"
            >
              {loading === 'datev' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              CSV herunterladen
            </button>
          ) : (
            <span className="text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-lg font-medium flex-shrink-0">
              Growth Plan
            </span>
          )}
        </div>
        {isGrowth && (
          <div className="mt-3 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300 flex items-start gap-2">
            <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
            <span>Diese Datei an Ihren Steuerberater senden — enthält alle Buchungssätze im DATEV Buchungsstapel-Format.</span>
          </div>
        )}
      </div>

      {/* Info box */}
      <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 text-sm text-gray-500 space-y-2 border border-gray-200 dark:border-gray-800">
        <p className="font-medium text-gray-700 dark:text-gray-300">Aufbewahrungspflicht</p>
        <p>Alle Kassendaten müssen gemäß GoBD und §147 AO mindestens 10 Jahre aufbewahrt werden. RapiQ speichert Ihre Daten sicher für die gesamte Pflichtaufbewahrungsdauer.</p>
      </div>
    </div>
  )
}
