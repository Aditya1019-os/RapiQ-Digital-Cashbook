import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function AgbPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      <nav className="border-b border-gray-100 dark:border-gray-800 px-4 h-14 flex items-center">
        <Link href="/" className="flex items-center gap-2 font-bold text-indigo-600">
          <Zap className="h-5 w-5" />
          RapiQ
        </Link>
      </nav>
      <main className="max-w-2xl mx-auto px-4 py-12 prose dark:prose-invert">
        <h1>Allgemeine Geschäftsbedingungen (AGB)</h1>
        <p>Stand: April 2026</p>

        <h2>§ 1 Geltungsbereich</h2>
        <p>Diese AGB gelten für alle Verträge zwischen RapiQ GmbH und gewerblichen Nutzern (Händlern) über die Nutzung der RapiQ-Kassensoftware.</p>

        <h2>§ 2 Vertragsgegenstand</h2>
        <p>RapiQ stellt eine cloudbasierte Kassensoftware bereit, die §146a AO, KassenSichV und GoBD-konform ist. Die Software umfasst Kassenfunktionen, Kassenbuch, Dashboard, und Exportfunktionen.</p>

        <h2>§ 3 Testzeitraum und Abonnement</h2>
        <p>Der Testzeitraum beträgt 14 Tage ohne Kreditkarte. Nach Ablauf des Testzeitraums wird das Abonnement kostenpflichtig. Die Abrechnung erfolgt monatlich über Stripe. Eine Kündigung ist jederzeit möglich, Daten bleiben 90 Tage nach Kündigung zugänglich.</p>

        <h2>§ 4 Nutzerpflichten und GoBD-Compliance</h2>
        <p>
          Der Händler ist dafür verantwortlich, seine Kasse gemäß §146a AO beim Finanzamt über MeinELSTER anzumelden. RapiQ stellt das erforderliche XML bereit, kann jedoch nicht für unterlassene Anmeldungen haften. Der Händler bestätigt, dass alle eingegebenen Daten korrekt und vollständig sind.
        </p>

        <h2>§ 5 Datensicherung und Aufbewahrung</h2>
        <p>RapiQ sichert Finanzdaten für mindestens 10 Jahre gemäß §147 AO und GoBD. Finanzdaten werden auch nach Kontoauflösung anonymisiert aufbewahrt.</p>

        <h2>§ 6 Haftungsbeschränkung</h2>
        <p>
          RapiQ haftet nicht für Schäden, die durch fehlerhafte Dateneingabe des Nutzers, fehlerhafte TSE-Integration durch dritte Anbieter (fiskaly), oder höhere Gewalt entstehen. Die Haftung ist auf den jeweils gezahlten Monatsbeitrag begrenzt.
        </p>

        <h2>§ 7 TSE und fiskaly</h2>
        <p>
          Die technische Sicherheitseinrichtung (TSE) wird durch fiskaly GmbH bereitgestellt. RapiQ vermittelt den Zugang zur fiskaly Cloud TSE. Ausfälle der TSE, die auf fiskaly zurückzuführen sind, begründen keinen Anspruch gegen RapiQ.
        </p>

        <h2>§ 8 Änderungen der AGB</h2>
        <p>RapiQ behält sich vor, diese AGB mit 30-tägiger Frist zu ändern. Nutzer werden per E-Mail informiert. Die weitere Nutzung nach Fristablauf gilt als Zustimmung.</p>

        <h2>§ 9 Gerichtsstand und anwendbares Recht</h2>
        <p>Es gilt deutsches Recht unter Ausschluss des UN-Kaufrechts. Gerichtsstand ist München.</p>

        <h2>§ 10 Salvatorische Klausel</h2>
        <p>Sollten einzelne Bestimmungen dieser AGB unwirksam sein, bleibt die Gültigkeit der übrigen Bestimmungen unberührt.</p>

        <p className="text-sm text-gray-500">RapiQ GmbH · Musterstraße 1 · 80331 München · hallo@rapiq.net</p>
      </main>
    </div>
  )
}
