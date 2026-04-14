export const dynamic = 'force-dynamic'
import { createClient } from '@/lib/supabase/server'
import { ExportsClient } from '@/components/exports/ExportsClient'

export default async function ExportsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: merchant } = await supabase
    .from('merchants')
    .select('*')
    .eq('user_id', user!.id)
    .single()

  return <ExportsClient merchant={merchant!} />
}
