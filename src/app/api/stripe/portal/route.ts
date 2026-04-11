import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2024-06-20' })

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.redirect(new URL('/login', req.url))

    const { data: merchant } = await supabase
      .from('merchants')
      .select('stripe_customer_id, business_name')
      .eq('user_id', user.id)
      .single()

    if (!merchant) return NextResponse.redirect(new URL('/dashboard', req.url))

    let customerId = merchant.stripe_customer_id

    if (!customerId) {
      // Create Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        name: merchant.business_name,
        metadata: { user_id: user.id },
      })
      customerId = customer.id
      await supabase.from('merchants').update({ stripe_customer_id: customerId }).eq('user_id', user.id)
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings`,
    })

    return NextResponse.redirect(session.url)
  } catch (err) {
    console.error('Stripe portal error:', err)
    return NextResponse.redirect(new URL('/settings?error=billing', req.url))
  }
}
