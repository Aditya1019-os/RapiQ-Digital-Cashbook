export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import JSZip from 'jszip'
import { formatDateTime } from '@/lib/utils'

function toCsv(headers: string[], rows: string[][]): string {
  const escape = (v: string) => `"${String(v).replace(/"/g, '""')}"`
  return [headers.map(escape).join(';'), ...rows.map(r => r.map(escape).join(';'))].join('\r\n')
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const merchant_id = searchParams.get('merchant_id')
    const from = searchParams.get('from')
    const to = searchParams.get('to')

    if (!merchant_id || !from || !to) {
      return NextResponse.json({ error: 'Parameter fehlen' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

    const { data: merchant } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', merchant_id)
      .eq('user_id', user.id)
      .single()
    if (!merchant) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*, transaction_lines(*)')
      .eq('merchant_id', merchant_id)
      .eq('status', 'completed')
      .gte('finished_at', `${from}T00:00:00Z`)
      .lte('finished_at', `${to}T23:59:59Z`)
      .order('transaction_number')

    const txs = transactions || []

    // ── transactions.csv ─────────────────────────────────────────────────────
    const txCsvHeaders = [
      'Z_KASSE_ID', 'Z_ERSTELLUNG', 'Z_NR', 'BON_ID', 'BON_NR',
      'BON_TYP', 'BON_NAME', 'TERMINAL_ID', 'ZAHLUNGSART',
      'BRUTTO_BETRAG', 'NETTO_BETRAG', 'UST_BETRAG',
      'TSE_ID', 'TSE_TANR', 'TSE_SIGZ', 'TSE_SIG', 'TSE_ZEITPUNKT_STOP',
    ]
    const txRows = txs.map(tx => [
      merchant_id.slice(0, 8),
      formatDateTime(tx.finished_at || tx.created_at),
      tx.transaction_number,
      tx.id,
      tx.transaction_number,
      tx.process_type === 'Kassenbeleg-V1-Storno' ? 'Storno' : 'Beleg',
      'Kassenbeleg',
      '1',
      tx.payment_method === 'cash' ? 'Bar' : 'Karte',
      tx.total.toFixed(2),
      (tx.vat_7_net + tx.vat_19_net).toFixed(2),
      (tx.vat_7_amount + tx.vat_19_amount).toFixed(2),
      tx.tse_serial || '',
      tx.tse_transaction_number || '',
      tx.tse_signature_counter || 0,
      tx.tse_signature_base64 || '',
      tx.tse_finish_time ? formatDateTime(tx.tse_finish_time) : '',
    ])

    // ── lines.csv ────────────────────────────────────────────────────────────
    const lineHeaders = ['BON_ID', 'POS_ZEILE', 'ARTIKEL_TEXT', 'MENGE', 'EINZELPREIS', 'UST_SCHLUESSEL', 'BRUTTO_BETRAG']
    const lineRows: string[][] = []
    txs.forEach(tx => {
      const lines = (tx as { transaction_lines?: { id: string; description: string; quantity: number; unit_price: number; vat_rate: number; gross_amount: number }[] }).transaction_lines || []
      lines.forEach((line: { id: string; description: string; quantity: number; unit_price: number; vat_rate: number; gross_amount: number }, idx: number) => {
        lineRows.push([
          tx.id, String(idx + 1), line.description,
          String(line.quantity), line.unit_price.toFixed(2),
          line.vat_rate === 7 ? '2' : '1',
          line.gross_amount.toFixed(2),
        ])
      })
    })

    // ── vat.csv ──────────────────────────────────────────────────────────────
    const vatHeaders = ['BON_ID', 'UST_SCHLUESSEL', 'UST_SATZ', 'NETTO_BETRAG', 'UST_BETRAG', 'BRUTTO_BETRAG']
    const vatRows: string[][] = []
    txs.forEach(tx => {
      if (tx.vat_7_net > 0) {
        vatRows.push([tx.id, '2', '7.00', tx.vat_7_net.toFixed(2), tx.vat_7_amount.toFixed(2), (tx.vat_7_net + tx.vat_7_amount).toFixed(2)])
      }
      if (tx.vat_19_net > 0) {
        vatRows.push([tx.id, '1', '19.00', tx.vat_19_net.toFixed(2), tx.vat_19_amount.toFixed(2), (tx.vat_19_net + tx.vat_19_amount).toFixed(2)])
      }
    })

    // ── cashpoints.csv ───────────────────────────────────────────────────────
    const cpHeaders = ['KASSE_SERIENNR', 'KASSE_BRAND', 'KASSE_MODELL', 'KASSE_VERSION', 'STANDORT']
    const cpRows = [[
      merchant.tse_serial_number || 'N/A',
      'RapiQ',
      'RapiQ Cloud POS',
      '1.0.0',
      `${merchant.address}, ${merchant.postal_code} ${merchant.city}`,
    ]]

    // ── tse.csv ──────────────────────────────────────────────────────────────
    const tseHeaders = ['TSE_ID', 'TSE_SERIAL', 'TSE_ANBIETER', 'TSE_VERSION', 'BON_ID', 'ZEITPUNKT_START', 'ZEITPUNKT_STOP', 'SIG_ZAEHLER', 'SIGNATUR']
    const tseRows = txs.map(tx => [
      tx.tse_tss_id || '',
      tx.tse_serial || '',
      'fiskaly',
      '2.0',
      tx.id,
      tx.tse_start_time ? formatDateTime(tx.tse_start_time) : '',
      tx.tse_finish_time ? formatDateTime(tx.tse_finish_time) : '',
      String(tx.tse_signature_counter || 0),
      tx.tse_signature_base64 || '',
    ])

    const zip = new JSZip()
    const folder = zip.folder('dsfinvk-export')!
    folder.file('transactions.csv', toCsv(txCsvHeaders, txRows))
    folder.file('lines.csv', toCsv(lineHeaders, lineRows))
    folder.file('vat.csv', toCsv(vatHeaders, vatRows))
    folder.file('cashpoints.csv', toCsv(cpHeaders, cpRows))
    folder.file('tse.csv', toCsv(tseHeaders, tseRows))
    folder.file('README.txt', `DSFinV-K v2.3 Export
Generiert: ${new Date().toISOString()}
Händler: ${merchant.business_name}
Zeitraum: ${from} bis ${to}
Steuernummer: ${merchant.steuernummer}
TSE-Seriennummer: ${merchant.tse_serial_number || 'N/A'}
Erstellt mit: RapiQ v1.0.0

Dieses Exportpaket enthält alle erforderlichen Dateien gemäß
DSFinV-K v2.3 (Digitale Schnittstelle der Finanzverwaltung für Kassensysteme).`)

    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })
    const uint8 = new Uint8Array(buffer)

    return new NextResponse(uint8, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="dsfinvk-${from}-${to}.zip"`,
      },
    })
  } catch (err) {
    console.error('DSFinV-K export error:', err)
    return NextResponse.json({ error: 'Export fehlgeschlagen' }, { status: 500 })
  }
}
