'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import {
  Zap, LayoutDashboard, Calculator, BookOpen, UtensilsCrossed,
  ArrowLeftRight, Download, Settings, LogOut, Menu, X, Shield
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/calculator', label: 'Kasse', icon: Calculator },
  { href: '/cashbook', label: 'Kassenbuch', icon: BookOpen },
  { href: '/menu', label: 'Menü', icon: UtensilsCrossed },
  { href: '/transactions', label: 'Buchungen', icon: ArrowLeftRight },
  { href: '/exports', label: 'Exporte', icon: Download },
  { href: '/settings', label: 'Einstellungen', icon: Settings },
]

export function AppShell({ children, merchantName }: { children: React.ReactNode; merchantName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-56 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 fixed inset-y-0">
        <div className="flex items-center gap-2 px-5 py-5 border-b border-gray-200 dark:border-gray-800">
          <Zap className="h-6 w-6 text-indigo-600" />
          <span className="font-bold text-lg text-indigo-600">RapiQ</span>
        </div>
        <div className="px-3 py-2">
          <p className="text-xs text-gray-500 px-2 truncate">{merchantName}</p>
        </div>
        <nav className="flex-1 px-3 space-y-0.5 pb-4">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition',
                pathname === href || pathname.startsWith(href + '/')
                  ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              )}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              {label}
            </Link>
          ))}
        </nav>
        <div className="px-3 pb-4 border-t border-gray-200 dark:border-gray-800 pt-3 space-y-0.5">
          <div className="flex items-center gap-2 px-3 py-1.5">
            <Shield className="h-3.5 w-3.5 text-green-500" />
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">TSE aktiv</span>
          </div>
          <button
            onClick={signOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          >
            <LogOut className="h-4 w-4" />
            Abmelden
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-4 h-14">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-indigo-600" />
          <span className="font-bold text-indigo-600">RapiQ</span>
        </div>
        <button onClick={() => setOpen(true)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <aside className="relative w-64 bg-white dark:bg-gray-900 flex flex-col h-full shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-indigo-600" />
                <span className="font-bold text-indigo-600">RapiQ</span>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-3 space-y-0.5">
              {NAV.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition',
                    pathname === href
                      ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                  )}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  {label}
                </Link>
              ))}
            </nav>
            <div className="px-3 pb-4 border-t border-gray-200 dark:border-gray-800 pt-3">
              <button
                onClick={signOut}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <LogOut className="h-5 w-5" />
                Abmelden
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 md:ml-56 pt-14 md:pt-0 min-h-screen">
        {children}
      </main>

      {/* Mobile bottom nav (quick access) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 flex">
        {[
          { href: '/dashboard', label: 'Home', icon: LayoutDashboard },
          { href: '/calculator', label: 'Kasse', icon: Calculator },
          { href: '/cashbook', label: 'Buch', icon: BookOpen },
          { href: '/transactions', label: 'Buchungen', icon: ArrowLeftRight },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex-1 flex flex-col items-center py-2 text-xs gap-1 transition',
              pathname === href ? 'text-indigo-600' : 'text-gray-400'
            )}
          >
            <Icon className="h-5 w-5" />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  )
}
