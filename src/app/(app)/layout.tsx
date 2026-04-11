import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/layout/AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check onboarding
  const { data: merchant } = await supabase
    .from('merchants')
    .select('id, onboarding_completed, business_name')
    .eq('user_id', user.id)
    .single()

  if (!merchant || !merchant.onboarding_completed) {
    redirect('/onboarding')
  }

  return <AppShell merchantName={merchant.business_name}>{children}</AppShell>
}
