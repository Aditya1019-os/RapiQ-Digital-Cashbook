import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const ALLOWED_FIELDS = [
  'business_name', 'address', 'city', 'postal_code',
  'button_names', 'default_vat_rates', 'notification_prefs', 'logo_url',
]

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { merchant_id, ...updates } = body

    if (!merchant_id) return NextResponse.json({ error: 'merchant_id fehlt' }, { status: 400 })

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

    const safeUpdates = Object.fromEntries(
      Object.entries(updates).filter(([k]) => ALLOWED_FIELDS.includes(k))
    )

    const { error } = await supabase
      .from('merchants')
      .update(safeUpdates)
      .eq('id', merchant_id)
      .eq('user_id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Fehler' }, { status: 500 })
  }
}
