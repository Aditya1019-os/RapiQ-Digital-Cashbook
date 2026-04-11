import { createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatDateTime, formatCurrency, truncateSignature } from '@/lib/utils'
import type { TransactionWithLines } from '@/types/database'
import { ReceiptDownloadButton } from '@/components/receipt/ReceiptDownloadButton'
import QRCode from 'react-qr-code'

export const dynamic = 'force-dynamic'

export default async function ReceiptPage({ params }: { params: { id: string } }) {
  const supabase = createServiceClient()

  const { data: tx } = await supabase
    .from('transactions')
    .select(`
      *,
      transaction_lines(*),
      merchants(business_name, address, city, postal_code, steuernummer, ust_id_nr, logo_url)
    `)
    .eq('id', params.id)
    .eq('status', 'completed')
    .single() as { data: TransactionWithLines | null }

  if (!tx) notFound()

  const merchant = tx.merchants
  const lines = tx.transaction_lines || []
  const receiptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/receipts/${tx.id}`

  const has7 = tx.vat_7_net > 0
  const has19 = tx.vat_19_net > 0

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-950 flex items-start justify-center py-8 px-4">
      <div className="w-full max-w-sm">
        {/* Receipt card */}
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden font-mono text-sm">
          {/* Header */}
          <div className="bg-indigo-600 px-6 py-5 text-center text-white">
            <div className="text-xs uppercase tracking-widest opacity-80 mb-1">Kassenbeleg</div>
            <div className="text-xl font-bold">{merchant?.business_name}</div>
            <div className="text-xs opacity-80 mt-1">{merchant?.address}</div>
            <div className="text-xs opacity-80">{merchant?.postal_code} {merchant?.city}</div>
            {merchant?.steuernummer && (
              <div className="text-xs opacity-70 mt-1">StNr: {merchant.steuernummer}</div>
            )}
            {merchant?.ust_id_nr && (
              <div className="text-xs opacity-70">USt-IdNr: {merchant.ust_id_nr}</div>
            )}
          </div>

          <div className="px-5 py-4 space-y-4">
            {/* Meta */}
            <div className="grid grid-cols-2 gap-1 text-xs">
              <span className="text-gray-500">Beleg-Nr.</span>
              <span className="text-right font-bold">{String(tx.transaction_number).padStart(6, '0')}</span>
              <span className="text-gray-500">Datum</span>
              <span className="text-right">{formatDateTime(tx.finished_at || tx.created_at)}</span>
              <span className="text-gray-500">Zahlungsart</span>
              <span className="text-right">{tx.payment_method === 'cash' ? 'Bar' : 'Kartenzahlung'}</span>
            </div>

            <div className="border-t border-dashed border-gray-200 dark:border-gray-700" />

            {/* Line items */}
            <div className="space-y-2">
              {lines.map(line => (
                <div key={line.id} className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm">{line.description}</div>
                    <div className="text-xs text-gray-400">
                      {line.quantity !== 1 && `${line.quantity} × ${formatCurrency(line.unit_price)}  `}
                      <span className={`inline-block px-1 rounded text-xs ${line.vat_rate === 7 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'}`}>
                        {line.vat_rate}%
                      </span>
                    </div>
                  </div>
                  <span className={`font-medium text-sm flex-shrink-0 ${line.gross_amount < 0 ? 'text-red-500' : ''}`}>
                    {formatCurrency(line.gross_amount)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-200 dark:border-gray-700" />

            {/* VAT breakdown */}
            <div className="space-y-1 text-xs">
              <div className="grid grid-cols-4 gap-1 text-gray-400 pb-1 border-b border-gray-100 dark:border-gray-800">
                <span>MwSt</span>
                <span className="text-right">Netto</span>
                <span className="text-right">MwSt.</span>
                <span className="text-right">Brutto</span>
              </div>
              {has7 && (
                <div className="grid grid-cols-4 gap-1">
                  <span className="text-amber-600 font-medium">7%</span>
                  <span className="text-right">{formatCurrency(tx.vat_7_net)}</span>
                  <span className="text-right">{formatCurrency(tx.vat_7_amount)}</span>
                  <span className="text-right">{formatCurrency(tx.vat_7_net + tx.vat_7_amount)}</span>
                </div>
              )}
              {has19 && (
                <div className="grid grid-cols-4 gap-1">
                  <span className="text-blue-600 font-medium">19%</span>
                  <span className="text-right">{formatCurrency(tx.vat_19_net)}</span>
                  <span className="text-right">{formatCurrency(tx.vat_19_amount)}</span>
                  <span className="text-right">{formatCurrency(tx.vat_19_net + tx.vat_19_amount)}</span>
                </div>
              )}
            </div>

            <div className="border-t-2 border-gray-900 dark:border-gray-100 pt-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-bold">GESAMT</span>
                <span className="text-2xl font-bold">{formatCurrency(tx.total)}</span>
              </div>
            </div>

            <div className="border-t border-dashed border-gray-200 dark:border-gray-700" />

            {/* TSE data (§6 KassenSichV) */}
            <div className="space-y-1.5">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">TSE-Daten (§146a AO)</div>
              {[
                ['TSE-Seriennummer', tx.tse_serial],
                ['Vorgangsnummer', tx.tse_transaction_number],
                ['Signaturzähler', String(tx.tse_signature_counter || 0)],
                ['Prozesstyp', tx.process_type],
                ['Startzeit', tx.tse_start_time ? formatDateTime(tx.tse_start_time) : '-'],
                ['Endzeit', tx.tse_finish_time ? formatDateTime(tx.tse_finish_time) : '-'],
                ['Signatur', tx.tse_signature_base64 ? truncateSignature(tx.tse_signature_base64) : '-'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-xs gap-2">
                  <span className="text-gray-400 flex-shrink-0">{label}</span>
                  <span className="text-right break-all font-mono text-gray-700 dark:text-gray-300">{value || '-'}</span>
                </div>
              ))}
            </div>

            <div className="border-t border-dashed border-gray-200 dark:border-gray-700" />

            {/* QR code */}
            <div className="flex flex-col items-center gap-2">
              <QRCode value={receiptUrl} size={96} />
              <p className="text-xs text-gray-400 text-center">Scannen für digitalen Beleg</p>
            </div>

            {/* Footer */}
            <div className="text-center text-xs text-gray-400 pt-2 border-t border-dashed border-gray-200 dark:border-gray-700">
              <p>Vielen Dank für Ihren Einkauf!</p>
              <p className="mt-1">Powered by RapiQ · rapiq.net</p>
            </div>
          </div>
        </div>

        {/* Download PDF button */}
        <ReceiptDownloadButton transactionId={tx.id} />
      </div>
    </div>
  )
}
