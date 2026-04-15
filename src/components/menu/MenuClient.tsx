'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Plus, Loader2, Check, X, AlertCircle, Pencil, FileText } from 'lucide-react'
import { formatCurrency, cn } from '@/lib/utils'
import type { MenuItem } from '@/types/database'

interface ScannedItem {
  name: string
  price: number
  suggested_vat_rate: 7 | 19
}

interface EditableItem extends ScannedItem {
  _key: string
}

interface Props {
  merchant: { id: string; subscription_plan: string | null }
  menuItems: MenuItem[]
}

export function MenuClient({ merchant, menuItems: initialItems }: Props) {
  const router = useRouter()
  const [items, setItems] = useState<MenuItem[]>(initialItems)
  const [scanning, setScanning] = useState(false)
  const [scannedItems, setScannedItems] = useState<EditableItem[]>([])
  const [scanError, setScanError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<MenuItem>>({})
  const [showAddManual, setShowAddManual] = useState(false)
  const [newItem, setNewItem] = useState({ name: '', price: '', vat_rate: 19, category: 'retail' })

  const isGrowth = merchant.subscription_plan === 'growth' || merchant.subscription_plan === 'trial'

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setScanError('')
    setScanning(true)
    setScannedItems([])

    try {
      const isPdf = file.type === 'application/pdf'

      if (isPdf && file.size > 10 * 1024 * 1024) {
        throw new Error('PDF zu groß. Maximale Größe: 10 MB')
      }
      if (!isPdf && file.size > 20 * 1024 * 1024) {
        throw new Error('Bild zu groß. Maximale Größe: 20 MB')
      }

      const formData = new FormData()
      // Use same 'image' field — API handles both image and PDF
      formData.append('image', file)
      formData.append('merchant_id', merchant.id)
      formData.append('file_type', isPdf ? 'pdf' : 'image')

      const res = await fetch('/api/menu/scan', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Scan fehlgeschlagen')

      const parsed: ScannedItem[] = data.items || []
      if (parsed.length === 0) {
        setScanError('Keine Artikel erkannt. Bitte versuchen Sie ein klareres Foto oder eine andere PDF-Seite.')
        return
      }

      setScannedItems(parsed.map((item, i) => ({ ...item, _key: `scan-${i}-${Date.now()}` })))
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan fehlgeschlagen')
    } finally {
      setScanning(false)
      e.target.value = ''
    }
  }

  function updateScanned(key: string, field: keyof EditableItem, value: string | number) {
    setScannedItems(prev => prev.map(item =>
      item._key === key ? { ...item, [field]: field === 'price' ? parseFloat(String(value)) || 0 : value } : item
    ))
  }

  function removeScanned(key: string) {
    setScannedItems(prev => prev.filter(item => item._key !== key))
  }

  async function saveScanned() {
    if (scannedItems.length === 0) return
    setSaving(true)
    try {
      const res = await fetch('/api/menu/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchant_id: merchant.id,
          items: scannedItems.map(item => ({ name: item.name, price: item.price, suggested_vat_rate: item.suggested_vat_rate, category: vatToCategory(item.suggested_vat_rate) })),
        }),
      })
      if (!res.ok) throw new Error('Speichern fehlgeschlagen')
      setSaved(true)
      setScannedItems([])
      router.refresh()
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  function vatToCategory(vat: number) {
    return vat === 7 ? 'bakery' : 'retail'
  }

  async function saveEdit(id: string) {
    const res = await fetch(`/api/menu/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editValues),
    })
    if (res.ok) {
      setItems(prev => prev.map(item => item.id === id ? { ...item, ...editValues } : item))
      setEditingId(null)
    }
  }

  async function toggleActive(item: MenuItem) {
    const res = await fetch(`/api/menu/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !item.is_active }),
    })
    if (res.ok) {
      setItems(prev => prev.map(m => m.id === item.id ? { ...m, is_active: !m.is_active } : m))
    }
  }

  async function addManual() {
    if (!newItem.name || !newItem.price) return
    const res = await fetch('/api/menu/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: merchant.id,
        items: [{ name: newItem.name, price: parseFloat(newItem.price), suggested_vat_rate: newItem.vat_rate, category: newItem.category }],
      }),
    })
    if (res.ok) {
      router.refresh()
      setShowAddManual(false)
      setNewItem({ name: '', price: '', vat_rate: 19, category: 'retail' })
    }
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl pb-24 md:pb-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Menü</h1>
          <p className="text-sm text-gray-500">{items.length} Artikel gespeichert</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddManual(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition"
          >
            <Plus className="h-4 w-4" />
            Manuell
          </button>
          <label className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer transition',
            isGrowth ? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          )}>
            <Camera className="h-4 w-4" />
            Foto scannen
            {isGrowth && <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileSelect} />}
          </label>
          <label className={cn('flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium cursor-pointer transition',
            isGrowth ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          )}>
            <FileText className="h-4 w-4" />
            PDF hochladen
            {isGrowth && <input type="file" accept="application/pdf" className="hidden" onChange={handleFileSelect} />}
          </label>
        </div>
      </div>

      {!isGrowth && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl p-4 text-sm">
          <p className="font-medium text-amber-800 dark:text-amber-300">Foto-Scanner ist im Growth-Plan enthalten</p>
          <p className="text-amber-600 dark:text-amber-400 mt-0.5">Upgrade auf Growth (€29,90/Monat) um Menüs per Foto zu scannen.</p>
        </div>
      )}

      {/* Scanning indicator */}
      {scanning && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-6 flex items-center gap-4">
          <Loader2 className="h-8 w-8 text-indigo-600 animate-spin flex-shrink-0" />
          <div>
            <p className="font-semibold text-indigo-800 dark:text-indigo-300">Menü wird analysiert…</p>
            <p className="text-sm text-indigo-600 dark:text-indigo-400">GPT-4o erkennt Artikel und Preise</p>
          </div>
        </div>
      )}

      {/* Scan error */}
      {scanError && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 flex items-center gap-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          {scanError}
        </div>
      )}

      {/* Saved confirmation */}
      {saved && (
        <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4 flex items-center gap-3 text-sm text-green-700 dark:text-green-400">
          <Check className="h-5 w-5" />
          Artikel gespeichert! Sie werden jetzt in der Kasse angezeigt.
        </div>
      )}

      {/* Scanned items preview / edit */}
      {scannedItems.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{scannedItems.length} erkannte Artikel — bitte prüfen</h2>
          </div>
          <div className="space-y-2">
            {scannedItems.map(item => (
              <div key={item._key} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 space-y-2">
                    <input
                      value={item.name}
                      onChange={(e) => updateScanned(item._key, 'name', e.target.value)}
                      className="w-full font-medium bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5 flex-1">
                        <span className="text-gray-400 text-sm">€</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.price}
                          onChange={(e) => updateScanned(item._key, 'price', e.target.value)}
                          className="w-24 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                        />
                      </div>
                      <button
                        onClick={() => updateScanned(item._key, 'suggested_vat_rate', item.suggested_vat_rate === 7 ? 19 : 7)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs font-bold transition',
                          item.suggested_vat_rate === 7
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                        )}
                      >
                        {item.suggested_vat_rate}% MwSt.
                      </button>
                    </div>
                  </div>
                  <button onClick={() => removeScanned(item._key)} className="text-gray-400 hover:text-red-500 transition p-1">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            onClick={saveScanned}
            disabled={saving}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {saving ? 'Wird gespeichert…' : `${scannedItems.length} Artikel speichern`}
          </button>
        </div>
      )}

      {/* Add manual modal */}
      {showAddManual && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-sm p-5 space-y-4">
            <h3 className="font-bold text-lg">Artikel manuell hinzufügen</h3>
            <input
              placeholder="Artikelname"
              value={newItem.name}
              onChange={e => setNewItem(p => ({ ...p, name: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Preis (€)"
                value={newItem.price}
                onChange={e => setNewItem(p => ({ ...p, price: e.target.value }))}
                className="flex-1 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
              />
              <button
                onClick={() => setNewItem(p => ({ ...p, vat_rate: p.vat_rate === 7 ? 19 : 7 }))}
                className={cn('px-3 py-2 rounded-xl text-sm font-bold transition',
                  newItem.vat_rate === 7 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                )}
              >
                {newItem.vat_rate}%
              </button>
            </div>
            <select
              value={newItem.category}
              onChange={e => setNewItem(p => ({ ...p, category: e.target.value }))}
              className="w-full border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="bakery">Backwaren</option>
              <option value="cafe">Heißgetränke</option>
              <option value="drinks">Getränke</option>
              <option value="retail">Sonstiges</option>
            </select>
            <div className="flex gap-2">
              <button onClick={() => setShowAddManual(false)} className="flex-1 py-3 rounded-xl border border-gray-300 dark:border-gray-700 font-medium">
                Abbrechen
              </button>
              <button onClick={addManual} className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition">
                Hinzufügen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Existing menu items */}
      <div className="space-y-2">
        <h2 className="font-semibold">Gespeicherte Artikel</h2>
        {items.length === 0 ? (
          <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-8 text-center text-gray-400">
            <Camera className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Noch keine Artikel</p>
            <p className="text-sm mt-1">Scannen Sie Ihr Menü oder fügen Sie Artikel manuell hinzu</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className={cn('bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-4 transition', !item.is_active && 'opacity-50')}>
              {editingId === item.id ? (
                <div className="space-y-2">
                  <input
                    value={editValues.name ?? item.name}
                    onChange={e => setEditValues(p => ({ ...p, name: e.target.value }))}
                    className="w-full border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={editValues.price ?? item.price}
                      onChange={e => setEditValues(p => ({ ...p, price: parseFloat(e.target.value) }))}
                      className="w-28 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-gray-800 focus:ring-2 focus:ring-indigo-500 outline-none font-mono"
                    />
                    <button
                      onClick={() => setEditValues(p => ({ ...p, vat_rate: (p.vat_rate ?? item.vat_rate) === 7 ? 19 : 7 }))}
                      className={cn('px-2 py-1 rounded-lg text-xs font-bold',
                        (editValues.vat_rate ?? item.vat_rate) === 7 ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      )}
                    >
                      {editValues.vat_rate ?? item.vat_rate}%
                    </button>
                    <button onClick={() => saveEdit(item.id)} className="ml-auto p-1.5 bg-green-500 text-white rounded-lg">
                      <Check className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-200 dark:bg-gray-700 rounded-lg">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={cn('text-xs px-1.5 py-0.5 rounded font-bold flex-shrink-0',
                      item.vat_rate === 7 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                    )}>
                      {item.vat_rate}%
                    </span>
                    <span className="font-medium truncate">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="font-mono font-semibold">{formatCurrency(item.price)}</span>
                    <button onClick={() => { setEditingId(item.id); setEditValues({}) }} className="p-1.5 text-gray-400 hover:text-indigo-600 transition">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => toggleActive(item)} className={cn('p-1.5 rounded-lg transition text-xs font-bold',
                      item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    )}>
                      {item.is_active ? '✓' : '○'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
