import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

    const updates = await req.json()
    const allowed = ['name', 'price', 'vat_rate', 'category', 'is_active', 'sort_order']
    const safeUpdates = Object.fromEntries(
      Object.entries(updates).filter(([k]) => allowed.includes(k))
    )

    // Verify ownership
    const { data: item } = await supabase
      .from('menu_items')
      .select('merchant_id')
      .eq('id', params.id)
      .single()
    if (!item) return NextResponse.json({ error: 'Nicht gefunden' }, { status: 404 })

    const { data: merchant } = await supabase
      .from('merchants')
      .select('id')
      .eq('id', item.merchant_id)
      .eq('user_id', user.id)
      .single()
    if (!merchant) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })

    const { error } = await supabase
      .from('menu_items')
      .update(safeUpdates)
      .eq('id', params.id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Fehler' }, { status: 500 })
  }
}
