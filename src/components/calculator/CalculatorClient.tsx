'use client'
import { useState, useCallback } from 'react'
import { Delete, X, CheckCircle, CreditCard, Banknote, Loader2, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react'
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
  isDiscount?: boolean
}

interface CalculatorProps {
  merchant: {
    id: string
    button_names: Record<string, string> | null
    default_vat_rates: Record<string, number> | null
    tse_tss_id: string | null
    tse_client_id: string | null
    tse_serial_number: string | null
  }
  menuItems: MenuItem[]
}

const DEFAULT_BUTTONS = [
  { key: 'bakery', defaultLabel: 'Backwaren', defaultVat: 7, color: 'amber' },
  { key: 'cafe', defaultLabel: 'Heißgetränke', defaultVat: 19, color: 'purple' },
  { key: 'drinks', defaultLabel: 'Getränke', defaultVat: 19, color: 'blue' },
  { key: 'retail', defaultLabel: 'Sonstiges', defaultVat: 19, color: 'gray' },
]

const BUTTON_COLORS: Record<string, string> = {
  amber: 'bg-amber-500 active:bg-amber-600 hover:bg-amber-600 text-white',
  purple: 'bg-purple-600 active:bg-purple-700 hover:bg-purple-700 text-white',
  blue: 'bg-blue-500 active:bg-blue-600 hover:bg-blue-600 text-white',
  gray: 'bg-gray-500 active:bg-gray-600 hover:bg-gray-600 text-white',
}

type ModalState = 'idle' | 'payment' | 'processing' | 'success' | 'error'

