export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { CalculatorClient } from '@/components/calculator/CalculatorClient'

export default async function CalculatorPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, button_names, default_vat_rates, tse_tss_id, tse_client_id, tse_serial_number')
    .eq('user_id', user!.id)
    .single()

  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*')
    .eq('merchant_id', merchant!.id)
    .eq('is_active', true)
    .order('sort_order')
    .limit(30)

  return (
    <CalculatorClient
      merchant={merchant!}
      menuItems={menuItems || []}
    />
  )
}
