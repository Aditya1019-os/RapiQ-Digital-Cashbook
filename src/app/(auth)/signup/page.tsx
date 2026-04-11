'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2, Zap, Check } from 'lucide-react'

export default function SignupPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const passwordStrength = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
  }

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!passwordStrength.length || !passwordStrength.uppercase || !passwordStrength.number) {
      setError('Passwort erfüllt nicht die Mindestanforderungen.')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=/onboarding`,
        },
      })
      if (error) {
        if (error.message.includes('already registered')) {
          setError('Diese E-Mail ist bereits registriert. Bitte melden Sie sich an.')
        } else {
          setError(error.message)
        }
        return
      }
      setSuccess(true)
    } catch {
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Fast geschafft!</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Wir haben eine Bestätigungs-E-Mail an <strong>{email}</strong> gesendet. Klicken Sie auf den Link um Ihr Konto zu aktivieren und loszulegen.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold text-indigo-600">
            <Zap className="h-7 w-7" />
            RapiQ
          </Link>
          <p className="mt-2 text-gray-500 dark:text-gray-400">14 Tage kostenlos testen. Keine Kreditkarte erforderlich.</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-bold mb-6">Konto erstellen</h2>
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">E-Mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@beispiel.de"
                required
                className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Passwort</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mindestens 8 Zeichen"
                  required
                  className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 pr-10 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {password && (
                <div className="mt-2 space-y-1">
                  {[
                    { key: 'length', label: 'Mindestens 8 Zeichen' },
                    { key: 'uppercase', label: 'Mindestens ein Großbuchstabe' },
                    { key: 'number', label: 'Mindestens eine Zahl' },
                  ].map(({ key, label }) => (
                    <div key={key} className="flex items-center gap-2 text-xs">
                      <Check className={`h-3 w-3 ${passwordStrength[key as keyof typeof passwordStrength] ? 'text-green-500' : 'text-gray-300'}`} />
                      <span className={passwordStrength[key as keyof typeof passwordStrength] ? 'text-green-600' : 'text-gray-400'}>
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg p-3 text-sm">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Kostenlos registrieren
            </button>
            <p className="text-xs text-gray-500 text-center">
              Mit der Registrierung stimmen Sie unseren{' '}
              <Link href="/agb" className="text-indigo-600 hover:underline">AGB</Link>{' '}
              und der{' '}
              <Link href="/datenschutz" className="text-indigo-600 hover:underline">Datenschutzerklärung</Link>{' '}
              zu.
            </p>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Bereits registriert?{' '}
            <Link href="/login" className="text-indigo-600 font-medium hover:underline">
              Anmelden
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
