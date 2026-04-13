'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Cookie } from 'lucide-react'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const accepted = localStorage.getItem('rapiq-cookies-accepted')
    if (!accepted) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem('rapiq-cookies-accepted', '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 md:bottom-4 md:left-4 md:right-auto md:max-w-sm">
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Cookie className="h-5 w-5 text-indigo-600 flex-shrink-0" />
          <span className="font-semibold text-sm">Cookies</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
          Wir verwenden ausschließlich technisch notwendige Cookies für die Anmeldung und Sitzungsverwaltung. Keine Tracking- oder Werbe-Cookies.
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={accept}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 rounded-xl text-sm transition"
          >
            Akzeptieren
          </button>
          <Link
            href="/datenschutz"
            className="flex-1 text-center text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 transition py-2"
          >
            Mehr erfahren
          </Link>
        </div>
      </div>
    </div>
  )
}
