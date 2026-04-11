import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function ImpressumPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <nav className="border-b border-gray-100 dark:border-gray-800 px-4 h-14 flex items-center">
        <Link href="/" className="flex items-center gap-2 font-bold text-indigo-600">
          <Zap className="h-5 w-5" />
          RapiQ
        </Link>
      </nav>
      <main className="max-w-2xl mx-auto px-4 py-12 prose dark:prose-invert">
        <h1>Impressum</h1>
        <p>Angaben gemäß § 5 TMG</p>
        <h2>Betreiber</h2>
        <p>
          RapiQ GmbH<br />
          Musterstraße 1<br />
          80331 München<br />
          Deutschland
        </p>
        <h2>Kontakt</h2>
        <p>
          E-Mail: <a href="mailto:hallo@rapiq.net">hallo@rapiq.net</a><br />
          Support: <a href="mailto:support@rapiq.net">support@rapiq.net</a>
        </p>
        <h2>Handelsregister</h2>
        <p>
          Registergericht: Amtsgericht München<br />
          Registernummer: HRB XXXXXX
        </p>
        <h2>Umsatzsteuer-Identifikationsnummer</h2>
        <p>DE XXXXXXXXX (gemäß § 27a UStG)</p>
        <h2>Verantwortlich für den Inhalt (§ 55 Abs. 2 RStV)</h2>
        <p>Geschäftsführung RapiQ GmbH, Musterstraße 1, 80331 München</p>
        <h2>Streitschlichtung</h2>
        <p>
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
          <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
            https://ec.europa.eu/consumers/odr
          </a>.
          Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle teilzunehmen.
        </p>
        <h2>Haftungsausschluss</h2>
        <p>
          RapiQ ist eine Softwarelösung und ersetzt keine steuerliche Beratung. Die Korrektheit und Vollständigkeit der eingegebenen Daten liegt in der Verantwortung des Nutzers. Für die ordnungsgemäße Nutzung gemäß den steuerlichen Vorschriften ist der Händler selbst verantwortlich.
        </p>
      </main>
    </div>
  )
}
