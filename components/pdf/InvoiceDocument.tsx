'use client';

import {
  Document,
  Page,
  View,
  Text,
  Image,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';
import { InvoiceData } from '@/types/invoice';
import {
  computeTotals,
  computeLineItemSubtotal,
  computeLineItemTax,
  computeLineItemDiscount,
  formatCurrency,
  formatDate,
} from '@/lib/invoice-utils';
import { getStripeCardAsset } from '@/lib/stripe-card-assets';

Font.register({
  family: 'Helvetica',
  fonts: [],
});

function makeStyles(primary: string, accent: string, headerText: string) {
  return StyleSheet.create({
    page: {
      fontFamily: 'Helvetica',
      fontSize: 9,
      color: '#1a1a2e',
      backgroundColor: '#ffffff',
      paddingTop: 0,
      paddingBottom: 40,
      paddingHorizontal: 0,
    },
    header: {
      backgroundColor: primary,
      paddingHorizontal: 40,
      paddingVertical: 28,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    headerLeft: {
      flexDirection: 'column',
      gap: 6,
    },
    logo: {
      width: 80,
      height: 40,
      objectFit: 'contain',
      objectPositionX: 'left',
      marginBottom: 6,
    },
    companyName: {
      fontSize: 16,
      fontFamily: 'Helvetica-Bold',
      color: headerText,
    },
    headerTagline: {
      fontSize: 8,
      color: headerText,
      opacity: 0.75,
    },
    headerRight: {
      alignItems: 'flex-end',
    },
    invoiceTitle: {
      fontSize: 26,
      fontFamily: 'Helvetica-Bold',
      color: headerText,
      letterSpacing: 1,
      marginBottom: 8,
    },
    invoiceMeta: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 4,
      marginBottom: 3,
    },
    invoiceMetaLabel: {
      fontSize: 8,
      color: headerText,
      opacity: 0.7,
      width: 70,
      textAlign: 'right',
    },
    invoiceMetaValue: {
      fontSize: 8,
      color: headerText,
      fontFamily: 'Helvetica-Bold',
      width: 100,
      textAlign: 'right',
    },
    body: {
      paddingHorizontal: 40,
    },
    partiesRow: {
      flexDirection: 'row',
      marginTop: 28,
      marginBottom: 24,
      gap: 20,
    },
    partyBlock: {
      flex: 1,
    },
    partyLabel: {
      fontSize: 7,
      fontFamily: 'Helvetica-Bold',
      color: accent,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 6,
      borderBottomWidth: 1,
      borderBottomColor: accent,
      paddingBottom: 3,
    },
    partyName: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: '#1a1a2e',
      marginBottom: 3,
    },
    partyText: {
      fontSize: 8,
      color: '#555770',
      marginBottom: 2,
      lineHeight: 1.4,
    },
    divider: {
      height: 1,
      backgroundColor: '#e8eaf0',
      marginVertical: 16,
    },
    tableContainer: {
      marginBottom: 16,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: '#f4f6fa',
      borderTopLeftRadius: 4,
      borderTopRightRadius: 4,
      paddingHorizontal: 8,
      paddingVertical: 7,
      borderBottomWidth: 2,
      borderBottomColor: primary,
    },
    tableRow: {
      flexDirection: 'row',
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f5',
    },
    tableRowAlt: {
      backgroundColor: '#fafbfd',
    },
    colNum: { width: '4%', fontSize: 8 },
    colDesc: { width: '32%' },
    colQty: { width: '8%', textAlign: 'right' },
    colUnit: { width: '8%', textAlign: 'right' },
    colPrice: { width: '12%', textAlign: 'right' },
    colDiscount: { width: '10%', textAlign: 'right' },
    colTax: { width: '8%', textAlign: 'right' },
    colAmount: { width: '18%', textAlign: 'right' },
    thText: {
      fontSize: 7,
      fontFamily: 'Helvetica-Bold',
      color: '#555770',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    tdText: {
      fontSize: 8,
      color: '#1a1a2e',
    },
    tdSubText: {
      fontSize: 7,
      color: '#888a9e',
      marginTop: 2,
    },
    totalsSection: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      marginTop: 4,
    },
    totalsTable: {
      width: '45%',
    },
    totalsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 5,
      borderBottomWidth: 1,
      borderBottomColor: '#f0f0f5',
    },
    totalsRowFinal: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 8,
      backgroundColor: primary,
      paddingHorizontal: 10,
      borderRadius: 4,
      marginTop: 4,
    },
    totalsLabel: {
      fontSize: 8,
      color: '#555770',
    },
    totalsValue: {
      fontSize: 8,
      color: '#1a1a2e',
      fontFamily: 'Helvetica-Bold',
    },
    totalsFinalLabel: {
      fontSize: 10,
      color: '#ffffff',
      fontFamily: 'Helvetica-Bold',
    },
    totalsFinalValue: {
      fontSize: 10,
      color: '#ffffff',
      fontFamily: 'Helvetica-Bold',
    },
    notesSection: {
      marginTop: 28,
      flexDirection: 'row',
      gap: 20,
    },
    notesBlock: {
      flex: 1,
    },
    notesLabel: {
      fontSize: 7,
      fontFamily: 'Helvetica-Bold',
      color: accent,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 5,
    },
    notesText: {
      fontSize: 8,
      color: '#555770',
      lineHeight: 1.5,
    },
    paymentBox: {
      backgroundColor: '#f4f6fa',
      borderRadius: 6,
      padding: 12,
      marginTop: 20,
    },
    paymentLabel: {
      fontSize: 7,
      fontFamily: 'Helvetica-Bold',
      color: accent,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    paymentRow: {
      flexDirection: 'row',
      marginBottom: 4,
    },
    paymentKey: {
      fontSize: 8,
      color: '#888a9e',
      width: 100,
    },
    paymentValue: {
      fontSize: 8,
      color: '#1a1a2e',
      fontFamily: 'Helvetica-Bold',
      flex: 1,
    },
    paymentCardValue: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    paymentCardIcon: {
      height: 12,
      objectFit: 'contain',
    },
    footer: {
      position: 'absolute',
      bottom: 20,
      left: 40,
      right: 40,
      flexDirection: 'row',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderTopColor: '#e8eaf0',
      paddingTop: 8,
    },
    footerText: {
      fontSize: 7,
      color: '#aaaabc',
    },
    badge: {
      backgroundColor: accent,
      borderRadius: 3,
      paddingHorizontal: 5,
      paddingVertical: 2,
      alignSelf: 'flex-start',
      marginTop: 2,
    },
    badgeText: {
      fontSize: 7,
      color: '#ffffff',
      fontFamily: 'Helvetica-Bold',
    },
    historySection: {
      marginTop: 24,
    },
    historyTitle: {
      fontSize: 9,
      fontFamily: 'Helvetica-Bold',
      color: accent,
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    historyHeader: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#e8eaf0',
      paddingBottom: 5,
      marginBottom: 4,
    },
    historyRow: {
      flexDirection: 'row',
      paddingVertical: 5,
      borderBottomWidth: 1,
      borderBottomColor: '#f4f6fa',
    },
    historyHeaderText: {
      fontSize: 7,
      fontFamily: 'Helvetica-Bold',
      color: '#888a9e',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    historyText: {
      fontSize: 8,
      color: '#1a1a2e',
    },
    colHMethod:  { width: '32%' },
    colHDate:    { width: '22%' },
    colHAmount:  { width: '20%', textAlign: 'right' },
    colHReceipt: { width: '26%', textAlign: 'right' },
  });
}

