export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { format } from 'date-fns'
import { toZonedTime } from 'date-fns-tz'

const TZ = 'Europe/Berlin'

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

    // Only Growth plan
    if (merchant.subscription_plan !== 'growth' && merchant.subscription_plan !== 'trial') {
      return NextResponse.json({ error: 'DATEV-Export ist nur im Growth-Plan verfügbar' }, { status: 403 })
    }

    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('merchant_id', merchant_id)
      .eq('status', 'completed')
      .gte('finished_at', `${from}T00:00:00Z`)
      .lte('finished_at', `${to}T23:59:59Z`)
      .order('transaction_number')

    const txs = transactions || []

    // DATEV Buchungsstapel Format
    // Header line
    const header = [
      '"EXTF"',
      '510',
      '21',
      '"Buchungsstapel"',
      '7',
      '', // Created
      '', // Imported
      '', // Origin
      '', // Exported by
      '', // Imported by
      '1', // Consecutive number
      '', // Date from
      '', // Date to
      `"${merchant.steuernummer?.replace(/\//g, '')}"`, // Beraternummer (using steuernummer as proxy)
      `"${merchant.steuernummer?.replace(/\//g, '')}"`, // Mandantennummer
      `"${from.replace(/-/g, '')}"`, // WJ-Beginn
      '4', // Sachkontenrahmen
      '', // Sachkontennummernlänge
      '', // Beschriftung
      '', // DIKU-Beschriftung
      '', // Festschreibung
      '"EUR"', // Währungskennzeichen
      '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
    ].join(';')

    const columnHeaders = [
      'Umsatz (ohne Soll/Haben-Kz)',
      'Soll/Haben-Kennzeichen',
      'WKZ Umsatz',
      'Kurs',
      'Basis-Umsatz',
      'WKZ Basis-Umsatz',
      'Konto',
      'Gegenkonto (ohne BU-Schlüssel)',
      'BU-Schlüssel',
      'Belegdatum',
      'Belegfeld 1',
      'Belegfeld 2',
      'Skonto',
      'Buchungstext',
      'Postensperre',
      'Diverse Adressnummer',
      'Geschäftspartnerbank',
      'Sachverhalt',
      'Zinssperre',
      'Beleglink',
      'Beleginfo - Art 1',
      'Beleginfo - Inhalt 1',
      'Beleginfo - Art 2',
      'Beleginfo - Inhalt 2',
    ].map(h => `"${h}"`).join(';')

    const rows: string[] = []

    txs.forEach(tx => {
      if (!tx.finished_at) return
      const date = format(toZonedTime(new Date(tx.finished_at), TZ), 'ddMM')
      const belegnr = String(tx.transaction_number).padStart(6, '0')
      const paymentKonto = tx.payment_method === 'cash' ? '1000' : '1200'
      const buchungstext = `Kassenbeleg ${belegnr} ${tx.payment_method === 'cash' ? 'Bar' : 'Karte'}`

      // 7% Buchung
      if (tx.vat_7_net > 0) {
        const gross7 = tx.vat_7_net + tx.vat_7_amount
        rows.push([
          gross7.toFixed(2).replace('.', ','),
          'S',
          'EUR',
          '', '',  '',
          paymentKonto,    // Konto Kasse/Bank
          '4300',          // Gegenkonto: Erlöse 7% MwSt.
          '02',            // BU-Schlüssel: 7% MwSt.
          date,
          belegnr,
          '',
          '',
          `"${buchungstext} 7% MwSt."`,
          '', '', '', '', '', '', '', '', '', '',
        ].join(';'))
      }

      // 19% Buchung
      if (tx.vat_19_net > 0) {
        const gross19 = tx.vat_19_net + tx.vat_19_amount
        rows.push([
          gross19.toFixed(2).replace('.', ','),
          'S',
          'EUR',
          '', '', '',
          paymentKonto,    // Konto Kasse/Bank
          '4400',          // Gegenkonto: Erlöse 19% MwSt.
          '03',            // BU-Schlüssel: 19% MwSt.
          date,
          belegnr,
          '',
          '',
          `"${buchungstext} 19% MwSt."`,
          '', '', '', '', '', '', '', '', '', '',
        ].join(';'))
      }
    })

    const csv = [header, columnHeaders, ...rows].join('\r\n')

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="EXTF_Buchungen_${from}_${to}.csv"`,
      },
    })
  } catch (err) {
    console.error('DATEV export error:', err)
    return NextResponse.json({ error: 'DATEV-Export fehlgeschlagen' }, { status: 500 })
  }
}
