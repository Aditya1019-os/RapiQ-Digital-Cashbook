'use client'
import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

export function ReceiptDownloadButton({ transactionId }: { transactionId: string }) {
  const [loading, setLoading] = useState(false)

  async function downloadPdf() {
    setLoading(true)
    try {
      const res = await fetch(`/api/receipts/${transactionId}/pdf`)
      if (!res.ok) throw new Error('PDF konnte nicht erstellt werden')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `beleg-${transactionId.slice(0, 8)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert('Fehler beim PDF-Download. Bitte erneut versuchen.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={downloadPdf}
      disabled={loading}
      className="mt-4 w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      Beleg als PDF herunterladen
    </button>
  )
}