interface Props {
  data: InvoiceData;
}

export default function InvoiceDocument({ data }: Props) {
  const styles = makeStyles(data.primaryColor, data.accentColor, data.headerTextColor ?? '#ffffff');
  const totals = computeTotals(data);
  const cardAsset = data.paymentInfo.cardBrand ? getStripeCardAsset(data.paymentInfo.cardBrand) : null;
  const cardDisplay = cardAsset
    ? `${cardAsset.label}${data.paymentInfo.cardLast4 ? ` ending in ${data.paymentInfo.cardLast4}` : ''}`
    : data.paymentInfo.cardLast4
      ? `Card ending in ${data.paymentInfo.cardLast4}`
      : '';

  const formatAddr = (addr: typeof data.from.address) =>
    [addr.line1, addr.line2, `${addr.city}${addr.state ? ', ' + addr.state : ''} ${addr.zipCode}`, addr.country]
      .filter(Boolean)
      .join('\n');

  return (
    <Document
      title={`${data.invoiceTitle} ${data.invoiceNumber}`}
      author={data.from.name}
    >
      <Page size="A4" style={styles.page}>
        {/* Header Band */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {data.from.logo ? (
              <Image src={data.from.logo} style={styles.logo} />
            ) : (
              <Text style={styles.companyName}>{data.from.name}</Text>
            )}
            {data.from.logo && (
              <Text style={styles.headerTagline}>{data.from.name}</Text>
            )}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.invoiceTitle}>{data.invoiceTitle.toUpperCase()}</Text>
            <View style={styles.invoiceMeta}>
              <Text style={styles.invoiceMetaLabel}>Number:</Text>
              <Text style={styles.invoiceMetaValue}>{data.invoiceNumber}</Text>
            </View>
            <View style={styles.invoiceMeta}>
              <Text style={styles.invoiceMetaLabel}>Date:</Text>
              <Text style={styles.invoiceMetaValue}>{formatDate(data.invoiceDate)}</Text>
            </View>
            <View style={styles.invoiceMeta}>
              <Text style={styles.invoiceMetaLabel}>Due Date:</Text>
              <Text style={styles.invoiceMetaValue}>{formatDate(data.dueDate)}</Text>
            </View>
            {data.poNumber && (
              <View style={styles.invoiceMeta}>
                <Text style={styles.invoiceMetaLabel}>PO Number:</Text>
                <Text style={styles.invoiceMetaValue}>{data.poNumber}</Text>
              </View>
            )}
            {data.reference && (
              <View style={styles.invoiceMeta}>
                <Text style={styles.invoiceMetaLabel}>Reference:</Text>
                <Text style={styles.invoiceMetaValue}>{data.reference}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.body}>
          {/* Parties */}
          <View style={styles.partiesRow}>
            <View style={styles.partyBlock}>
              <Text style={styles.partyLabel}>From</Text>
              <Text style={styles.partyName}>{data.from.name}</Text>
              {data.from.email && <Text style={styles.partyText}>{data.from.email}</Text>}
              {data.from.phone && <Text style={styles.partyText}>{data.from.phone}</Text>}
              {data.from.website && <Text style={styles.partyText}>{data.from.website}</Text>}
              <Text style={styles.partyText}>{formatAddr(data.from.address)}</Text>
              {data.from.taxId && (
                <Text style={styles.partyText}>{data.taxLabel && data.taxLabel !== 'Tax' ? `${data.taxLabel} No:` : 'Tax ID:'} {data.from.taxId}</Text>
              )}
              {data.from.registrationNumber && (
                <Text style={styles.partyText}>Reg No: {data.from.registrationNumber}</Text>
              )}
            </View>

            <View style={styles.partyBlock}>
              <Text style={styles.partyLabel}>Bill To</Text>
              <Text style={styles.partyName}>{data.billTo.name}</Text>
              {data.billTo.contactPerson && (
                <Text style={styles.partyText}>Attn: {data.billTo.contactPerson}</Text>
              )}
              {data.billTo.email && <Text style={styles.partyText}>{data.billTo.email}</Text>}
              {data.billTo.phone && <Text style={styles.partyText}>{data.billTo.phone}</Text>}
              <Text style={styles.partyText}>{formatAddr(data.billTo.address)}</Text>
              {data.billTo.taxId && (
                <Text style={styles.partyText}>Tax ID: {data.billTo.taxId}</Text>
              )}
            </View>

            {data.useShipTo && data.shipTo && (
              <View style={styles.partyBlock}>
                <Text style={styles.partyLabel}>Ship To</Text>
                <Text style={styles.partyName}>{data.shipTo.name}</Text>
                {data.shipTo.contactPerson && (
                  <Text style={styles.partyText}>Attn: {data.shipTo.contactPerson}</Text>
                )}
                {data.shipTo.phone && <Text style={styles.partyText}>{data.shipTo.phone}</Text>}
                <Text style={styles.partyText}>{formatAddr(data.shipTo.address)}</Text>
              </View>
            )}
          </View>

          {/* Line Items Table */}
          <View style={styles.tableContainer}>
            <View style={styles.tableHeader}>
              <View style={styles.colNum}><Text style={styles.thText}>#</Text></View>
              <View style={styles.colDesc}><Text style={styles.thText}>Description</Text></View>
              <View style={styles.colQty}><Text style={styles.thText}>Qty</Text></View>
              <View style={styles.colUnit}><Text style={styles.thText}>Unit</Text></View>
              <View style={styles.colPrice}><Text style={styles.thText}>Unit Price</Text></View>
              <View style={styles.colDiscount}><Text style={styles.thText}>Discount</Text></View>
              <View style={styles.colTax}><Text style={styles.thText}>Tax %</Text></View>
              <View style={styles.colAmount}><Text style={styles.thText}>Amount</Text></View>
            </View>

            {data.lineItems.map((item, i) => {
              const subtotal = computeLineItemSubtotal(item);
              const tax = computeLineItemTax(item);
              const discount = computeLineItemDiscount(item);
              const total = subtotal + tax;
              return (
                <View key={item.id} style={[styles.tableRow, i % 2 === 1 ? styles.tableRowAlt : {}]}>
                  <View style={styles.colNum}>
                    <Text style={styles.tdText}>{i + 1}</Text>
                  </View>
                  <View style={styles.colDesc}>
                    <Text style={styles.tdText}>{item.name}</Text>
                    {item.description ? (
                      <Text style={styles.tdSubText}>{item.description}</Text>
                    ) : null}
                  </View>
                  <View style={styles.colQty}>
                    <Text style={styles.tdText}>{item.quantity}</Text>
                  </View>
                  <View style={styles.colUnit}>
                    <Text style={styles.tdText}>{item.unit || '—'}</Text>
                  </View>
                  <View style={styles.colPrice}>
                    <Text style={styles.tdText}>{formatCurrency(item.unitPrice, data.currency)}</Text>
                  </View>
                  <View style={styles.colDiscount}>
                    <Text style={styles.tdText}>
                      {discount > 0
                        ? item.discountType === 'percentage'
                          ? `${item.discountValue}%`
                          : formatCurrency(discount, data.currency)
                        : '—'}
                    </Text>
                  </View>
                  <View style={styles.colTax}>
                    <Text style={styles.tdText}>{item.taxRate > 0 ? `${item.taxRate}%` : '—'}</Text>
                  </View>
                  <View style={styles.colAmount}>
                    <Text style={[styles.tdText, { fontFamily: 'Helvetica-Bold' }]}>
                      {formatCurrency(total, data.currency)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Totals */}
          <View style={styles.totalsSection}>
            <View style={styles.totalsTable}>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Subtotal</Text>
                <Text style={styles.totalsValue}>{formatCurrency(totals.subtotal, data.currency)}</Text>
              </View>
              {totals.totalItemDiscounts > 0 && (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Item Discounts</Text>
                  <Text style={styles.totalsValue}>−{formatCurrency(totals.totalItemDiscounts, data.currency)}</Text>
                </View>
              )}
              {totals.additionalDiscount > 0 && (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>
                    Additional Discount
                    {data.adjustments.additionalDiscountType === 'percentage'
                      ? ` (${data.adjustments.additionalDiscountValue}%)`
                      : ''}
                  </Text>
                  <Text style={styles.totalsValue}>−{formatCurrency(totals.additionalDiscount, data.currency)}</Text>
                </View>
              )}
              {totals.totalTax > 0 && (
                <>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>Total excluding tax</Text>
                    <Text style={styles.totalsValue}>{formatCurrency(totals.taxableAmount, data.currency)}</Text>
                  </View>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>
                      {data.taxLabel || 'Tax'}
                      {data.taxCountry ? ` — ${data.taxCountry}` : ''}
                      {(() => {
                        const rates = [...new Set(data.lineItems.filter(i => i.taxRate > 0).map(i => i.taxRate))];
                        return rates.length === 1 ? ` (${rates[0]}% on ${formatCurrency(totals.taxableAmount, data.currency)})` : '';
                      })()}
                    </Text>
                    <Text style={styles.totalsValue}>{formatCurrency(totals.totalTax, data.currency)}</Text>
                  </View>
                </>
              )}
              {totals.shipping > 0 && (
                <View style={styles.totalsRow}>
                  <Text style={styles.totalsLabel}>Shipping & Handling</Text>
                  <Text style={styles.totalsValue}>{formatCurrency(totals.shipping, data.currency)}</Text>
                </View>
              )}
              <View style={styles.totalsRowFinal}>
                <Text style={styles.totalsFinalLabel}>Total Due ({data.currency})</Text>
                <Text style={styles.totalsFinalValue}>{formatCurrency(totals.grandTotal, data.currency)}</Text>
              </View>
            </View>
          </View>

          {/* Payment Info */}
          {(data.paymentInfo.method || cardDisplay || data.paymentInfo.bankName || data.paymentInfo.iban) && (
            <View style={styles.paymentBox}>
              <Text style={styles.paymentLabel}>Payment Information</Text>
              {data.paymentInfo.method && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentKey}>Method:</Text>
                  <Text style={styles.paymentValue}>{data.paymentInfo.method}</Text>
                </View>
              )}
              {cardDisplay && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentKey}>Card:</Text>
                  <View style={styles.paymentCardValue}>
                    {cardAsset && (
                      <Image
                        src={cardAsset.url}
                        style={[styles.paymentCardIcon, { width: cardAsset.width * 0.75 }]}
                      />
                    )}
                    <Text style={styles.paymentValue}>{cardDisplay}</Text>
                  </View>
                </View>
              )}
              {data.paymentInfo.bankName && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentKey}>Bank:</Text>
                  <Text style={styles.paymentValue}>{data.paymentInfo.bankName}</Text>
                </View>
              )}
              {data.paymentInfo.accountName && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentKey}>Account Name:</Text>
                  <Text style={styles.paymentValue}>{data.paymentInfo.accountName}</Text>
                </View>
              )}
              {data.paymentInfo.accountNumber && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentKey}>Account No:</Text>
                  <Text style={styles.paymentValue}>{data.paymentInfo.accountNumber}</Text>
                </View>
              )}
              {data.paymentInfo.routingNumber && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentKey}>Routing No:</Text>
                  <Text style={styles.paymentValue}>{data.paymentInfo.routingNumber}</Text>
                </View>
              )}
              {data.paymentInfo.iban && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentKey}>IBAN:</Text>
                  <Text style={styles.paymentValue}>{data.paymentInfo.iban}</Text>
                </View>
              )}
              {data.paymentInfo.swift && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentKey}>SWIFT/BIC:</Text>
                  <Text style={styles.paymentValue}>{data.paymentInfo.swift}</Text>
                </View>
              )}
              {data.paymentInfo.paymentUrl && (
                <View style={styles.paymentRow}>
                  <Text style={styles.paymentKey}>Pay Online:</Text>
                  <Text style={[styles.paymentValue, { color: data.accentColor }]}>{data.paymentInfo.paymentUrl}</Text>
                </View>
              )}
            </View>
          )}

          {/* Payment History */}
          {data.paymentHistory && data.paymentHistory.length > 0 && (
            <View style={styles.historySection} wrap={false}>
              <Text style={styles.historyTitle}>Payment History</Text>
              <View style={styles.historyHeader}>
                <View style={styles.colHMethod}>
                  <Text style={styles.historyHeaderText}>Payment Method</Text>
                </View>
                <View style={styles.colHDate}>
                  <Text style={styles.historyHeaderText}>Date</Text>
                </View>
                <View style={styles.colHAmount}>
                  <Text style={styles.historyHeaderText}>Amount Paid</Text>
                </View>
                <View style={styles.colHReceipt}>
                  <Text style={styles.historyHeaderText}>Receipt No.</Text>
                </View>
              </View>
              {data.paymentHistory.map((p) => (
                <View key={p.id} style={styles.historyRow}>
                  <View style={styles.colHMethod}>
                    <Text style={styles.historyText}>{p.paymentMethod || '—'}</Text>
                  </View>
                  <View style={styles.colHDate}>
                    <Text style={styles.historyText}>{p.date ? formatDate(p.date) : '—'}</Text>
                  </View>
                  <View style={styles.colHAmount}>
                    <Text style={styles.historyText}>
                      {formatCurrency(p.amountPaid, data.currency)}
                    </Text>
                  </View>
                  <View style={styles.colHReceipt}>
                    <Text style={styles.historyText}>{p.receiptNumber || '—'}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Notes & Terms */}
          {(data.notes || data.terms) && (
            <View style={styles.notesSection}>
              {data.notes && (
                <View style={styles.notesBlock}>
                  <Text style={styles.notesLabel}>Notes</Text>
                  <Text style={styles.notesText}>{data.notes}</Text>
                </View>
              )}
              {data.terms && (
                <View style={styles.notesBlock}>
                  <Text style={styles.notesLabel}>Terms & Conditions</Text>
                  <Text style={styles.notesText}>{data.terms}</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            {data.footerText || `${data.from.name} · ${data.from.email}`}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  );
}
