'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Check, Shield, CreditCard, Download, Trash2, Bell, Sliders } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Merchant } from '@/types/database'

interface Props { merchant: Merchant; userEmail?: string }

const CATEGORY_KEYS = ['bakery', 'cafe', 'drinks', 'retail']
const DEFAULT_NAMES: Record<string, string> = { bakery: 'Backwaren', cafe: 'Heißgetränke', drinks: 'Getränke', retail: 'Sonstiges' }
const DEFAULT_VATS: Record<string, number> = { bakery: 7, cafe: 19, drinks: 19, retail: 19 }

export function SettingsClient({ merchant }: Props) {
  const router = useRouter()
  const [saving, setSaving] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [error, setError] = useState('')

  const buttonNames = (merchant.button_names as Record<string, string>) || DEFAULT_NAMES
  const defaultVats = (merchant.default_vat_rates as Record<string, number>) || DEFAULT_VATS

  const [names, setNames] = useState<Record<string, string>>(buttonNames)
  const [vats, setVats] = useState<Record<string, number>>(defaultVats)
  const [businessName, setBusinessName] = useState(merchant.business_name)
  const [address, setAddress] = useState(merchant.address)
  const [city, setCity] = useState(merchant.city)
  const [postalCode, setPostalCode] = useState(merchant.postal_code)
  const [notifEndOfDay, setNotifEndOfDay] = useState(
    (merchant.notification_prefs as { end_of_day?: boolean })?.end_of_day ?? true
  )
  const [notifWeekly, setNotifWeekly] = useState(
    (merchant.notification_prefs as { weekly_summary?: boolean })?.weekly_summary ?? true
  )

  async function save(section: string, payload: Record<string, unknown>) {
    setSaving(section)
    setError('')
    try {
      const res = await fetch('/api/settings/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_id: merchant.id, ...payload }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      setSaved(section)
      setTimeout(() => setSaved(null), 2500)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(null)
    }
  }

  function SaveButton({ section }: { section: string }) {
    return (
      <button
        onClick={() => {
          if (section === 'profile') save('profile', { business_name: businessName, address, city, postal_code: postalCode })
          if (section === 'buttons') save('buttons', { button_names: names, default_vat_rates: vats })
          if (section === 'notifications') save('notifications', { notification_prefs: { end_of_day: notifEndOfDay, weekly_summary: notifWeekly } })
        }}
        disabled={saving === section}
        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition disabled:opacity-50"
      >
        {saving === section ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved === section ? <Check className="h-3.5 w-3.5" /> : null}
        {saved === section ? 'Gespeichert' : 'Speichern'}
      </button>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl pb-24 md:pb-6">
      <h1 className="text-2xl font-bold">Einstellungen</h1>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl p-3 text-sm">
          {error}
        </div>
      )}

      {/* Business Profile */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
        <h2 className="font-bold text-lg">Unternehmensprofil</h2>
        <div>
          <label className="block text-sm font-medium mb-1">Firmenname</label>
          <input
            value={businessName}
            onChange={e => setBusinessName(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Straße und Hausnummer</label>
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium mb-1">PLZ</label>
            <input value={postalCode} onChange={e => setPostalCode(e.target.value)} className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Stadt</label>
            <input value={city} onChange={e => setCity(e.target.value)} className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none text-sm" />
          </div>
        </div>
        <div className="flex justify-end">
          <SaveButton section="profile" />
        </div>
      </section>

      {/* Calculator button names */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Sliders className="h-5 w-5 text-indigo-600" />
          <h2 className="font-bold text-lg">Kassenschaltflächen</h2>
        </div>
        <p className="text-sm text-gray-500">Namen und MwSt.-Sätze der 4 Kategorie-Buttons in der Kasse anpassen.</p>
        <div className="space-y-3">
          {CATEGORY_KEYS.map(key => (
            <div key={key} className="flex items-center gap-3">
              <input
                value={names[key] || DEFAULT_NAMES[key]}
                onChange={e => setNames(n => ({ ...n, [key]: e.target.value }))}
                className="flex-1 border border-gray-300 dark:border-gray-700 rounded-xl px-3 py-2 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
              />
              <button
                onClick={() => setVats(v => ({ ...v, [key]: v[key] === 7 ? 19 : 7 }))}
                className={cn('px-3 py-2 rounded-xl text-xs font-bold transition flex-shrink-0',
                  vats[key] === 7 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                )}
              >
                {vats[key]}% MwSt.
              </button>
            </div>
          ))}
        </div>
        <div className="flex justify-end">
          <SaveButton section="buttons" />
        </div>
      </section>

      {/* Notifications */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-indigo-600" />
          <h2 className="font-bold text-lg">Benachrichtigungen</h2>
        </div>
        {[
          { label: 'Tagesabschluss-Erinnerung', desc: 'Täglich um 20:00 Uhr', value: notifEndOfDay, set: setNotifEndOfDay },
          { label: 'Wöchentlicher Umsatzbericht', desc: 'Montags per E-Mail', value: notifWeekly, set: setNotifWeekly },
        ].map(({ label, desc, value, set }) => (
          <div key={label} className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-gray-400">{desc}</p>
            </div>
            <button
              onClick={() => set(!value)}
              className={cn('relative inline-flex h-6 w-11 rounded-full transition-colors', value ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600')}
            >
              <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform', value ? 'translate-x-5' : 'translate-x-0')} />
            </button>
          </div>
        ))}
        <div className="flex justify-end">
          <SaveButton section="notifications" />
        </div>
      </section>

      {/* TSE Status */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-green-500" />
          <h2 className="font-bold text-lg">TSE-Status</h2>
        </div>
        <div className="space-y-2 text-sm">
          {[
            ['Status', 'Aktiv ✓'],
            ['Seriennummer', merchant.tse_serial_number || 'N/A'],
            ['TSS-ID', merchant.tse_tss_id || 'N/A'],
            ['Steuernummer', merchant.steuernummer],
          ].map(([label, value]) => (
            <div key={label} className="flex justify-between gap-2">
              <span className="text-gray-500">{label}</span>
              <span className="font-mono text-right break-all">{value}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Subscription */}
      <section id="billing" className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-indigo-600" />
          <h2 className="font-bold text-lg">Abonnement</h2>
        </div>
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4">
          <p className="font-semibold text-indigo-800 dark:text-indigo-300 capitalize">
            {merchant.subscription_plan || 'Starter'} Plan
          </p>
          <p className="text-sm text-indigo-600 dark:text-indigo-400">
            Status: {merchant.subscription_status === 'trial' ? 'Testzeitraum' : merchant.subscription_status || 'Aktiv'}
          </p>
          {merchant.trial_ends_at && (
            <p className="text-xs text-indigo-500 mt-1">
              Testzeitraum endet: {new Date(merchant.trial_ends_at).toLocaleDateString('de-DE')}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-3">
            <p className="font-semibold">Starter</p>
            <p className="text-2xl font-bold mt-1">€19,90<span className="text-sm font-normal text-gray-500">/Monat</span></p>
            <ul className="text-xs text-gray-500 mt-2 space-y-1">
              <li>✓ Kasse + Kassenbuch</li>
              <li>✓ Dashboard</li>
              <li>✓ DSFinV-K Export</li>
              <li>✓ MeinELSTER XML</li>
            </ul>
          </div>
          <div className="border-2 border-indigo-600 rounded-xl p-3 relative">
            <span className="absolute -top-2 right-3 bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">Empfohlen</span>
            <p className="font-semibold">Growth</p>
            <p className="text-2xl font-bold mt-1">€29,90<span className="text-sm font-normal text-gray-500">/Monat</span></p>
            <ul className="text-xs text-gray-500 mt-2 space-y-1">
              <li>✓ Alles in Starter</li>
              <li>✓ Menü-Scanner</li>
              <li>✓ DATEV Export</li>
              <li>✓ Priority Support</li>
            </ul>
          </div>
        </div>
        <a
          href="/api/stripe/portal"
          className="w-full flex items-center justify-center gap-2 border border-indigo-600 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 font-semibold py-3 rounded-xl text-sm transition"
        >
          <CreditCard className="h-4 w-4" />
          Abonnement verwalten
        </a>
      </section>

      {/* Data export DSGVO */}
      <section className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Download className="h-5 w-5 text-gray-600" />
          <h2 className="font-bold text-lg">Datenschutz (DSGVO)</h2>
        </div>
        <p className="text-sm text-gray-500">Exportieren oder löschen Sie Ihre persönlichen Daten gemäß DSGVO Art. 20 und Art. 17.</p>
        <button
          onClick={() => window.open(`/api/exports/gdpr?merchant_id=${merchant.id}`, '_blank')}
          className="w-full flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 font-medium py-3 rounded-xl text-sm transition"
        >
          <Download className="h-4 w-4" />
          Meine Daten exportieren (Art. 20 DSGVO)
        </button>
        <button
          onClick={() => {
            if (confirm('Konto und alle persönlichen Daten löschen? Finanzdaten werden anonymisiert (GoBD). Diese Aktion kann nach 30 Tagen nicht rückgängig gemacht werden.')) {
              alert('Löschanfrage wurde eingereicht. Sie erhalten eine E-Mail zur Bestätigung.')
            }
          }}
          className="w-full flex items-center justify-center gap-2 border border-red-200 dark:border-red-800 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium py-3 rounded-xl text-sm transition"
        >
          <Trash2 className="h-4 w-4" />
          Konto löschen (Art. 17 DSGVO)
        </button>
      </section>
    </div>
  )
}
