'use client'
import { useState, useCallback } from 'react'
import { X, CreditCard, Banknote, Loader2, AlertCircle, CheckCircle, ShoppingCart, Minus, Plus } from 'lucide-react'
import { formatCurrency, calculateVat, cn } from '@/lib/utils'
import type { MenuItem } from '@/types/database'

interface BasketItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  vatRate: number
  netAmount: number
  vatAmount: number
  grossAmount: number
  category: string
  menuItemId?: string
}

interface ProductGridProps {
  merchant: {
    id: string
    tse_tss_id: string | null
    tse_client_id: string | null
    tse_serial_number: string | null
  }
  menuItems: MenuItem[]
}

type ServiceMode = 'inhouse' | 'takeaway'
type ModalState = 'idle' | 'payment' | 'processing' | 'success' | 'error'

const CATEGORY_COLORS: Record<string, string> = {
  cafe: 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/20',
  bakery: 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/20',
  restaurant: 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20',
  retail: 'bg-blue-500/10 border-blue-500/30 hover:bg-blue-500/20',
  drinks: 'bg-cyan-500/10 border-cyan-500/30 hover:bg-cyan-500/20',
  other: 'bg-gray-500/10 border-gray-500/30 hover:bg-gray-500/20',
}

const CATEGORY_LABELS: Record<string, string> = {
  cafe: 'Getränke', bakery: 'Backwaren', restaurant: 'Speisen',
  retail: 'Sonstiges', drinks: 'Getränke', other: 'Sonstiges',
}

