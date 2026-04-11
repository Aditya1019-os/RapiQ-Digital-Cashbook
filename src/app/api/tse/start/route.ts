import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { startTransaction, FiskalyError } from '@/lib/fiskaly/client'

export async function POST(req: NextRequest) {
  try {
    const { merchant_id } = await req.json()
    if (!merchant_id) return NextResponse.json({ error: 'merchant_id fehlt' }, { status: 400 })

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

    const { data: merchant } = await supabase
      .from('merchants')
      .select('tse_tss_id, tse_client_id')
      .eq('id', merchant_id)
      .eq('user_id', user.id)
      .single()

    if (!merchant?.tse_tss_id || !merchant?.tse_client_id) {
      return NextResponse.json({ error: 'TSE nicht konfiguriert' }, { status: 400 })
    }

    const tx = await startTransaction(merchant.tse_tss_id, merchant.tse_client_id)
    return NextResponse.json({ tx_id: tx._id, start_time: tx.time_start })
  } catch (err) {
    if (err instanceof FiskalyError) {
      return NextResponse.json({ error: `TSE-Fehler: ${err.message}` }, { status: 502 })
    }
    console.error('TSE start error:', err)
    return NextResponse.json({ error: 'Interner Fehler' }, { status: 500 })
  }
}
