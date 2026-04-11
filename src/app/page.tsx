import Link from 'next/link'
import { Zap, Shield, Calculator, FileText, Camera, TrendingUp, Check, ChevronRight, Star } from 'lucide-react'

const FEATURES = [
  {
    icon: Calculator,
    title: 'Steuer-konforme Kasse',
    desc: 'Tipp Betrag, wähle Kategorie — fertig. Jede Buchung sofort TSE-signiert.',
    color: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400',
  },
  {
    icon: Camera,
    title: 'Menü per Foto erfassen',
    desc: 'Ein Foto Ihrer Speisekarte — KI erkennt alle Artikel mit Preisen und MwSt. automatisch.',
    color: 'bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400',
  },
  {
    icon: Shield,
    title: 'fiskaly Cloud TSE',
    desc: '§146a AO konform. Jede Buchung wird kryptografisch signiert. Kein Papierbelegdrucker nötig.',
    color: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
  },
  {
    icon: FileText,
    title: 'MeinELSTER XML in 1 Klick',
    desc: 'Kassenmeldung beim Finanzamt? Einmal runterladen, hochladen — erledigt.',
    color: 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  },
  {
    icon: TrendingUp,
    title: 'Dashboard & Heatmap',
    desc: 'Umsatz in Echtzeit. Wochenchart, Monatsvergleich, Tagesheatmap auf einen Blick.',
    color: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
  },
  {
    icon: FileText,
    title: 'DSFinV-K & DATEV Export',
    desc: 'Steuerberater-ready. ZIP für Betriebsprüfung, DATEV-CSV für Ihren Buchhalter.',
    color: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  },
]

const PLANS = [
  {
    name: 'Starter',
    price: '19,90',
    desc: 'Für Solo-Händler',
    features: [
      'Tax-Aware Calculator (TSE-signiert)',
      'Digitales Kassenbuch',
      'GoBD-konforme Belege',
      'Revenue Dashboard',
      'DSFinV-K Export',
      'MeinELSTER XML',
      '14 Tage kostenlos testen',
    ],
    cta: 'Starter starten',
    highlighted: false,
  },
  {
    name: 'Growth',
    price: '29,90',
    desc: 'Für wachsende Betriebe',
    features: [
      'Alles in Starter',
      'Menü-Foto-Scanner (GPT-4o)',
      'DATEV Buchungsstapel Export',
      'Eigene Button-Namen',
      'Priority Support',
      '14 Tage kostenlos testen',
    ],
    cta: 'Growth starten',
    highlighted: true,
  },
]

