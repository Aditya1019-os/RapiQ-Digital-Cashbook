import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { merchant_id, items } = await req.json()
    if (!merchant_id || !items?.length) {
      return NextResponse.json({ error: 'Pflichtfelder fehlen' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

    // Verify merchant belongs to user
    const { data: merchant } = await supabase
      .from('merchants')
      .select('id')
      .eq('id', merchant_id)
      .eq('user_id', user.id)
      .single()
    if (!merchant) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 403 })

    // Get current max sort_order
    const { data: existing } = await supabase
      .from('menu_items')
      .select('sort_order')
      .eq('merchant_id', merchant_id)
      .order('sort_order', { ascending: false })
      .limit(1)
    const maxOrder = existing?.[0]?.sort_order ?? -1

    const rows = items.map((item: { name: string; price: number; suggested_vat_rate: number; category: string }, i: number) => ({
      merchant_id,
      name: item.name,
      price: item.price,
      vat_rate: item.suggested_vat_rate || 19,
      category: item.category || 'retail',
      is_active: true,
      sort_order: maxOrder + 1 + i,
    }))

    const { error } = await supabase.from('menu_items').insert(rows)
    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true, count: rows.length })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Fehler' }, { status: 500 })
  }
}
