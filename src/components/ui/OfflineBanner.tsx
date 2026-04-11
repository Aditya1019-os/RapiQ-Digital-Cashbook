'use client'
import { useEffect, useState } from 'react'
import { WifiOff } from 'lucide-react'

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const update = () => setIsOffline(!navigator.onLine)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    update()
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center gap-2 text-sm font-medium">
      <WifiOff className="h-4 w-4 flex-shrink-0" />
      <span>Keine Verbindung — Einträge werden synchronisiert sobald Sie wieder online sind</span>
    </div>
  )
}
