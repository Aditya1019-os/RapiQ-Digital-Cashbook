'use client'
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, Loader2, Zap } from 'lucide-react'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const redirect = params.get('redirect') || '/dashboard'
  const supabase = createClient()

  const [mode, setMode] = useState<'password' | 'magic'>('password')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [magicSent, setMagicSent] = useState(false)
  const [totp, setTotp] = useState('')
  const [needsTotp, setNeedsTotp] = useState(false)

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        if (error.message.includes('factor')) {
          setNeedsTotp(true)
        } else {
          setError('E-Mail oder Passwort falsch. Bitte versuchen Sie es erneut.')
        }
        return
      }
      router.push(redirect)
      router.refresh()
    } catch {
      setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.')
    } finally {
      setLoading(false)
    }
  }

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${redirect}` },
      })
      if (error) throw error
      setMagicSent(true)
    } catch {
      setError('Magic Link konnte nicht gesendet werden. Bitte versuchen Sie es erneut.')
    } finally {
      setLoading(false)
    }
  }

  async function handleTotp(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      // Supabase MFA: challenge + verify
      const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId: totp })
      if (challengeError) {
        // Fallback: try as email OTP
        const { error } = await supabase.auth.verifyOtp({ email, token: totp, type: 'email' })
        if (error) {
          setError('Ungültiger Code. Bitte erneut versuchen.')
          return
        }
      } else {
        const { error: verifyError } = await supabase.auth.mfa.verify({
          factorId: totp,
          challengeId: challengeData.id,
          code: totp,
        })
        if (verifyError) {
          setError('Ungültiger Code. Bitte erneut versuchen.')
          return
        }
      }
      router.push(redirect)
      router.refresh()
    } catch {
      setError('Fehler bei der Verifizierung.')
    } finally {
      setLoading(false)
    }
  }

  if (magicSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Zap className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Link gesendet!</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Wir haben einen Magic Link an <strong>{email}</strong> gesendet. Klicken Sie auf den Link um sich anzumelden.
          </p>
          <button
            onClick={() => { setMagicSent(false); setMode('password') }}
            className="mt-6 text-sm text-indigo-600 hover:underline"
          >
            Zurück zur Anmeldung
          </button>
        </div>
      </div>
    )
  }

  if (needsTotp) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-2">2-Faktor-Authentifizierung</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Geben Sie den 6-stelligen Code aus Ihrer Authenticator-App ein.
          </p>
          <form onSubmit={handleTotp} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={totp}
              onChange={(e) => setTotp(e.target.value)}
              placeholder="000000"
              className="w-full text-center text-2xl font-mono tracking-widest border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
              autoFocus
              required
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading || totp.length !== 6}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Bestätigen
            </button>
          </form>
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
          <p className="mt-2 text-gray-500 dark:text-gray-400">Willkommen zurück</p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8">
          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 mb-6">
            <button
              onClick={() => setMode('password')}
              className={`flex-1 py-2 text-sm font-medium transition ${mode === 'password' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              Passwort
            </button>
            <button
              onClick={() => setMode('magic')}
              className={`flex-1 py-2 text-sm font-medium transition ${mode === 'magic' ? 'bg-indigo-600 text-white' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
            >
              Magic Link
            </button>
          </div>

          {mode === 'password' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
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
                    placeholder="••••••••"
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
                Anmelden
              </button>
            </form>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-4">
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
                <Zap className="h-4 w-4" />
                Magic Link senden
              </button>
            </form>
          )}

          <p className="mt-6 text-center text-sm text-gray-500">
            Noch kein Konto?{' '}
            <Link href="/signup" className="text-indigo-600 font-medium hover:underline">
              Kostenlos registrieren
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  )
}