export function ProductGridClient({ merchant, menuItems }: ProductGridProps) {
  const [basket, setBasket] = useState<BasketItem[]>([])
  const [serviceMode, setServiceMode] = useState<ServiceMode>('inhouse')
  const [activeCategory, setActiveCategory] = useState<string>('all')
  const [modal, setModal] = useState<ModalState>('idle')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash')
  const [errorMsg, setErrorMsg] = useState('')
  const [completedTx, setCompletedTx] = useState<{ id: string; number: number } | null>(null)
  const [fiskalyTxId, setFiskalyTxId] = useState<string | null>(null)
  const [tsStarted, setTsStarted] = useState(false)
  const [showBasket, setShowBasket] = useState(false)

  const categories = ['all', ...Array.from(new Set(menuItems.map(i => i.category)))]

  const filtered = activeCategory === 'all'
    ? menuItems
    : menuItems.filter(i => i.category === activeCategory)

  const startTseTransaction = useCallback(async () => {
    if (tsStarted || !merchant.tse_tss_id) return
    setTsStarted(true)
    try {
      const res = await fetch('/api/tse/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ merchant_id: merchant.id }),
      })
      const data = await res.json()
      if (data.tx_id) setFiskalyTxId(data.tx_id)
    } catch {
      console.warn('TSE start failed, will retry at finish')
    }
  }, [tsStarted, merchant.id, merchant.tse_tss_id])

  function getEffectiveVat(item: MenuItem): number {
    // §12 UStG: food with 7% → 19% when consumed in-house
    if (item.vat_rate === 7 && serviceMode === 'inhouse') return 19
    return item.vat_rate
  }

  function addItem(item: MenuItem) {
    startTseTransaction()
    const vatRate = getEffectiveVat(item)
    const { net, vat } = calculateVat(item.price, vatRate)
    const inHouseLabel = serviceMode === 'inhouse' && item.vat_rate === 7 ? ' 🍽️' : ''

    // Check if same item already in basket (same service mode)
    const existing = basket.find(b => b.menuItemId === item.id && b.vatRate === vatRate)
    if (existing) {
      setBasket(prev => prev.map(b => {
        if (b.id !== existing.id) return b
        const newQty = b.quantity + 1
        const newGross = item.price * newQty
        const { net: newNet, vat: newVat } = calculateVat(newGross, vatRate)
        return { ...b, quantity: newQty, grossAmount: newGross, netAmount: newNet, vatAmount: newVat }
      }))
    } else {
      setBasket(prev => [...prev, {
        id: crypto.randomUUID(),
        description: `${item.name}${inHouseLabel}`,
        quantity: 1,
        unitPrice: item.price,
        vatRate,
        netAmount: net,
        vatAmount: vat,
        grossAmount: item.price,
        category: item.category,
        menuItemId: item.id,
      }])
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(30)
  }

  function changeQty(id: string, delta: number) {
    setBasket(prev => prev.flatMap(b => {
      if (b.id !== id) return [b]
      const newQty = b.quantity + delta
      if (newQty <= 0) return []
      const newGross = b.unitPrice * newQty
      const { net, vat } = calculateVat(newGross, b.vatRate)
      return [{ ...b, quantity: newQty, grossAmount: newGross, netAmount: net, vatAmount: vat }]
    }))
  }

  const total = basket.reduce((s, i) => s + i.grossAmount, 0)
  const vat7Net = basket.filter(i => i.vatRate === 7).reduce((s, i) => s + i.netAmount, 0)
  const vat19Net = basket.filter(i => i.vatRate === 19).reduce((s, i) => s + i.netAmount, 0)
  const itemCount = basket.reduce((s, i) => s + i.quantity, 0)

  async function finishTransaction() {
    if (basket.length === 0) return
    setModal('processing')
    setErrorMsg('')
    try {
      const res = await fetch('/api/transactions/finish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: merchant.id,
          fiskaly_tx_id: fiskalyTxId,
          payment_method: paymentMethod,
          basket,
          total,
          vat_7_net: vat7Net,
          vat_19_net: vat19Net,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setModal('error')
        setErrorMsg(data.error || 'TSE-Signatur fehlgeschlagen.')
        return
      }
      setCompletedTx({ id: data.transaction_id, number: data.transaction_number })
      setModal('success')
      setBasket([])
      setFiskalyTxId(null)
      setTsStarted(false)
      setShowBasket(false)
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate([50, 30, 50])
    } catch {
      setModal('error')
      setErrorMsg('Verbindungsfehler. Bitte erneut versuchen.')
    }
  }

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-950 text-white overflow-hidden pb-16 md:pb-0">

      {/* ── In-Haus / Außer-Haus toggle ── */}
      <div className="flex-shrink-0 px-3 pt-3 pb-2">
        <div className="flex rounded-xl overflow-hidden border border-gray-700 text-sm font-semibold">
          <button
            onClick={() => setServiceMode('inhouse')}
            className={cn(
              'flex-1 py-2.5 transition flex items-center justify-center gap-2',
              serviceMode === 'inhouse' ? 'bg-purple-600 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}
          >
            🍽️ In-Haus <span className="text-xs opacity-75">(Speisen 19%)</span>
          </button>
          <button
            onClick={() => setServiceMode('takeaway')}
            className={cn(
              'flex-1 py-2.5 transition flex items-center justify-center gap-2',
              serviceMode === 'takeaway' ? 'bg-amber-500 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}
          >
            🥡 Außer-Haus <span className="text-xs opacity-75">(Speisen 7%)</span>
          </button>
        </div>
      </div>

      {/* ── Category tabs ── */}
      <div className="flex-shrink-0 flex gap-2 overflow-x-auto px-3 pb-2 no-scrollbar">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition',
              activeCategory === cat
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            )}
          >
            {cat === 'all' ? 'Alle' : (CATEGORY_LABELS[cat] || cat)}
          </button>
        ))}
      </div>

      {/* ── Product grid ── */}
      <div className="flex-1 overflow-y-auto px-3 pb-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-500 text-sm gap-2">
            <ShoppingCart className="h-8 w-8 opacity-30" />
            <p>Keine Artikel. Menü unter <strong>Menü</strong> hinzufügen.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {filtered.map(item => {
              const effectiveVat = getEffectiveVat(item)
              const inBasket = basket.find(b => b.menuItemId === item.id)
              return (
                <button
                  key={item.id}
                  onClick={() => addItem(item)}
                  className={cn(
                    'relative p-3 rounded-xl border text-left transition active:scale-95',
                    CATEGORY_COLORS[item.category] || CATEGORY_COLORS.other,
                    inBasket && 'ring-2 ring-indigo-500'
                  )}
                >
                  {inBasket && (
                    <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-indigo-600 rounded-full text-xs font-bold flex items-center justify-center">
                      {inBasket.quantity}
                    </span>
                  )}
                  <div className="text-sm font-semibold leading-tight mb-1 pr-5">{item.name}</div>
                  <div className="text-indigo-400 font-mono text-xs font-bold">{formatCurrency(item.price)}</div>
                  <div className={cn(
                    'text-xs mt-0.5 font-medium',
                    effectiveVat === 19 ? 'text-purple-400' : 'text-amber-400'
                  )}>
                    {effectiveVat}% MwSt.
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Basket FAB ── */}
      <div className="flex-shrink-0 px-3 pb-3 flex gap-2">
        <button
          onClick={() => setShowBasket(true)}
          disabled={basket.length === 0}
          className={cn(
            'flex-1 flex items-center justify-between px-4 py-3 rounded-xl transition font-semibold',
            basket.length > 0 ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-900 opacity-50 cursor-not-allowed'
          )}
        >
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            <span>{itemCount} Artikel</span>
          </div>
          <span className="font-mono text-lg">{formatCurrency(total)}</span>
        </button>
        <button
          onClick={() => { setPaymentMethod('cash'); setModal('payment') }}
          disabled={basket.length === 0}
          className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed px-5 py-3 rounded-xl font-bold transition"
        >
          Abschluss
        </button>
      </div>

      {/* ── Basket drawer ── */}
      {showBasket && (
        <div className="fixed inset-0 z-40 flex flex-col justify-end bg-black/60" onClick={() => setShowBasket(false)}>
          <div className="bg-gray-900 rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Bestellung</h3>
              <button onClick={() => setShowBasket(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-2 mb-4">
              {basket.map(item => (
                <div key={item.id} className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <button onClick={() => changeQty(item.id, -1)} className="w-7 h-7 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-600">
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-6 text-center font-bold text-sm">{item.quantity}</span>
                    <button onClick={() => changeQty(item.id, 1)} className="w-7 h-7 bg-gray-700 rounded-lg flex items-center justify-center hover:bg-gray-600">
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{item.description}</div>
                    <div className={cn('text-xs', item.vatRate === 19 ? 'text-purple-400' : 'text-amber-400')}>
                      {item.vatRate}% MwSt.
                    </div>
                  </div>
                  <div className="font-mono text-sm font-bold">{formatCurrency(item.grossAmount)}</div>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-700 pt-3 flex justify-between font-bold text-lg">
              <span>Gesamt</span>
              <span className="font-mono">{formatCurrency(total)}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                onClick={() => { setPaymentMethod('cash'); setModal('payment'); setShowBasket(false) }}
                className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 py-3 rounded-xl font-bold transition"
              >
                <Banknote className="h-4 w-4" /> Bar
              </button>
              <button
                onClick={() => { setPaymentMethod('card'); setModal('payment'); setShowBasket(false) }}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 py-3 rounded-xl font-bold transition"
              >
                <CreditCard className="h-4 w-4" /> Karte
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Payment modal ── */}
      {modal === 'payment' && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm">
            <h3 className="text-xl font-bold mb-1">Zahlungsart</h3>
            <p className="text-3xl font-mono font-bold text-indigo-400 mb-5">{formatCurrency(total)}</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[
                { method: 'cash' as const, label: 'Bar', icon: Banknote, color: 'bg-green-600 hover:bg-green-700' },
                { method: 'card' as const, label: 'Karte', icon: CreditCard, color: 'bg-blue-600 hover:bg-blue-700' },
              ].map(({ method, label, icon: Icon, color }) => (
                <button
                  key={method}
                  onClick={() => { setPaymentMethod(method); finishTransaction() }}
                  className={`${color} py-4 rounded-xl font-bold flex flex-col items-center gap-1 transition`}
                >
                  <Icon className="h-6 w-6" />
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => setModal('idle')} className="w-full py-3 rounded-xl border border-gray-700 text-gray-400 hover:bg-gray-800 transition">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* ── Processing ── */}
      {modal === 'processing' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-400" />
            <p className="text-gray-300">TSE-Signatur wird erstellt…</p>
          </div>
        </div>
      )}

      {/* ── Success ── */}
      {modal === 'success' && completedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm text-center">
            <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-1">Buchung #{completedTx.number}</h3>
            <p className="text-gray-400 text-sm mb-5">TSE-signiert und GoBD-konform gespeichert.</p>
            <div className="grid grid-cols-2 gap-2">
              <a
                href={`/api/receipts/${completedTx.id}/pdf`}
                target="_blank"
                className="py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-sm font-semibold transition text-center"
              >
                PDF Beleg
              </a>
              <button
                onClick={() => setModal('idle')}
                className="py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-sm font-semibold transition"
              >
                Neue Buchung
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {modal === 'error' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="bg-gray-900 rounded-2xl p-6 w-full max-w-sm text-center">
            <AlertCircle className="h-14 w-14 text-red-500 mx-auto mb-3" />
            <h3 className="text-xl font-bold mb-2 text-red-400">Buchung fehlgeschlagen</h3>
            <p className="text-gray-400 text-sm mb-5">{errorMsg}</p>
            <button
              onClick={() => setModal('idle')}
              className="w-full py-3 rounded-xl bg-gray-700 hover:bg-gray-600 font-semibold transition"
            >
              Schließen
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
