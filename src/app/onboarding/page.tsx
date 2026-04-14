'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, Zap, CheckCircle, ChevronRight, ChevronLeft, Building2, FileText, Euro, Shield, Cpu } from 'lucide-react'
import { validateSteuernummer, validateUstIdNr } from '@/lib/utils'
import type { BusinessCategory, LegalStructure, VatProfile } from '@/types/database'

const STEPS = [
  { id: 1, title: 'Ihr Unternehmen', icon: Building2 },
  { id: 2, title: 'Rechtsform', icon: FileText },
  { id: 3, title: 'Steuerdaten', icon: Euro },
  { id: 4, title: 'MwSt.-Profil', icon: Shield },
  { id: 5, title: 'TSE-Registrierung', icon: Cpu },
]

const CATEGORIES: { value: BusinessCategory; label: string; emoji: string }[] = [
  { value: 'cafe', label: 'Café', emoji: '☕' },
  { value: 'bakery', label: 'Bäckerei', emoji: '🥐' },
  { value: 'restaurant', label: 'Restaurant', emoji: '🍽️' },
  { value: 'salon', label: 'Friseursalon', emoji: '✂️' },
  { value: 'retail', label: 'Einzelhandel', emoji: '🛍️' },
  { value: 'other', label: 'Sonstiges', emoji: '🏪' },
]

const LEGAL_STRUCTURES: { value: LegalStructure; label: string; desc: string }[] = [
  { value: 'einzelunternehmer', label: 'Einzelunternehmer / Einzelunternehmerin', desc: 'Selbstständig, kein Partner' },
  { value: 'gbr', label: 'GbR', desc: 'Gesellschaft bürgerlichen Rechts' },
  { value: 'gmbh', label: 'GmbH', desc: 'Gesellschaft mit beschränkter Haftung' },
  { value: 'ug', label: 'UG (haftungsbeschränkt)', desc: 'Mini-GmbH' },
]

const VAT_PROFILES: { value: VatProfile; label: string; desc: string; examples: string }[] = [
  { value: '7_only', label: 'Nur 7% MwSt.', desc: 'Bäckerei, Lebensmittel zum Mitnehmen', examples: 'z.B. Bäckerei, Obst- und Gemüsehändler' },
  { value: '19_only', label: 'Nur 19% MwSt.', desc: 'Friseursalon, Einzelhandel', examples: 'z.B. Friseur, Boutique, Elektronik' },
  { value: 'mixed', label: 'Gemischt 7% + 19%', desc: 'Cafés, Restaurants, gemischte Händler', examples: 'z.B. Café (Getränke 19%, Backwaren zum Mitnehmen 7%)' },
]

