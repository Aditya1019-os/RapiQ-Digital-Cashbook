export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const merchant_id = searchParams.get('merchant_id')

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Nicht autorisiert' }, { status: 401 })

    const { data: merchant } = await supabase
      .from('merchants')
      .select('*')
      .eq('id', merchant_id)
      .eq('user_id', user.id)
      .single()

    if (!merchant) return NextResponse.json({ error: 'Händler nicht gefunden' }, { status: 404 })

    const firstUseDate = merchant.first_use_date || new Date().toISOString().split('T')[0]
    const softwareVersion = '1.0.0'

    // Generate MeinELSTER XML per §146a AO
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Nutzdatenblock>
  <NutzdatenHeader version="11">
    <NutzdatenTicket>0001</NutzdatenTicket>
    <Empfaenger id="F">
      <Name>${escapeXml(merchant.business_name)}</Name>
    </Empfaenger>
    <Hersteller>
      <ProduktName>RapiQ</ProduktName>
      <ProduktVersion>${softwareVersion}</ProduktVersion>
    </Hersteller>
  </NutzdatenHeader>
  <Nutzdaten>
    <Anmeldung>
      <Steuerpflichtiger>
        <Name>${escapeXml(merchant.business_name)}</Name>
        <Adresse>
          <Strasse>${escapeXml(merchant.address)}</Strasse>
          <PLZ>${escapeXml(merchant.postal_code)}</PLZ>
          <Ort>${escapeXml(merchant.city)}</Ort>
        </Adresse>
        <Steuernummer>${escapeXml(merchant.steuernummer)}</Steuernummer>
      </Steuerpflichtiger>
      <Kassensystem>
        <Hersteller>RapiQ GmbH</Hersteller>
        <Bezeichnung>RapiQ Cloud POS</Bezeichnung>
        <Version>${softwareVersion}</Version>
        <Seriennummer>${escapeXml(merchant.tse_serial_number || 'NICHT-KONFIGURIERT')}</Seriennummer>
        <Softwarekategorie>kassensoftware</Softwarekategorie>
        <Zertifizierungsland>DE</Zertifizierungsland>
        <TSE-Seriennummer>${escapeXml(merchant.tse_serial_number || 'NICHT-KONFIGURIERT')}</TSE-Seriennummer>
        <ErsterEinsatz>${firstUseDate}</ErsterEinsatz>
      </Kassensystem>
      <Angaben>
        <Rechtsnorm>§146a AO</Rechtsnorm>
        <Inbetriebnahmedatum>${firstUseDate}</Inbetriebnahmedatum>
        <SoftwareName>RapiQ</SoftwareName>
        <SoftwareVersion>${softwareVersion}</SoftwareVersion>
      </Angaben>
    </Anmeldung>
  </Nutzdaten>
</Nutzdatenblock>`

    return new NextResponse(xml, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="elster-kassenmitteilung-${merchant_id?.slice(0, 8)}.xml"`,
      },
    })
  } catch (err) {
    console.error('ELSTER export error:', err)
    return NextResponse.json({ error: 'Export fehlgeschlagen' }, { status: 500 })
  }
}

function escapeXml(str: string | null | undefined): string {
  if (!str) return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