const TESTIMONIALS = [
  { name: 'Mehmet A.', role: 'Inhaber, Café Sedef, München', text: 'Endlich eine Kasse die ich verstehe. Der Foto-Scanner hat meine 42 Artikel in 30 Sekunden erfasst.' },
  { name: 'Ingrid S.', role: 'Bäckermeisterin, Hamburg', text: 'Das MeinELSTER XML hat mir meinen Steuerberater für einen Nachmittag gespart. Genial einfach.' },
  { name: 'Kofi M.', role: 'Imbiss-Betreiber, Berlin', text: 'Im Frühstücksrush tippe ich einfach den Betrag und drücke Backwaren. Schneller geht\'s nicht.' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-gray-100 dark:border-gray-800 bg-white/90 dark:bg-gray-950/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-indigo-600">
            <Zap className="h-6 w-6" />
            RapiQ
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <a href="#features">Funktionen</a>
            <a href="#preise">Preise</a>
            <Link href="/impressum">Impressum</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/login" className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-indigo-600 transition px-3 py-2">
              Anmelden
            </Link>
            <Link href="/signup" className="text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl transition">
              Kostenlos testen
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <Shield className="h-3.5 w-3.5" />
          §146a AO · fiskaly Cloud TSE · GoBD konform
        </div>
        <h1 className="text-4xl md:text-6xl font-black text-gray-900 dark:text-white mb-6 leading-tight">
          Die Kasse für<br />
          <span className="text-indigo-600">kleine Händler</span><br />
          die wirklich funktioniert
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
          RapiQ ist ein hardware-freies, GoBD-konformes digitales Kassensystem für Cafés, Bäckereien, Restaurants, Friseursalons und Einzelhandel. Komplett gesetzeskonform. Ohne Papierdrucker.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-2xl text-lg transition"
          >
            14 Tage kostenlos testen
            <ChevronRight className="h-5 w-5" />
          </Link>
          <a
            href="#preise"
            className="flex items-center justify-center gap-2 border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold px-8 py-4 rounded-2xl text-lg hover:bg-gray-50 dark:hover:bg-gray-900 transition"
          >
            Preise ansehen
          </a>
        </div>
        <p className="mt-4 text-sm text-gray-400">Keine Kreditkarte. Keine Hardware. Sofort startklar.</p>
      </section>

      {/* Social proof */}
      <section className="bg-gray-50 dark:bg-gray-900 py-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { value: '< 2 Sek.', label: 'Buchung abschließen' },
              { value: '§146a AO', label: 'Gesetzeskonform' },
              { value: '100%', label: 'GoBD-konform' },
              { value: '14 Tage', label: 'Kostenlos testen' },
            ].map(stat => (
              <div key={stat.label}>
                <p className="text-3xl font-black text-indigo-600">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-5xl mx-auto px-4 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black mb-4">Alles was Sie brauchen</h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-xl mx-auto">
            Vom ersten Beleg bis zum Steuerberater-Export — RapiQ deckt alles ab.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          {FEATURES.map(f => (
            <div key={f.title} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 hover:shadow-lg transition">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${f.color}`}>
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Legal compliance highlight */}
      <section className="bg-indigo-600 py-16">
        <div className="max-w-4xl mx-auto px-4 text-center text-white">
          <h2 className="text-3xl font-black mb-4">Das Finanzamt kommt nie überraschend</h2>
          <p className="text-indigo-200 text-lg mb-8 max-w-2xl mx-auto">
            RapiQ erstellt automatisch alle gesetzlich vorgeschriebenen Dokumente. Sie müssen sich um keine Paragraphen kümmern.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { title: 'MeinELSTER XML', desc: 'Kassenanmeldung §146a AO in 1 Klick herunterladen und hochladen' },
              { title: 'DSFinV-K v2.3', desc: 'Vollständiges Exportpaket für Betriebsprüfungen' },
              { title: 'DATEV Export', desc: 'Buchungsstapel direkt für Ihren Steuerberater' },
            ].map(item => (
              <div key={item.title} className="bg-white/10 rounded-2xl p-5 text-left">
                <div className="flex items-center gap-2 mb-2">
                  <Check className="h-4 w-4 text-green-300" />
                  <span className="font-bold">{item.title}</span>
                </div>
                <p className="text-indigo-200 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-black text-center mb-10">Was Händler sagen</h2>
        <div className="grid md:grid-cols-3 gap-5">
          {TESTIMONIALS.map(t => (
            <div key={t.name} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
              <div className="flex mb-3">
                {[1,2,3,4,5].map(s => <Star key={s} className="h-4 w-4 text-amber-400 fill-amber-400" />)}
              </div>
              <p className="text-gray-700 dark:text-gray-300 text-sm mb-4 italic">&quot;{t.text}&quot;</p>
              <div>
                <p className="font-semibold text-sm">{t.name}</p>
                <p className="text-xs text-gray-500">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="preise" className="bg-gray-50 dark:bg-gray-900 py-20">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-black mb-4">Einfache Preise</h2>
            <p className="text-gray-600 dark:text-gray-400">14 Tage kostenlos. Danach ab €19,90/Monat. Jederzeit kündbar.</p>
          </div>
          <div className="grid md:grid-cols-2 gap-5 max-w-2xl mx-auto">
            {PLANS.map(plan => (
              <div key={plan.name} className={`rounded-2xl p-6 ${plan.highlighted ? 'bg-indigo-600 text-white ring-4 ring-indigo-600 ring-offset-2' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'}`}>
                <p className="font-bold text-lg">{plan.name}</p>
                <p className={`text-sm mb-4 ${plan.highlighted ? 'text-indigo-200' : 'text-gray-500'}`}>{plan.desc}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black">€{plan.price}</span>
                  <span className={`text-sm ${plan.highlighted ? 'text-indigo-200' : 'text-gray-500'}`}>/Monat</span>
                </div>
                <ul className="space-y-2.5 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className={`h-4 w-4 flex-shrink-0 ${plan.highlighted ? 'text-indigo-300' : 'text-green-500'}`} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={`block text-center font-bold py-3 rounded-xl transition ${plan.highlighted ? 'bg-white text-indigo-600 hover:bg-indigo-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-black mb-4">Bereit loszulegen?</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          In 5 Minuten eingerichtet. Keine Hardware. Keine Kreditkarte zum Testen.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-8 py-4 rounded-2xl text-lg transition"
        >
          Kostenlos starten
          <ChevronRight className="h-5 w-5" />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-2 font-bold text-indigo-600">
              <Zap className="h-5 w-5" />
              RapiQ
            </div>
            <div className="flex gap-5">
              <Link href="/impressum" className="hover:text-indigo-600 transition">Impressum</Link>
              <Link href="/datenschutz" className="hover:text-indigo-600 transition">Datenschutz</Link>
              <Link href="/agb" className="hover:text-indigo-600 transition">AGB</Link>
            </div>
            <p>© {new Date().getFullYear()} RapiQ. Alle Rechte vorbehalten.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
