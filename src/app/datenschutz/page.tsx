import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function DatenschutzPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <nav className="border-b border-gray-100 dark:border-gray-800 px-4 h-14 flex items-center">
        <Link href="/" className="flex items-center gap-2 font-bold text-indigo-600">
          <Zap className="h-5 w-5" />
          RapiQ
        </Link>
      </nav>
      <main className="max-w-2xl mx-auto px-4 py-12 prose dark:prose-invert">
        <h1>Datenschutzerklärung</h1>
        <p>Stand: April 2026 | Gemäß DSGVO Art. 13</p>

        <h2>1. Verantwortlicher</h2>
        <p>RapiQ GmbH, Musterstraße 1, 80331 München, E-Mail: datenschutz@rapiq.net</p>

        <h2>2. Erhobene Daten und Zweck</h2>
        <p>Wir erheben folgende personenbezogene Daten:</p>
        <ul>
          <li><strong>Kontodaten:</strong> E-Mail-Adresse zur Authentifizierung (Supabase Auth)</li>
          <li><strong>Unternehmensdaten:</strong> Firmenname, Adresse, Steuernummer — für GoBD-konforme Belege</li>
          <li><strong>Transaktionsdaten:</strong> Buchungsbeträge, Datum, Zahlungsart — gesetzlich vorgeschrieben (GoBD, §146 AO)</li>
          <li><strong>TSE-Daten:</strong> Signaturen, Zeitstempel — gesetzlich vorgeschrieben (§146a AO, KassenSichV)</li>
        </ul>

        <h2>3. Rechtsgrundlage</h2>
        <ul>
          <li>Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung)</li>
          <li>Art. 6 Abs. 1 lit. c DSGVO (rechtliche Verpflichtung — GoBD, AO)</li>
          <li>Art. 6 Abs. 1 lit. f DSGVO (berechtigte Interessen)</li>
        </ul>

        <h2>4. Speicherdauer</h2>
        <p>
          Finanzdaten werden gemäß §147 AO und GoBD mindestens 10 Jahre aufbewahrt, auch nach Kontoauflösung (anonymisiert). Kontodaten werden nach Löschung des Kontos innerhalb von 30 Tagen gelöscht.
        </p>

        <h2>5. Empfänger der Daten</h2>
        <ul>
          <li><strong>Supabase Inc.</strong> (Datenbankhosting, EU-Region Frankfurt) — Auftragsverarbeiter</li>
          <li><strong>fiskaly GmbH</strong> (Cloud TSE) — gesetzlich erforderlich</li>
          <li><strong>Resend Inc.</strong> (transaktionale E-Mails) — Auftragsverarbeiter</li>
          <li><strong>Stripe Inc.</strong> (Zahlungsabwicklung) — Auftragsverarbeiter</li>
          <li><strong>Vercel Inc.</strong> (Hosting, EU-Region) — Auftragsverarbeiter</li>
        </ul>
        <p>Alle Auftragsverarbeiter sind durch Auftragsverarbeitungsverträge (AVV) gemäß Art. 28 DSGVO gebunden.</p>

        <h2>6. Ihre Rechte (Art. 15–21 DSGVO)</h2>
        <ul>
          <li><strong>Auskunft (Art. 15):</strong> Sie können jederzeit Auskunft über Ihre Daten verlangen.</li>
          <li><strong>Berichtigung (Art. 16):</strong> Unrichtige Daten werden auf Anfrage berichtigt.</li>
          <li><strong>Löschung (Art. 17):</strong> Löschung auf Anfrage, soweit gesetzliche Aufbewahrungspflichten nicht entgegenstehen.</li>
          <li><strong>Datenportabilität (Art. 20):</strong> Export Ihrer Daten über Einstellungen → Daten exportieren.</li>
          <li><strong>Widerspruch (Art. 21):</strong> Widerspruch gegen Verarbeitung aus berechtigten Interessen möglich.</li>
        </ul>

        <h2>7. Hinweis zu Steuernummer</h2>
        <p>
          Ihre Steuernummer wird ausschließlich zur Erstellung GoBD-konformer Belege und der MeinELSTER-Anmeldung verwendet. Sie wird niemals in Logs gespeichert oder an nicht autorisierte Dritte weitergegeben.
        </p>

        <h2>8. Cookies</h2>
        <p>
          RapiQ verwendet ausschließlich technisch notwendige Cookies (Session-Cookies für die Authentifizierung). Es werden keine Tracking-Cookies oder Analyse-Tools eingesetzt ohne Ihre ausdrückliche Einwilligung.
        </p>

        <h2>9. Kontakt Datenschutz</h2>
        <p>
          Bei Fragen zum Datenschutz: <a href="mailto:datenschutz@rapiq.net">datenschutz@rapiq.net</a><br />
          Aufsichtsbehörde: Bayerisches Landesamt für Datenschutzaufsicht (BayLDA)
        </p>

        <hr />
        <h2>Privacy Policy (English Summary)</h2>
        <p>
          RapiQ collects business and transaction data required by German tax law (GoBD, §146a AO). Data is hosted in the EU (Frankfurt). We use Supabase, fiskaly, Resend, Stripe, and Vercel as processors under GDPR Art. 28 agreements. Financial records are retained for 10 years as required by law. You have the right to access, rectify, delete, and export your data. Contact: datenschutz@rapiq.net
        </p>
      </main>
    </div>
  )
}
