'use client';

import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { InvoiceData } from '@/types/invoice';
import {
  computeTotals,
  computeLineItemSubtotal,
  computeLineItemTax,
  computeLineItemDiscount,
  formatCurrency,
  formatDate,
} from '@/lib/invoice-utils';

const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#111111',
    backgroundColor: '#ffffff',
    paddingTop: 48,
    paddingBottom: 64,
    paddingHorizontal: 52,
  },

  /* ── Title row ─────────────────────────────────────────── */
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
  },
  logo: {
    width: 90,
    height: 38,
    objectFit: 'contain',
  },
  companyNameRight: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
  },

  /* ── Meta block ────────────────────────────────────────── */
  metaBlock: { marginBottom: 24 },
  metaRow: { flexDirection: 'row', marginBottom: 3 },
  metaLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
    width: 112,
  },
  metaValue: { fontSize: 9, color: '#111111' },

  /* ── Parties ───────────────────────────────────────────── */
  partiesRow: {
    flexDirection: 'row',
    gap: 48,
    marginBottom: 28,
  },
  partyBlock: { flex: 1 },
  sellerName: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  billToLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 3,
  },
  partyText: {
    fontSize: 9,
    color: '#111111',
    lineHeight: 1.5,
    marginBottom: 1,
  },

  /* ── Amount paid heading ───────────────────────────────── */
  amountHeading: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
    marginBottom: 4,
  },

  /* ── Notes ─────────────────────────────────────────────── */
  notesText: {
    fontSize: 8,
    color: '#555555',
    lineHeight: 1.5,
    marginTop: 8,
    marginBottom: 4,
  },

  /* ── Line items table ──────────────────────────────────── */
  tableContainer: { marginTop: 24 },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
    paddingBottom: 6,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 9,
    borderBottomWidth: 0.5,
    borderBottomColor: '#dddddd',
  },
  colDesc:   { flex: 1 },
  colQty:    { width: 36, textAlign: 'right' },
  colPrice:  { width: 64, textAlign: 'right' },
  colTax:    { width: 36, textAlign: 'right' },
  colAmount: { width: 64, textAlign: 'right' },
  thText: { fontSize: 8, color: '#555555' },
  tdText: { fontSize: 9, color: '#111111' },
  tdSubText: { fontSize: 8, color: '#777777', marginTop: 2 },

  /* ── Totals ─────────────────────────────────────────────── */
  totalsSection: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 2,
  },
  totalsTable: { width: '46%' },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 0.5,
    borderBottomColor: '#dddddd',
  },
  totalsRowLast: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 6,
  },
  totalsLabel: { fontSize: 9, color: '#111111' },
  totalsValue: { fontSize: 9, color: '#111111' },
  totalsFinalLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
  },
  totalsFinalValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
  },

  /* ── Payment history ────────────────────────────────────── */
  payHistSection: { marginTop: 36 },
  payHistTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#111111',
    marginBottom: 10,
  },
  phHeader: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#aaaaaa',
    paddingBottom: 5,
  },
  phRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#dddddd',
  },
  phColMethod:  { flex: 1 },
  phColDate:    { width: 80 },
  phColAmount:  { width: 70, textAlign: 'right' },
  phColReceipt: { width: 80, textAlign: 'right' },
  phThText: { fontSize: 8, color: '#777777' },
  phTdText: { fontSize: 9, color: '#111111' },

  /* ── Footer ─────────────────────────────────────────────── */
  footer: {
    position: 'absolute',
    bottom: 24,
    left: 52,
    right: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 0.5,
    borderTopColor: '#cccccc',
    paddingTop: 8,
  },
  footerText: { fontSize: 7, color: '#999999' },
});

interface Props { data: InvoiceData }