export default function OnboardingPage() {
  const router = useRouter()
  const supabase = createClient()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const [form, setForm] = useState({
    business_name: '',
    category: '' as BusinessCategory,
    address: '',
    city: '',
    postal_code: '',
    legal_structure: '' as LegalStructure,
    steuernummer: '',
    ust_id_nr: '',
    vat_profile: 'mixed' as VatProfile,
  })

  function update(key: string, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
    setError('')
  }

  function validateStep(): string {
    switch (step) {
      case 1:
        if (!form.business_name.trim()) return 'Bitte geben Sie Ihren Firmennamen ein.'
        if (!form.category) return 'Bitte wählen Sie eine Kategorie.'
        if (!form.address.trim()) return 'Bitte geben Sie Ihre Adresse ein.'
        if (!form.city.trim()) return 'Bitte geben Sie Ihre Stadt ein.'
        if (!form.postal_code.trim()) return 'Bitte geben Sie Ihre PLZ ein.'
        return ''
      case 2:
        if (!form.legal_structure) return 'Bitte wählen Sie Ihre Rechtsform.'
        return ''
      case 3:
        if (!validateSteuernummer(form.steuernummer)) return 'Ungültige Steuernummer. Format: XX/XXX/XXXXX'
        if (form.ust_id_nr && !validateUstIdNr(form.ust_id_nr)) return 'Ungültige USt-IdNr. Format: DE + 9 Ziffern'
        return ''
      case 4:
        if (!form.vat_profile) return 'Bitte wählen Sie ein MwSt.-Profil.'
        return ''
      default:
        return ''
    }
  }

  async function handleNext() {
    const err = validateStep()
    if (err) { setError(err); return }
    if (step < 5) { setStep(s => s + 1); setError('') }
    else await handleFinish()
  }

  async function handleFinish() {
    setLoading(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nicht angemeldet')

      // Call API to register TSE and create merchant
      const response = await fetch('/api/onboarding/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, user_id: user.id }),
      })

      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Registrierung fehlgeschlagen')

      setDone(true)
      setTimeout(() => router.push('/dashboard'), 3000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 text-center">
          <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Willkommen bei RapiQ!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Ihre Kasse ist eingerichtet. TSE wurde erfolgreich registriert. Sie werden jetzt weitergeleitet…
          </p>
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 text-left space-y-2">
            <p className="text-sm font-semibold text-indigo-800 dark:text-indigo-300">Nächste Schritte:</p>
            {['MeinELSTER-Anmeldung abschließen (Exports → MeinELSTER)', 'Menü über Foto-Scanner hochladen', 'Erste Buchung in der Kasse tätigen'].map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-indigo-700 dark:text-indigo-400">
                <span className="w-5 h-5 rounded-full bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-bold">{i+1}</span>
                {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 px-4 py-8">
      <div className="max-w-lg mx-auto">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 text-2xl font-bold text-indigo-600">
            <Zap className="h-7 w-7" />
            RapiQ
          </div>
          <p className="mt-1 text-sm text-gray-500">Einrichtung — Schritt {step} von 5</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = s.id === step
            const isDone = s.id < step
            return (
              <div key={s.id} className="flex items-center">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition ${isDone ? 'bg-green-500 text-white' : isActive ? 'bg-indigo-600 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-400'}`}>
                  {isDone ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-4 w-4" />}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 w-8 mx-1 transition ${isDone ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
                )}
              </div>
            )
          })}
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-6">
          <h2 className="text-xl font-bold mb-1">{STEPS[step-1].title}</h2>

          {/* Step 1: Business info */}
          {step === 1 && (
            <div className="space-y-4 mt-4">
              <div>
                <label className="block text-sm font-medium mb-1">Firmenname *</label>
                <input
                  value={form.business_name}
                  onChange={(e) => update('business_name', e.target.value)}
                  placeholder="Bäckerei Schmidt"
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Branche *</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => update('category', cat.value)}
                      className={`p-3 rounded-xl border-2 text-center transition ${form.category === cat.value ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'}`}
                    >
                      <div className="text-2xl">{cat.emoji}</div>
                      <div className="text-xs font-medium mt-1">{cat.label}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Straße und Hausnummer *</label>
                <input
                  value={form.address}
                  onChange={(e) => update('address', e.target.value)}
                  placeholder="Musterstraße 1"
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">PLZ *</label>
                  <input
                    value={form.postal_code}
                    onChange={(e) => update('postal_code', e.target.value)}
                    placeholder="80331"
                    maxLength={5}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Stadt *</label>
                  <input
                    value={form.city}
                    onChange={(e) => update('city', e.target.value)}
                    placeholder="München"
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Legal structure */}
          {step === 2 && (
            <div className="space-y-3 mt-4">
              {LEGAL_STRUCTURES.map(ls => (
                <button
                  key={ls.value}
                  type="button"
                  onClick={() => update('legal_structure', ls.value)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition ${form.legal_structure === ls.value ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'}`}
                >
                  <div className="font-semibold">{ls.label}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{ls.desc}</div>
                </button>
              ))}
            </div>
          )}

          {/* Step 3: Tax data */}
          {step === 3 && (
            <div className="space-y-4 mt-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300">
                Diese Angaben sind für die GoBD-konforme Kassenregistrierung beim Finanzamt erforderlich.
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Steuernummer *</label>
                <input
                  value={form.steuernummer}
                  onChange={(e) => update('steuernummer', e.target.value)}
                  placeholder="12/345/67890"
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">Format: XX/XXX/XXXXX — auf Ihrem letzten Steuerbescheid</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">USt-IdNr. (optional)</label>
                <input
                  value={form.ust_id_nr}
                  onChange={(e) => update('ust_id_nr', e.target.value.toUpperCase())}
                  placeholder="DE123456789"
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">Format: DE + 9 Ziffern — nur falls vorhanden</p>
              </div>
            </div>
          )}

          {/* Step 4: VAT profile */}
          {step === 4 && (
            <div className="space-y-3 mt-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Wählen Sie, welche Mehrwertsteuersätze in Ihrem Betrieb anfallen. Dies kann später in den Einstellungen geändert werden.
              </p>
              {VAT_PROFILES.map(vp => (
                <button
                  key={vp.value}
                  type="button"
                  onClick={() => update('vat_profile', vp.value)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition ${form.vat_profile === vp.value ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/30' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'}`}
                >
                  <div className="font-semibold">{vp.label}</div>
                  <div className="text-sm text-gray-500 mt-0.5">{vp.desc}</div>
                  <div className="text-xs text-gray-400 mt-1 italic">{vp.examples}</div>
                </button>
              ))}
            </div>
          )}

          {/* Step 5: TSE registration */}
          {step === 5 && (
            <div className="space-y-4 mt-4">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-sm text-green-800 dark:text-green-300">
                <p className="font-semibold mb-1">Was passiert beim Klick auf &quot;Registrierung abschließen&quot;?</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>RapiQ registriert eine Cloud-TSE (fiskaly) für Ihre Kasse</li>
                  <li>Die TSE-Seriennummer wird gespeichert</li>
                  <li>Alle zukünftigen Buchungen werden automatisch signiert</li>
                  <li>Sie erhalten eine Willkommens-E-Mail mit Ihrer TSE-Seriennummer</li>
                </ul>
              </div>
              <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Firma</span>
                  <span className="font-medium">{form.business_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Rechtsform</span>
                  <span className="font-medium capitalize">{form.legal_structure}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Steuernummer</span>
                  <span className="font-mono font-medium">{form.steuernummer}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">MwSt.-Profil</span>
                  <span className="font-medium">{VAT_PROFILES.find(v => v.value === form.vat_profile)?.label}</span>
                </div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 text-xs text-amber-800 dark:text-amber-300">
                <strong>Hinweis:</strong> Nach der TSE-Registrierung müssen Sie Ihre Kasse beim Finanzamt über MeinELSTER anmelden (§ 146a AO). RapiQ erstellt das erforderliche XML automatisch für Sie.
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <button
              onClick={() => { setStep(s => s - 1); setError('') }}
              disabled={step === 1}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition"
            >
              <ChevronLeft className="h-4 w-4" />
              Zurück
            </button>
            <button
              onClick={handleNext}
              disabled={loading}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-2 rounded-xl transition disabled:opacity-50"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {step === 5 ? 'Registrierung abschließen' : 'Weiter'}
              {step < 5 && <ChevronRight className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
