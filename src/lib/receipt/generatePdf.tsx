import {
  Document, Page, Text, View, StyleSheet, Image
} from '@react-pdf/renderer'
import type { TransactionWithLines } from '@/types/database'
import { formatDateTime, formatCurrency, truncateSignature } from '@/lib/utils'

const styles = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    padding: '12mm 10mm',
    backgroundColor: '#ffffff',
    color: '#111111',
    width: '80mm',
  },
  center: { textAlign: 'center' },
  bold: { fontFamily: 'Helvetica-Bold' },
  separator: { borderBottom: '0.5pt solid #cccccc', marginVertical: 5 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  smallText: { fontSize: 7, color: '#555555' },
  headerText: { fontSize: 11, fontFamily: 'Helvetica-Bold', textAlign: 'center' },
  subheader: { fontSize: 8, textAlign: 'center', color: '#444444' },
  vatBadge: { fontSize: 7, color: '#888888' },
  vatTable: { marginTop: 4, marginBottom: 4 },
  vatRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 1 },
  tseSection: { marginTop: 6, fontSize: 7, color: '#444444' },
  tseRow: { flexDirection: 'row', marginBottom: 1.5 },
  tseLabel: { width: '35%', color: '#888888' },
  tseValue: { width: '65%', fontFamily: 'Helvetica-Bold', fontSize: 7 },
  totalSection: { marginTop: 4 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  totalLabel: { fontFamily: 'Helvetica-Bold', fontSize: 11 },
  totalValue: { fontFamily: 'Helvetica-Bold', fontSize: 11 },
  footer: { textAlign: 'center', fontSize: 7, color: '#aaaaaa', marginTop: 8 },
})

function money(n: number) {
  return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n)
}

interface ReceiptPdfProps {
  transaction: TransactionWithLines
  receiptUrl: string
}

export function ReceiptDocument({ transaction: tx, receiptUrl }: ReceiptPdfProps) {
  const merchant = tx.merchants
  const lines = tx.transaction_lines || []

  const has7 = tx.vat_7_net > 0
  const has19 = tx.vat_19_net > 0

  return (
    <Document>
      <Page size={[226.77, 841.89]} style={styles.page}>
        {/* Header */}
        <Text style={styles.headerText}>{merchant?.business_name || 'RapiQ Kasse'}</Text>
        <Text style={styles.subheader}>{merchant?.address}</Text>
        <Text style={styles.subheader}>{merchant?.postal_code} {merchant?.city}</Text>
        {merchant?.steuernummer && (
          <Text style={styles.subheader}>StNr: {merchant.steuernummer}</Text>
        )}
        {merchant?.ust_id_nr && (
          <Text style={styles.subheader}>USt-IdNr: {merchant.ust_id_nr}</Text>
        )}
        <View style={styles.separator} />

        {/* Meta */}
        <View style={styles.row}>
          <Text>Beleg-Nr.</Text>
          <Text style={styles.bold}>{String(tx.transaction_number).padStart(6, '0')}</Text>
        </View>
        <View style={styles.row}>
          <Text>Datum</Text>
          <Text>{formatDateTime(tx.finished_at || tx.created_at)}</Text>
        </View>
        <View style={styles.row}>
          <Text>Zahlungsart</Text>
          <Text>{tx.payment_method === 'cash' ? 'Bar' : 'Karte'}</Text>
        </View>
        <View style={styles.separator} />

        {/* Line items */}
        {lines.map((line) => (
          <View key={line.id} style={{ marginBottom: 3 }}>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text>{line.description}</Text>
                <Text style={styles.vatBadge}>
                  {line.quantity !== 1 ? `${line.quantity} × ${money(line.unit_price)}  ` : ''}
                  {line.vat_rate}% MwSt.
                </Text>
              </View>
              <Text style={{ marginLeft: 4 }}>{money(line.gross_amount)}</Text>
            </View>
          </View>
        ))}
        <View style={styles.separator} />

        {/* VAT breakdown */}
        <View style={styles.vatTable}>
          <View style={[styles.vatRow, { borderBottom: '0.5pt solid #eeeeee', paddingBottom: 2, marginBottom: 3 }]}>
            <Text style={{ ...styles.smallText, width: '20%' }}>MwSt.</Text>
            <Text style={{ ...styles.smallText, width: '27%', textAlign: 'right' }}>Netto</Text>
            <Text style={{ ...styles.smallText, width: '20%', textAlign: 'right' }}>MwSt.</Text>
            <Text style={{ ...styles.smallText, width: '33%', textAlign: 'right' }}>Brutto</Text>
          </View>
          {has7 && (
            <View style={styles.vatRow}>
              <Text style={{ width: '20%', fontSize: 8 }}>7%</Text>
              <Text style={{ width: '27%', textAlign: 'right', fontSize: 8 }}>{money(tx.vat_7_net)}</Text>
              <Text style={{ width: '20%', textAlign: 'right', fontSize: 8 }}>{money(tx.vat_7_amount)}</Text>
              <Text style={{ width: '33%', textAlign: 'right', fontSize: 8 }}>{money(tx.vat_7_net + tx.vat_7_amount)}</Text>
            </View>
          )}
          {has19 && (
            <View style={styles.vatRow}>
              <Text style={{ width: '20%', fontSize: 8 }}>19%</Text>
              <Text style={{ width: '27%', textAlign: 'right', fontSize: 8 }}>{money(tx.vat_19_net)}</Text>
              <Text style={{ width: '20%', textAlign: 'right', fontSize: 8 }}>{money(tx.vat_19_amount)}</Text>
              <Text style={{ width: '33%', textAlign: 'right', fontSize: 8 }}>{money(tx.vat_19_net + tx.vat_19_amount)}</Text>
            </View>
          )}
        </View>
        <View style={styles.separator} />

        {/* Total */}
        <View style={[styles.row, { marginTop: 4 }]}>
          <Text style={styles.totalLabel}>GESAMT</Text>
          <Text style={styles.totalValue}>{money(tx.total)}</Text>
        </View>
        <View style={styles.separator} />

        {/* TSE data (mandatory per §6 KassenSichV) */}
        <View style={styles.tseSection}>
          <Text style={{ ...styles.bold, fontSize: 7, marginBottom: 3 }}>TSE-Daten (§146a AO)</Text>
          {[
            ['TSE-Serial', tx.tse_serial],
            ['Vorgangs-Nr.', tx.tse_transaction_number],
            ['Signaturzähler', String(tx.tse_signature_counter || 0)],
            ['Prozesstyp', tx.process_type],
            ['Start', tx.tse_start_time ? formatDateTime(tx.tse_start_time) : '-'],
            ['Ende', tx.tse_finish_time ? formatDateTime(tx.tse_finish_time) : '-'],
            ['Signatur', tx.tse_signature_base64 ? truncateSignature(tx.tse_signature_base64) : '-'],
          ].map(([label, value]) => (
            <View key={label} style={styles.tseRow}>
              <Text style={styles.tseLabel}>{label}</Text>
              <Text style={styles.tseValue}>{value || '-'}</Text>
            </View>
          ))}
        </View>
        <View style={styles.separator} />

        {/* Footer */}
        <Text style={styles.footer}>
          Digitaler Beleg: {receiptUrl}
        </Text>
        <Text style={{ ...styles.footer, marginTop: 2 }}>
          Powered by RapiQ · rapiq.net
        </Text>
      </Page>
    </Document>
  )
}
