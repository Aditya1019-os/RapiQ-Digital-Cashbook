import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { ReceiptDocument } from '@/lib/receipt/generatePdf'
import type { TransactionWithLines } from '@/types/database'
import React from 'react'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createServiceClient()

    const { data: tx } = await supabase
      .from('transactions')
      .select(`
        *,
        transaction_lines(*),
        merchants(business_name, address, city, postal_code, steuernummer, ust_id_nr, logo_url)
      `)
      .eq('id', params.id)
      .single() as { data: TransactionWithLines | null }

    if (!tx) return NextResponse.json({ error: 'Beleg nicht gefunden' }, { status: 404 })

    const receiptUrl = `${process.env.NEXT_PUBLIC_APP_URL}/receipts/${tx.id}`

    const element = React.createElement(ReceiptDocument, { transaction: tx, receiptUrl }) as React.ReactElement<{ transaction: TransactionWithLines; receiptUrl: string }>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const buffer = await renderToBuffer(element as any)
    const uint8 = new Uint8Array(buffer)

    return new NextResponse(uint8, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="beleg-${String(tx.transaction_number).padStart(6, '0')}.pdf"`,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    console.error('PDF generation error:', err)
    return NextResponse.json({ error: 'PDF-Generierung fehlgeschlagen' }, { status: 500 })
  }
}