export function CalculatorClient({ merchant, menuItems }: CalculatorProps) {
  const [display, setDisplay] = useState('0')
  const [basket, setBasket] = useState<BasketItem[]>([])
  const [multiplier, setMultiplier] = useState<2 | 3 | null>(null)
  const [discountMode, setDiscountMode] = useState(false)
  const [modal, setModal] = useState<ModalState>('idle')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card'>('cash')
  const [errorMsg, setErrorMsg] = useState('')
  const [completedTx, setCompletedTx] = useState<{ id: string; number: number } | null>(null)
  const [showMenu, setShowMenu] = useState(true)
  const [fiskalyTxId, setFiskalyTxId] = useState<string | null>(null)
  const [tsStarted, setTsStarted] = useState(false)

  const buttonNames = (merchant.button_names as Record<string, string>) || {}
  const vatRates = (merchant.default_vat_rates as Record<string, number>) || {}

  const buttons = DEFAULT_BUTTONS.map(b => ({
    ...b,
    label: buttonNames[b.key] || b.defaultLabel,
    vatRate: vatRates[b.key] ?? b.defaultVat,
  }))

  // Start TSE transaction on first keypress
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
      // Non-blocking — TSE failure handled at finish
      console.warn('TSE start failed, will retry at finish')
    }
  }, [tsStarted, merchant.id, merchant.tse_tss_id])

  function pressDigit(digit: string) {
    startTseTransaction()
    setDisplay(prev => {
      if (prev === '0' && digit !== '.') return digit
      if (digit === '.' && prev.includes('.')) return prev
      if (prev.includes('.') && prev.split('.')[1].length >= 2) return prev
      return prev + digit
    })
  }

  function pressBackspace() {
    setDisplay(prev => {
      if (prev.length <= 1) return '0'
      return prev.slice(0, -1) || '0'
    })
  }

  function pressClear() {
    setDisplay('0')
    setMultiplier(null)
    setDiscountMode(false)
  }

  function pressCategory(btn: typeof buttons[0]) {
    const amount = parseFloat(display)
    if (!amount || amount <= 0) return

    const qty = multiplier || 1
    const lineAmount = amount * qty
    const { net, vat } = calculateVat(lineAmount, btn.vatRate)

    if (discountMode) {
      // Apply as discount
      const discountAmount = -(lineAmount)
      const { net: dNet, vat: dVat } = calculateVat(Math.abs(discountAmount), btn.vatRate)
      const item: BasketItem = {
        id: crypto.randomUUID(),
        description: `Rabatt ${amount}% — ${btn.label}`,
        quantity: qty,
        unitPrice: -amount,
        vatRate: btn.vatRate,
        netAmount: -dNet,
        vatAmount: -dVat,
        grossAmount: discountAmount,
        category: btn.key,
        isDiscount: true,
      }
      setBasket(prev => [...prev, item])
    } else {
      const item: BasketItem = {
        id: crypto.randomUUID(),
        description: `${btn.label}${qty > 1 ? ` × ${qty}` : ''}`,
        quantity: qty,
        unitPrice: amount,
        vatRate: btn.vatRate,
        netAmount: net,
        vatAmount: vat,
        grossAmount: lineAmount,
        category: btn.key,
      }
      setBasket(prev => [...prev, item])
    }

    // Haptic feedback
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(30)
    }

    setDisplay('0')
    setMultiplier(null)
    setDiscountMode(false)
  }

  function addMenuItemToBasket(item: MenuItem) {
    startTseTransaction()
    const qty = multiplier || 1
    const lineAmount = item.price * qty
    const { net, vat } = calculateVat(lineAmount, item.vat_rate)
    setBasket(prev => [
      ...prev,
      {
        id: crypto.randomUUID(),
        description: `${item.name}${qty > 1 ? ` × ${qty}` : ''}`,
        quantity: qty,
        unitPrice: item.price,
        vatRate: item.vat_rate,
        netAmount: net,
        vatAmount: vat,
        grossAmount: lineAmount,
        category: item.category,
        menuItemId: item.id,
      },
    ])
    setDisplay('0')
    setMultiplier(null)
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(30)
  }

  const total = basket.reduce((s, i) => s + i.grossAmount, 0)
  const vat7Net = basket.filter(i => i.vatRate === 7).reduce((s, i) => s + i.netAmount, 0)
  const vat19Net = basket.filter(i => i.vatRate === 19).reduce((s, i) => s + i.netAmount, 0)

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
        setErrorMsg(data.error || 'Buchung fehlgeschlagen. TSE-Signatur konnte nicht erstellt werden.')
        return
      }

      setCompletedTx({ id: data.transaction_id, number: data.transaction_number })
      setModal('success')
      setBasket([])
      setDisplay('0')
      setFiskalyTxId(null)
      setTsStarted(false)

      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate([50, 30, 50])
    } catch {
      setModal('error')
      setErrorMsg('Verbindungsfehler. Bitte Internetverbindung prüfen und erneut versuchen.')
    }
  }

  function removeItem(id: string) {
    setBasket(prev => prev.filter(i => i.id !== id))
  }

  const numKeys = ['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0', '⌫']

  return (
    <div className="flex flex-col h-screen max-h-screen bg-gray-950 text-white overflow-hidden pb-16 md:pb-0">

      {/* ── Basket ── */}
      <div className="flex-shrink-0 bg-gray-900 border-b border-gray-800 max-h-48 overflow-y-auto">
        {basket.length === 0 ? (
          <div className="flex items-center justify-center py-4 text-gray-500 text-sm">
            Kasse bereit — Betrag eingeben und Kategorie tippen
          </div>
        ) : (
          <div className="divide-y divide-gray-800">
            {basket.map(item => (
              <div key={item.id} className="flex items-center justify-between px-4 py-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn('text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0', item.vatRate === 7 ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400')}>
                    {item.vatRate}%
                  </span>
                  <span className="text-sm truncate">{item.description}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={cn('font-mono text-sm', item.grossAmount < 0 ? 'text-red-400' : 'text-white')}>
                    {formatCurrency(item.grossAmount)}
                  </span>
                  <button onClick={() => removeItem(item.id)} className="text-gray-600 hover:text-red-400 transition p-0.5">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Total ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 bg-gray-900">
        <span className="text-gray-400 text-sm">Gesamt</span>
        <span className="text-3xl font-bold font-mono tabular-nums">{formatCurrency(total)}</span>
      </div>

      {/* ── Display ── */}
      <div className="flex-shrink-0 px-5 py-2 flex items-center justify-between bg-gray-950">
        <div className="flex items-center gap-2">
          {multiplier && (
            <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">×{multiplier}</span>
          )}
          {discountMode && (
            <span className="bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-bold">RABATT %</span>
          )}
        </div>
        <div className="text-right">
          <span className="text-4xl font-mono font-bold tabular-nums">
            €{display}
          </span>
        </div>
      </div>

      {/* ── Menu chips ── */}
      {menuItems.length > 0 && (
        <div className="flex-shrink-0 bg-gray-900/50">
          <button
            onClick={() => setShowMenu(s => !s)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs text-gray-500 hover:text-gray-300"
          >
            <span>Gespeicherte Artikel ({menuItems.length})</span>
            {showMenu ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
          {showMenu && (
            <div className="flex gap-2 overflow-x-auto px-4 pb-3 no-scrollbar">
              {menuItems.map(item => (
                <button
                  key={item.id}
                  onClick={() => addMenuItemToBasket(item)}
                  className="flex-shrink-0 bg-gray-800 hover:bg-gray-700 rounded-xl px-3 py-2 text-sm text-left transition active:scale-95"
                >
                  <div className="font-medium whitespace-nowrap">{item.name}</div>
                  <div className="text-indigo-400 font-mono text-xs">{formatCurrency(item.price)}</div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Numpad ── */}
      <div className="flex-1 flex flex-col min-h-0 px-3 pb-2 pt-1">
        <div className="grid grid-cols-3 gap-2 flex-1">
          {numKeys.map(key => (
            <button
              key={key}
              onClick={() => key === '⌫' ? pressBackspace() : pressDigit(key)}
              className={cn(
                'rounded-2xl text-2xl font-semibold transition active:scale-95 flex items-center justify-center',
                key === '⌫'
                  ? 'bg-gray-700 hover:bg-gray-600 text-red-400'
                  : 'bg-gray-800 hover:bg-gray-700 text-white'
              )}
            >
              {key === '⌫' ? <Delete className="h-6 w-6" /> : key}
            </button>
          ))}
        </div>

        {/* Multiplier + discount row */}
        <div className="flex gap-2 mt-2">
          {([2, 3] as const).map(n => (
            <button
              key={n}
              onClick={() => setMultiplier(prev => prev === n ? null : n)}
              className={cn(
                'flex-1 rounded-xl py-2 text-sm font-bold transition',
                multiplier === n ? 'bg-indigo-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              )}
            >
              ×{n}
            </button>
          ))}
          <button
            onClick={() => setDiscountMode(d => !d)}
            className={cn(
              'flex-1 rounded-xl py-2 text-sm font-bold transition',
              discountMode ? 'bg-red-600 text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
            )}
          >
            –%
          </button>
          <button
            onClick={pressClear}
            className="flex-1 rounded-xl py-2 text-sm font-bold bg-gray-800 text-gray-300 hover:bg-gray-700 transition"
          >
            CLR
          </button>
        </div>
      </div>

      {/* ── Category buttons ── */}
      <div className="flex-shrink-0 grid grid-cols-2 gap-2 px-3 pb-3">
        {buttons.map(btn => (
          <button
            key={btn.key}
            onClick={() => pressCategory(btn)}
            disabled={parseFloat(display) <= 0}
            className={cn(
              'rounded-2xl py-5 font-bold text-sm transition active:scale-95 disabled:opacity-40',
              BUTTON_COLORS[btn.color]
            )}
          >
            <div className="text-base">{btn.label}</div>
            <div className="opacity-80 text-xs mt-0.5">{btn.vatRate}% MwSt.</div>
          </button>
        ))}
      </div>

      {/* ── Finish button ── */}
      <div className="flex-shrink-0 px-3 pb-3 md:pb-3">
        <button
          onClick={() => basket.length > 0 && setModal('payment')}
          disabled={basket.length === 0}
          className="w-full bg-green-500 hover:bg-green-400 disabled:opacity-40 text-white font-bold py-5 rounded-2xl text-lg transition active:scale-[0.98]"
        >
          Abschluss & Beleg — {formatCurrency(total)}
        </button>
      </div>

      {/* ── Payment Modal ── */}
      {modal === 'payment' && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end md:items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-sm p-6 space-y-5">
            <h3 className="text-lg font-bold">Zahlungsart wählen</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaymentMethod('cash')}
                className={cn('flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition', paymentMethod === 'cash' ? 'border-green-500 bg-green-500/10' : 'border-gray-700 hover:border-gray-600')}
              >
                <Banknote className="h-8 w-8" />
                <span className="font-semibold">Bar</span>
              </button>
              <button
                onClick={() => setPaymentMethod('card')}
                className={cn('flex flex-col items-center gap-2 py-4 rounded-xl border-2 transition', paymentMethod === 'card' ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700 hover:border-gray-600')}
              >
                <CreditCard className="h-8 w-8" />
                <span className="font-semibold">Karte</span>
              </button>
            </div>
            <div className="flex items-center justify-between py-2 border-t border-gray-800">
              <span className="text-gray-400">Gesamtbetrag</span>
              <span className="text-2xl font-bold font-mono">{formatCurrency(total)}</span>
            </div>
            <button
              onClick={finishTransaction}
              className="w-full bg-green-500 hover:bg-green-400 text-white font-bold py-4 rounded-xl text-lg transition"
            >
              Buchung abschließen
            </button>
            <button onClick={() => setModal('idle')} className="w-full text-gray-400 py-2 text-sm">
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* ── Processing Modal ── */}
      {modal === 'processing' && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-indigo-400 mx-auto" />
            <p className="text-white font-medium">TSE signiert Buchung…</p>
            <p className="text-gray-400 text-sm">Bitte warten</p>
          </div>
        </div>
      )}

      {/* ── Success Modal ── */}
      {modal === 'success' && completedTx && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-sm p-6 text-center space-y-4">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-9 w-9 text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold">Buchung #{completedTx.number}</h3>
              <p className="text-gray-400 text-sm mt-1">TSE-signiert und gespeichert</p>
            </div>
            <div className="flex gap-3">
              <a
                href={`/receipts/${completedTx.id}`}
                target="_blank"
                className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 rounded-xl transition text-sm"
              >
                Beleg anzeigen
              </a>
              <button
                onClick={() => setModal('idle')}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 rounded-xl transition text-sm"
              >
                Neue Buchung
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Error Modal ── */}
      {modal === 'error' && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-end md:items-center justify-center p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <AlertCircle className="h-6 w-6 text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-red-400">Buchung fehlgeschlagen</h3>
                <p className="text-sm text-gray-400 mt-0.5">{errorMsg}</p>
              </div>
            </div>
            <p className="text-xs text-amber-400 bg-amber-500/10 rounded-lg p-3">
              Die Buchung wurde NICHT gespeichert. Bitte versuchen Sie es erneut. Unvollständige TSE-Daten sind gesetzlich nicht zulässig.
            </p>
            <div className="flex gap-3">
              <button onClick={() => { setModal('payment'); setErrorMsg('') }} className="flex-1 bg-indigo-600 text-white font-semibold py-3 rounded-xl text-sm">
                Erneut versuchen
              </button>
              <button onClick={() => { setModal('idle'); setErrorMsg('') }} className="flex-1 bg-gray-800 text-white font-semibold py-3 rounded-xl text-sm">
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
