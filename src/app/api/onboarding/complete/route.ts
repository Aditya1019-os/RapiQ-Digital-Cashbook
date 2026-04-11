import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createTss, createClient as createFiskalyClient, FiskalyError } from '@/lib/fiskaly/client'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      user_id,
      business_name,
      category,
      address,
      city,
      postal_code,
      legal_structure,
      steuernummer,
      ust_id_nr,
      vat_profile,
    } = body

    if (!user_id || !business_name || !steuernummer) {
      return NextResponse.json({ error: 'Pflichtfelder fehlen.' }, { status: 400 })
    }

    const supabase = createServiceClient()

    // Get user email for welcome email
    const { data: userData } = await supabase.auth.admin.getUserById(user_id)
    const userEmail = userData?.user?.email

    // Create fiskaly TSS (Technical Security System)
    let tssId: string | null = null
    let tsserial: string | null = null
    let tseClientId: string | null = null

    try {
      const tss = await createTss(user_id)
      tssId = tss._id
      tsserial = tss.serial_number

      const client = await createFiskalyClient(tss._id, user_id)
      tseClientId = client._id
    } catch (fiskalyErr) {
      if (fiskalyErr instanceof FiskalyError) {
        // In development/test environment, use mock values
        if (process.env.NODE_ENV === 'development' || !process.env.FISKALY_API_KEY?.startsWith('sk_')) {
          tssId = `mock-tss-${user_id.substring(0, 8)}`
          tsserial = `MOCK-${Date.now()}`
          tseClientId = `mock-client-${user_id.substring(0, 8)}`
        } else {
          throw new Error(`TSE-Registrierung fehlgeschlagen: ${fiskalyErr.message}`)
        }
      } else {
        throw fiskalyErr
      }
    }

    // Create merchant record
    const { data: merchant, error: merchantError } = await supabase
      .from('merchants')
      .upsert({
        user_id,
        business_name,
        category,
        address,
        city,
        postal_code,
        legal_structure,
        steuernummer,
        ust_id_nr: ust_id_nr || null,
        vat_profile,
        tse_tss_id: tssId,
        tse_client_id: tseClientId,
        tse_serial_number: tsserial,
        onboarding_completed: true,
        first_use_date: new Date().toISOString().split('T')[0],
      })
      .select()
      .single()

    if (merchantError) {
      throw new Error(`Datenbankfehler: ${merchantError.message}`)
    }

    // Initialize transaction counter
    await supabase.from('transaction_counters').upsert({
      merchant_id: merchant.id,
      last_number: 0,
    })

    // Send welcome email
    if (userEmail) {
      await resend.emails.send({
        from: 'RapiQ <willkommen@rapiq.net>',
        to: userEmail,
        subject: 'Willkommen bei RapiQ — Ihre Kasse ist eingerichtet!',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
            <h1 style="color: #4f46e5;">Willkommen bei RapiQ, ${business_name}!</h1>
            <p>Ihre GoBD-konforme Kasse ist jetzt eingerichtet und bereit.</p>

            <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 16px; margin: 24px 0;">
              <h3 style="margin: 0 0 12px; color: #166534;">Ihre TSE-Informationen (wichtig aufbewahren!)</h3>
              <p style="margin: 4px 0; font-family: monospace;"><strong>TSE-Seriennummer:</strong> ${tsserial}</p>
              <p style="margin: 4px 0; font-family: monospace;"><strong>TSS-ID:</strong> ${tssId}</p>
            </div>

            <h3>Nächste Schritte:</h3>
            <ol>
              <li>Melden Sie Ihre Kasse beim Finanzamt an: <strong>Exports → MeinELSTER XML</strong> herunterladen und über MeinELSTER hochladen</li>
              <li>Laden Sie Ihr Menü mit dem Foto-Scanner hoch: <strong>Menü → Menü scannen</strong></li>
              <li>Machen Sie Ihre erste Buchung in der Kasse</li>
            </ol>

            <p>Bei Fragen: <a href="mailto:support@rapiq.net">support@rapiq.net</a></p>
            <p style="font-size: 12px; color: #9ca3af; margin-top: 32px;">RapiQ — GoBD-konforme Kasse für kleine Händler</p>
          </div>
        `,
      }).catch(console.error) // Non-blocking
    }

    return NextResponse.json({ success: true, merchant_id: merchant.id, tse_serial: tsserial })
  } catch (err: unknown) {
    console.error('Onboarding error:', err)
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
