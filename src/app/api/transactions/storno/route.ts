import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { finishTransaction, startTransaction, FiskalyError } from '@/lib/fiskaly/client'

export async function POST(req: NextRequest) {
  try {
    const { transaction_id, merchant_id } = await req.json()

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

    // Fetch original transaction
    const { data: originalTx } = await supabase
      .from('transactions')
      .select('*, transaction_lines(*)')
      .eq('id', transaction_id)
      .eq('merchant_id', merchant_id)
      .single()

    if (!originalTx) return NextResponse.json({ error: 'Buchung nicht gefunden' }, { status: 404 })
    if (originalTx.status !== 'completed') {
      return NextResponse.json({ error: 'Nur abgeschlossene Buchungen können storniert werden' }, { status: 400 })
    }

    // Verify merchant ownership
    const { data: merchant } = await supabase
      .from('merchants')
      .select('id, tse_tss_id, tse_client_id, tse_serial_number')
      .eq('id', merchant_id)
      .eq('user_id', user.id)
      .single()
    if (!merchant) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })

    // Get next transaction number
    const { data: txNumResult } = await supabase.rpc('get_next_transaction_number', { p_merchant_id: merchant_id })
    const txNumber = txNumResult as number

    const now = new Date().toISOString()

    // TSE signing for Storno
    let tseTx = null
    let tseTxId: string | null = null

    if (merchant.tse_tss_id && merchant.tse_client_id) {
      try {
        const startTx = await startTransaction(merchant.tse_tss_id, merchant.tse_client_id)
        tseTxId = startTx._id

        tseTx = await finishTransaction({
          tssId: merchant.tse_tss_id,
          txId: tseTxId,
          clientId: merchant.tse_client_id,
          vat7Net: -(originalTx.vat_7_net || 0),
          vat19Net: -(originalTx.vat_19_net || 0),
          paymentMethod: originalTx.payment_method as 'cash' | 'card' || 'cash',
          total: -originalTx.total,
          processType: 'CANCELLATION',
        })
      } catch (err) {
        if (!(err instanceof FiskalyError) || !merchant.tse_serial_number?.startsWith('MOCK-')) {
          return NextResponse.json({
            error: `TSE-Signatur für Storno fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`,
          }, { status: 502 })
        }
      }
    }

    // Create storno transaction (negative amounts)
    const { data: storno, error: stornoError } = await supabase
      .from('transactions')
      .insert({
        merchant_id,
        transaction_number: txNumber,
        status: 'storno',
        payment_method: originalTx.payment_method,
        subtotal: -originalTx.subtotal,
        vat_7_net: -(originalTx.vat_7_net || 0),
        vat_7_amount: -(originalTx.vat_7_amount || 0),
        vat_19_net: -(originalTx.vat_19_net || 0),
        vat_19_amount: -(originalTx.vat_19_amount || 0),
        total: -originalTx.total,
        process_type: 'Kassenbeleg-V1-Storno',
        tse_tss_id: merchant.tse_tss_id,
        tse_tx_id: tseTxId,
        tse_serial: merchant.tse_serial_number,
        tse_transaction_number: tseTx ? String(tseTx.number) : `STORNO-MOCK-${txNumber}`,
        tse_signature_counter: tseTx?.signature?.counter ?? 0,
        tse_process_data: `Kassenbeleg-V1-Storno^${originalTx.transaction_number}`,
        tse_start_time: tseTx ? new Date(tseTx.time_start * 1000).toISOString() : now,
        tse_finish_time: tseTx?.time_end ? new Date(tseTx.time_end * 1000).toISOString() : now,
        tse_signature_base64: tseTx?.signature?.value ?? null,
        storno_of: originalTx.id,
        finished_at: now,
      })
      .select()
      .single()

    if (stornoError) throw new Error(stornoError.message)

    // Create storno line items (negative)
    const stornoLines = (originalTx as { transaction_lines?: { description: string; quantity: number; unit_price: number; vat_rate: number; net_amount: number; vat_amount: number; gross_amount: number; category: string; sort_order: number }[] }).transaction_lines?.map((line: { description: string; quantity: number; unit_price: number; vat_rate: number; net_amount: number; vat_amount: number; gross_amount: number; category: string; sort_order: number }) => ({
      transaction_id: storno.id,
      merchant_id,
      description: `STORNO: ${line.description}`,
      quantity: line.quantity,
      unit_price: -line.unit_price,
      vat_rate: line.vat_rate,
      net_amount: -line.net_amount,
      vat_amount: -line.vat_amount,
      gross_amount: -line.gross_amount,
      category: line.category,
      sort_order: line.sort_order,
    }))

    if (stornoLines?.length) {
      await supabase.from('transaction_lines').insert(stornoLines)
    }

    // Mark original as storno-cancelled (soft reference only)
    await supabase.from('audit_log').insert({
      merchant_id,
      action: 'STORNO_TRANSACTION',
      entity_type: 'transaction',
      entity_id: storno.id,
      new_values: {
        storno_transaction_number: txNumber,
        original_transaction_number: originalTx.transaction_number,
        original_total: originalTx.total,
        tse_transaction_number: storno.tse_transaction_number,
      },
    })

    return NextResponse.json({ success: true, storno_id: storno.id, storno_number: txNumber })
  } catch (err) {
    console.error('Storno error:', err)
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Storno fehlgeschlagen' }, { status: 500 })
  }
}
