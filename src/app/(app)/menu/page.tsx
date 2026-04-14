export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { MenuClient } from '@/components/menu/MenuClient'

export default async function MenuPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, subscription_plan')
    .eq('user_id', user!.id)
    .single()

  const { data: menuItems } = await supabase
    .from('menu_items')
    .select('*')
    .eq('merchant_id', merchant!.id)
    .order('sort_order')

  return <MenuClient merchant={merchant!} menuItems={menuItems || []} />
}
