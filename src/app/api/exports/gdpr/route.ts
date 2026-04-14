export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const merchant_id = searchParams.get('merchant_id')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

    // Verify ownership
    const { data: merchant } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', merchant_id)
      .eq('user_id', user.id)
      .single()
    if (!merchant) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })

    // Fetch all related data
    const [{ data: transactions }, { data: menuItems }, { data: cashbook }, { data: auditLog }] = await Promise.all([
      supabase.from('transactions').select('*, transaction_lines(*)').eq('merchant_id', merchant_id).order('transaction_number'),
      supabase.from('menu_items').select('*').eq('merchant_id', merchant_id),
      supabase.from('cashbook_entries').select('*').eq('merchant_id', merchant_id).order('entry_date'),
      supabase.from('audit_log').select('*').eq('merchant_id', merchant_id).order('created_at'),
    ])

    // Redact sensitive fields from merchant before export
    const merchantExport = { ...merchant }
    delete (merchantExport as Record<string, unknown>).stripe_customer_id
    delete (merchantExport as Record<string, unknown>).tse_certificate

    const exportData = {
      export_date: new Date().toISOString(),
      export_reason: 'DSGVO Art. 20 Datenportabilität',
      user: {
        id: user.id,
        email: user.email,
      },
      merchant: merchantExport,
      transactions: transactions || [],
      menu_items: menuItems || [],
      cashbook_entries: cashbook || [],
      audit_log: auditLog || [],
    }

    const json = JSON.stringify(exportData, null, 2)

    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="rapiq-dsgvo-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    })
  } catch (err) {
    console.error('GDPR export error:', err)
    return NextResponse.json({ error: 'Export fehlgeschlagen' }, { status: 500 })
  }
}
