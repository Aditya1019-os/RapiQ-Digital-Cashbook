export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from '@/components/settings/SettingsClient'

export default async function SettingsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: merchant } = await supabase
    .from('merchants')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  return <SettingsClient merchant={merchant!} userEmail={user!.email || ''} />
}
