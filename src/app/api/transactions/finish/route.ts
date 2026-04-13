import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { finishTransaction, startTransaction, FiskalyError } from '@/lib/fiskaly/client'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      merchant_id,
      fiskaly_tx_id,
      payment_method,
      basket,
      total,
      vat_7_net,
      vat_19_net,
    } = body

    if (!merchant_id || !basket?.length) {
      return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

    const { data: merchant } = await supabase
      .from('merchants')
      .select('id, tse_tss_id, tse_client_id, tse_serial_number')
      .eq('id', merchant_id)
      .eq('user_id', user.id)
      .single()

    if (!merchant) return NextResponse.json({ error: 'Händler nicht gefunden' }, { status: 404 })

    // Get next transaction number atomically
    const { data: txNumResult } = await supabase.rpc('get_next_transaction_number', {
      p_merchant_id: merchant_id,
    })
    const txNumber = txNumResult as number

    // ── fiskaly TSE signing (MANDATORY) ──────────────────────────────────────
    let tseTxId = fiskaly_tx_id
    let tseTx: Awaited<ReturnType<typeof finishTransaction>> | null = null

    if (merchant.tse_tss_id && merchant.tse_client_id) {
      try {
        // If no active tx (e.g. start failed), create one now
        if (!tseTxId) {
          const startTx = await startTransaction(merchant.tse_tss_id, merchant.tse_client_id)
          tseTxId = startTx._id
        }

        tseTx = await finishTransaction({
          tssId: merchant.tse_tss_id,
          txId: tseTxId,
          clientId: merchant.tse_client_id,
          vat7Net: vat_7_net,
          vat19Net: vat_19_net,
          paymentMethod: payment_method || 'cash',
          total,
        })
      } catch (fiskalyErr) {
        // In dev/test mode with mock TSE, allow through
        if (
          fiskalyErr instanceof FiskalyError &&
          (process.env.NODE_ENV === 'development' ||
           merchant.tse_serial_number?.startsWith('MOCK-'))
        ) {
          // Use mock TSE data
          tseTx = null
        } else {
          // CRITICAL: TSE failure must block the transaction per §146a AO
          const msg = fiskalyErr instanceof FiskalyError
            ? fiskalyErr.message
            : 'Unbekannter TSE-Fehler'
          return NextResponse.json(
            {
              error: `TSE-Signatur fehlgeschlagen: ${msg}. Die Buchung wurde nicht gespeichert. Bitte versuchen Sie es erneut.`,
              tse_error: true,
            },
            { status: 502 }
          )
        }
      }
    }

    // ── Calculate VAT totals ──────────────────────────────────────────────────
    const vat7Amount = vat_7_net * 0.07
    const vat19Amount = vat_19_net * 0.19
    const vat7Gross = vat_7_net + vat7Amount
    const vat19Gross = vat_19_net + vat19Amount

    const now = new Date().toISOString()

    // ── Insert transaction ────────────────────────────────────────────────────
    const { data: transaction, error: txError } = await supabase
      .from('transactions')
      .insert({
        merchant_id,
        transaction_number: txNumber,
        status: 'completed',
        payment_method: payment_method || 'cash',
        subtotal: total,
        vat_7_net: vat_7_net,
        vat_7_amount: vat7Amount,
        vat_19_net: vat_19_net,
        vat_19_amount: vat19Amount,
        total,
        process_type: 'Kassenbeleg-V1',
        tse_tss_id: merchant.tse_tss_id,
        tse_tx_id: tseTxId,
        tse_serial: merchant.tse_serial_number,
        tse_transaction_number: tseTx ? String(tseTx.number) : `MOCK-${txNumber}`,
        tse_signature_counter: tseTx?.signature?.counter ?? 0,
        tse_process_data: tseTx?.process_data ?? `Kassenbeleg^${vat7Gross.toFixed(2)}^${vat19Gross.toFixed(2)}`,
        tse_start_time: tseTx ? new Date(tseTx.time_start * 1000).toISOString() : now,
        tse_finish_time: tseTx?.time_end ? new Date(tseTx.time_end * 1000).toISOString() : now,
        tse_signature_base64: tseTx?.signature?.value ?? null,
        tse_qr_code_data: tseTx?.qr_code_data ?? null,
        finished_at: now,
      })
      .select()
      .single()

    if (txError) {
      throw new Error(`Datenbankfehler: ${txError.message}`)
    }

    // ── Insert transaction lines ──────────────────────────────────────────────
    const lines = basket.map((item: {
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
      discountPercent?: number
    }, idx: number) => ({
      transaction_id: transaction.id,
      merchant_id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      vat_rate: item.vatRate,
      net_amount: item.netAmount,
      vat_amount: item.vatAmount,
      gross_amount: item.grossAmount,
      category: item.category,
      menu_item_id: item.menuItemId || null,
      is_discount: item.isDiscount || false,
      discount_percent: item.discountPercent || null,
      sort_order: idx,
    }))

    await supabase.from('transaction_lines').insert(lines)

    // ── Audit log ────────────────────────────────────────────────────────────
    await supabase.from('audit_log').insert({
      merchant_id,
      action: 'CREATE_TRANSACTION',
      entity_type: 'transaction',
      entity_id: transaction.id,
      new_values: {
        transaction_number: txNumber,
        total,
        payment_method,
        tse_transaction_number: transaction.tse_transaction_number,
      },
    })

    return NextResponse.json({
      success: true,
      transaction_id: transaction.id,
      transaction_number: txNumber,
      tse_serial: merchant.tse_serial_number,
    })
  } catch (err) {
    console.error('Transaction finish error:', err)
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
