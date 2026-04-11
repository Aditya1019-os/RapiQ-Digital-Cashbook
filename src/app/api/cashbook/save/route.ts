import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { merchant_id, entry_date, card_terminal_total, cash_counted, cash_expected, note } = body

    if (!merchant_id || !entry_date) {
      return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

    // Verify merchant
    const { data: merchant } = await supabase
      .from('merchants')
      .select('id, tse_tss_id, tse_client_id, tse_serial_number')
      .eq('id', merchant_id)
      .eq('user_id', user.id)
      .single()
    if (!merchant) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })

    // Check no duplicate
    const { data: existing } = await supabase
      .from('cashbook_entries')
      .select('id')
      .eq('merchant_id', merchant_id)
      .eq('entry_date', entry_date)
      .single()
    if (existing) {
      return NextResponse.json({ error: 'Tagesabschluss für diesen Tag bereits vorhanden' }, { status: 409 })
    }

    const calculatorTotal = card_terminal_total + cash_counted

    const { data: entry, error: insertError } = await supabase
      .from('cashbook_entries')
      .insert({
        merchant_id,
        entry_date,
        card_terminal_total,
        cash_counted,
        cash_expected,
        calculator_total: calculatorTotal,
        note: note || null,
        tse_serial: merchant.tse_serial_number,
      })
      .select()
      .single()

    if (insertError) throw new Error(insertError.message)

    // Audit log
    await supabase.from('audit_log').insert({
      merchant_id,
      action: 'CREATE_CASHBOOK_ENTRY',
      entity_type: 'cashbook_entry',
      entity_id: entry.id,
      new_values: { entry_date, card_terminal_total, cash_counted, cash_expected, cash_difference: cash_counted - cash_expected },
    })

    return NextResponse.json({ success: true, entry_id: entry.id })
  } catch (err) {
    console.error('Cashbook save error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Fehler' }, { status: 500 })
  }
}