export default function CleanReceiptDocument({ data }: Props) {
  const totals  = computeTotals(data);
  const paid    = Number.isFinite(data.amountPaid) ? (data.amountPaid as number) : totals.grandTotal;
  const taxLabel = data.taxLabel || 'Tax';

  const buildTaxLine = () => {
    let label = taxLabel;
    if (data.taxCountry) label += ` - ${data.taxCountry}`;
    const rates = [...new Set(data.lineItems.filter(i => i.taxRate > 0).map(i => i.taxRate))];
    if (rates.length === 1) {
      label += ` (${rates[0]}% on ${formatCurrency(totals.taxableAmount, data.currency)})`;
    }
    return label;
  };

  const formatAddr = (addr: typeof data.from.address) =>
    [addr.line1, addr.line2,
      [addr.city, addr.state].filter(Boolean).join(', '),
      addr.zipCode, addr.country]
      .filter(Boolean).join('\n');

  const vatIdLabel = taxLabel !== 'Tax' ? `${taxLabel}  ` : 'Tax ID  ';

  return (
    <Document title={`${data.invoiceTitle} ${data.invoiceNumber}`} author={data.from.name}>
      <Page size="A4" style={S.page}>

        {/* ── Title + logo ────────────────────────────────── */}
        <View style={S.titleRow}>
          <Text style={S.title}>{data.invoiceTitle}</Text>
          {data.from.logo
            ? <Image src={data.from.logo} style={S.logo} />
            : <Text style={S.companyNameRight}>{data.from.name}</Text>}
        </View>

        {/* ── Meta ────────────────────────────────────────── */}
        <View style={S.metaBlock}>
          <View style={S.metaRow}>
            <Text style={S.metaLabel}>Invoice number</Text>
            <Text style={S.metaValue}>{data.invoiceNumber}</Text>
          </View>
          {data.receiptNumber && (
            <View style={S.metaRow}>
              <Text style={S.metaLabel}>Receipt number</Text>
              <Text style={S.metaValue}>{data.receiptNumber}</Text>
            </View>
          )}
          <View style={S.metaRow}>
            <Text style={S.metaLabel}>Date paid</Text>
            <Text style={S.metaValue}>{formatDate(data.datePaid || data.invoiceDate)}</Text>
          </View>
        </View>

        {/* ── Parties ─────────────────────────────────────── */}
        <View style={S.partiesRow}>
          {/* Seller */}
          <View style={S.partyBlock}>
            <Text style={S.sellerName}>{data.from.name}</Text>
            {data.from.address.line1 ? (
              <Text style={S.partyText}>{formatAddr(data.from.address)}</Text>
            ) : null}
            {data.from.email    && <Text style={S.partyText}>{data.from.email}</Text>}
            {data.from.phone    && <Text style={S.partyText}>{data.from.phone}</Text>}
            {data.from.website  && <Text style={S.partyText}>{data.from.website}</Text>}
            {data.from.taxId    && (
              <Text style={S.partyText}>{vatIdLabel}{data.from.taxId}</Text>
            )}
            {data.from.registrationNumber && (
              <Text style={S.partyText}>Reg No  {data.from.registrationNumber}</Text>
            )}
          </View>

          {/* Bill to */}
          <View style={S.partyBlock}>
            <Text style={S.billToLabel}>Bill to</Text>
            <Text style={S.partyText}>{data.billTo.name}</Text>
            {data.billTo.contactPerson && (
              <Text style={S.partyText}>{data.billTo.contactPerson}</Text>
            )}
            {data.billTo.address.line1 ? (
              <Text style={S.partyText}>{formatAddr(data.billTo.address)}</Text>
            ) : null}
            {data.billTo.email && <Text style={S.partyText}>{data.billTo.email}</Text>}
            {data.billTo.taxId && (
              <Text style={S.partyText}>Tax ID  {data.billTo.taxId}</Text>
            )}
          </View>
        </View>

        {/* ── Amount paid heading ──────────────────────────── */}
        <Text style={S.amountHeading}>
          {formatCurrency(paid, data.currency)} paid on {formatDate(data.datePaid || data.invoiceDate)}
        </Text>

        {/* ── Notes ───────────────────────────────────────── */}
        {data.notes ? <Text style={S.notesText}>{data.notes}</Text> : null}

        {/* ── Line items ──────────────────────────────────── */}
        <View style={S.tableContainer}>
          <View style={S.tableHeader}>
            <View style={S.colDesc}>  <Text style={S.thText}>Description</Text></View>
            <View style={S.colQty}>   <Text style={S.thText}>Qty</Text></View>
            <View style={S.colPrice}> <Text style={S.thText}>Unit price</Text></View>
            <View style={S.colTax}>   <Text style={S.thText}>Tax</Text></View>
            <View style={S.colAmount}><Text style={S.thText}>Amount</Text></View>
          </View>

          {data.lineItems.map((item) => {
            const sub = computeLineItemSubtotal(item);
            const tax = computeLineItemTax(item);
            const disc = computeLineItemDiscount(item);
            return (
              <View key={item.id} style={S.tableRow}>
                <View style={S.colDesc}>
                  <Text style={S.tdText}>{item.name}</Text>
                  {item.description ? <Text style={S.tdSubText}>{item.description}</Text> : null}
                  {disc > 0 ? (
                    <Text style={S.tdSubText}>
                      Discount: {item.discountType === 'percentage'
                        ? `${item.discountValue}% (−${formatCurrency(disc, data.currency)})`
                        : `−${formatCurrency(disc, data.currency)}`}
                    </Text>
                  ) : null}
                </View>
                <View style={S.colQty}>
                  <Text style={S.tdText}>{item.quantity}</Text>
                </View>
                <View style={S.colPrice}>
                  <Text style={S.tdText}>{formatCurrency(item.unitPrice, data.currency)}</Text>
                </View>
                <View style={S.colTax}>
                  <Text style={S.tdText}>{item.taxRate > 0 ? `${item.taxRate}%` : '—'}</Text>
                </View>
                <View style={S.colAmount}>
                  <Text style={S.tdText}>{formatCurrency(sub + tax, data.currency)}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* ── Totals ──────────────────────────────────────── */}
        <View style={S.totalsSection}>
          <View style={S.totalsTable}>
            <View style={S.totalsRow}>
              <Text style={S.totalsLabel}>Subtotal</Text>
              <Text style={S.totalsValue}>{formatCurrency(totals.subtotal, data.currency)}</Text>
            </View>

            {totals.totalItemDiscounts > 0 && (
              <View style={S.totalsRow}>
                <Text style={S.totalsLabel}>Item Discounts</Text>
                <Text style={S.totalsValue}>−{formatCurrency(totals.totalItemDiscounts, data.currency)}</Text>
              </View>
            )}
            {totals.additionalDiscount > 0 && (
              <View style={S.totalsRow}>
                <Text style={S.totalsLabel}>Additional Discount</Text>
                <Text style={S.totalsValue}>−{formatCurrency(totals.additionalDiscount, data.currency)}</Text>
              </View>
            )}

            {totals.totalTax > 0 && (
              <>
                <View style={S.totalsRow}>
                  <Text style={S.totalsLabel}>Total excluding tax</Text>
                  <Text style={S.totalsValue}>{formatCurrency(totals.taxableAmount, data.currency)}</Text>
                </View>
                <View style={S.totalsRow}>
                  <Text style={S.totalsLabel}>{buildTaxLine()}</Text>
                  <Text style={S.totalsValue}>{formatCurrency(totals.totalTax, data.currency)}</Text>
                </View>
              </>
            )}

            {totals.shipping > 0 && (
              <View style={S.totalsRow}>
                <Text style={S.totalsLabel}>Shipping & Handling</Text>
                <Text style={S.totalsValue}>{formatCurrency(totals.shipping, data.currency)}</Text>
              </View>
            )}

            <View style={S.totalsRow}>
              <Text style={S.totalsLabel}>Total</Text>
              <Text style={S.totalsValue}>{formatCurrency(totals.grandTotal, data.currency)}</Text>
            </View>

            <View style={S.totalsRowLast}>
              <Text style={S.totalsFinalLabel}>Amount paid</Text>
              <Text style={S.totalsFinalValue}>{formatCurrency(paid, data.currency)}</Text>
            </View>
          </View>
        </View>

        {/* ── Payment history ──────────────────────────────── */}
        {data.paymentHistory && data.paymentHistory.length > 0 && (
          <View style={S.payHistSection}>
            <Text style={S.payHistTitle}>Payment history</Text>
            <View style={S.phHeader}>
              <View style={S.phColMethod}>  <Text style={S.phThText}>Payment method</Text></View>
              <View style={S.phColDate}>    <Text style={S.phThText}>Date</Text></View>
              <View style={S.phColAmount}>  <Text style={S.phThText}>Amount paid</Text></View>
              <View style={S.phColReceipt}> <Text style={S.phThText}>Receipt number</Text></View>
            </View>
            {data.paymentHistory.map((entry) => (
              <View key={entry.id} style={S.phRow}>
                <View style={S.phColMethod}>
                  <Text style={S.phTdText}>{entry.paymentMethod}</Text>
                </View>
                <View style={S.phColDate}>
                  <Text style={S.phTdText}>{formatDate(entry.date)}</Text>
                </View>
                <View style={S.phColAmount}>
                  <Text style={S.phTdText}>{formatCurrency(entry.amountPaid, data.currency)}</Text>
                </View>
                <View style={S.phColReceipt}>
                  <Text style={S.phTdText}>{entry.receiptNumber}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* ── Terms ───────────────────────────────────────── */}
        {data.terms ? (
          <View style={{ marginTop: 24 }}>
            <Text style={S.notesText}>{data.terms}</Text>
          </View>
        ) : null}

        {/* ── Footer ──────────────────────────────────────── */}
        <View style={S.footer} fixed>
          <Text style={S.footerText}>{data.footerText || ''}</Text>
          <Text
            style={S.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
