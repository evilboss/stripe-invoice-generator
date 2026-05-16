import { describe, it, expect } from 'vitest';
import type { InvoiceData, LineItem } from '@/types/invoice';
import {
  generateInvoiceNumber,
  generateReceiptNumber,
  isReceiptDocument,
  num,
  computeLineItemDiscount,
  computeLineItemSubtotal,
  computeLineItemTax,
  computeLineItemTotal,
  computeTotals,
  formatCurrency,
  formatPreciseCurrency,
  formatDate,
  newLineItem,
  newPaymentHistoryEntry,
} from './invoice-utils';

const baseItem = (overrides: Partial<LineItem> = {}): LineItem => ({
  id: 'i1',
  name: 'Item',
  quantity: 1,
  unitPrice: 100,
  discountType: 'percentage',
  discountValue: 0,
  taxRate: 0,
  ...overrides,
});

const baseInvoice = (lineItems: LineItem[]): InvoiceData => ({
  invoiceTitle: 'Invoice',
  invoiceNumber: 'INV-2026-0001',
  invoiceDate: '2026-01-01',
  dueDate: '2026-01-15',
  currency: 'USD',
  from: { name: '', email: '', address: { line1: '', city: '', state: '', zipCode: '', country: '' } },
  billTo: { name: '', email: '', address: { line1: '', city: '', state: '', zipCode: '', country: '' } },
  useShipTo: false,
  lineItems,
  adjustments: { shipping: 0, additionalDiscountType: 'percentage', additionalDiscountValue: 0 },
  paymentInfo: {},
  fileDownloads: {},
  taxLabel: 'Tax',
  layoutStyle: 'modern',
  primaryColor: '#000',
  accentColor: '#000',
  headerTextColor: '#fff',
});

describe('generateInvoiceNumber', () => {
  it('returns INV-YYYY-NNNN format', () => {
    const result = generateInvoiceNumber();
    expect(result).toMatch(/^INV-\d{4}-\d{4}$/);
  });

  it('uses current year', () => {
    const year = new Date().getFullYear();
    expect(generateInvoiceNumber()).toContain(`INV-${year}-`);
  });
});

describe('generateReceiptNumber', () => {
  it('returns Stripe-style NNNN-NNNN-NNNN format', () => {
    const result = generateReceiptNumber();
    expect(result).toMatch(/^\d{4}-\d{4}-\d{4}$/);
  });
});

describe('isReceiptDocument', () => {
  it('returns true only for "Receipt"', () => {
    expect(isReceiptDocument('Receipt')).toBe(true);
  });

  it('returns false for other titles', () => {
    expect(isReceiptDocument('Invoice')).toBe(false);
    expect(isReceiptDocument('Tax Invoice')).toBe(false);
    expect(isReceiptDocument('Quote')).toBe(false);
    expect(isReceiptDocument('')).toBe(false);
  });
});

describe('num', () => {
  it('returns numbers as-is when finite', () => {
    expect(num(42)).toBe(42);
    expect(num(0)).toBe(0);
    expect(num(-3.5)).toBe(-3.5);
  });

  it('parses numeric strings', () => {
    expect(num('42')).toBe(42);
    expect(num('3.14')).toBe(3.14);
  });

  it('returns 0 for NaN, undefined, empty, and non-numeric strings', () => {
    expect(num(NaN)).toBe(0);
    expect(num(undefined)).toBe(0);
    expect(num('')).toBe(0);
    expect(num('abc')).toBe(0);
    expect(num(null)).toBe(0);
  });
});

describe('computeLineItemDiscount', () => {
  it('returns 0 when gross is 0', () => {
    expect(computeLineItemDiscount(baseItem({ quantity: 0 }))).toBe(0);
  });

  it('applies percentage discount', () => {
    const item = baseItem({ discountType: 'percentage', discountValue: 25 });
    expect(computeLineItemDiscount(item)).toBe(25);
  });

  it('clamps percentage to 0-100', () => {
    const over = baseItem({ discountType: 'percentage', discountValue: 150 });
    expect(computeLineItemDiscount(over)).toBe(100);
    const under = baseItem({ discountType: 'percentage', discountValue: -10 });
    expect(computeLineItemDiscount(under)).toBe(0);
  });

  it('applies fixed discount up to gross', () => {
    const item = baseItem({ discountType: 'fixed', discountValue: 30 });
    expect(computeLineItemDiscount(item)).toBe(30);
  });

  it('caps fixed discount at gross', () => {
    const item = baseItem({ discountType: 'fixed', discountValue: 500 });
    expect(computeLineItemDiscount(item)).toBe(100);
  });
});

describe('computeLineItemSubtotal', () => {
  it('returns gross when no discount', () => {
    expect(computeLineItemSubtotal(baseItem({ quantity: 2, unitPrice: 50 }))).toBe(100);
  });

  it('subtracts discount', () => {
    const item = baseItem({ quantity: 2, unitPrice: 50, discountType: 'percentage', discountValue: 10 });
    expect(computeLineItemSubtotal(item)).toBe(90);
  });

  it('never returns negative', () => {
    const item = baseItem({ discountType: 'fixed', discountValue: 9999 });
    expect(computeLineItemSubtotal(item)).toBe(0);
  });
});

describe('computeLineItemTax', () => {
  it('applies tax rate to post-discount subtotal', () => {
    const item = baseItem({ unitPrice: 100, taxRate: 20 });
    expect(computeLineItemTax(item)).toBe(20);
  });

  it('returns 0 when subtotal is 0', () => {
    expect(computeLineItemTax(baseItem({ quantity: 0, taxRate: 20 }))).toBe(0);
  });

  it('ignores negative tax rates', () => {
    const item = baseItem({ taxRate: -5 });
    expect(computeLineItemTax(item)).toBe(0);
  });
});

describe('computeLineItemTotal', () => {
  it('is subtotal + tax', () => {
    const item = baseItem({ unitPrice: 100, taxRate: 20 });
    expect(computeLineItemTotal(item)).toBe(120);
  });
});

describe('computeTotals', () => {
  it('sums subtotal across line items', () => {
    const totals = computeTotals(baseInvoice([
      baseItem({ quantity: 2, unitPrice: 50 }),
      baseItem({ id: 'i2', quantity: 1, unitPrice: 30 }),
    ]));
    expect(totals.subtotal).toBe(130);
  });

  it('applies line discounts and additional discounts', () => {
    const invoice = baseInvoice([baseItem({ unitPrice: 100, discountType: 'percentage', discountValue: 10 })]);
    invoice.adjustments.additionalDiscountType = 'fixed';
    invoice.adjustments.additionalDiscountValue = 10;
    const totals = computeTotals(invoice);
    expect(totals.totalItemDiscounts).toBe(10);
    expect(totals.additionalDiscount).toBe(10);
    expect(totals.taxableAmount).toBe(80);
  });

  it('clamps additional discount to remaining amount', () => {
    const invoice = baseInvoice([baseItem({ unitPrice: 50 })]);
    invoice.adjustments.additionalDiscountType = 'fixed';
    invoice.adjustments.additionalDiscountValue = 100;
    const totals = computeTotals(invoice);
    expect(totals.additionalDiscount).toBe(50);
    expect(totals.taxableAmount).toBe(0);
  });

  it('scales tax proportionally when additional discount eats into taxable amount', () => {
    const invoice = baseInvoice([baseItem({ unitPrice: 100, taxRate: 20 })]);
    invoice.adjustments.additionalDiscountType = 'percentage';
    invoice.adjustments.additionalDiscountValue = 50;
    const totals = computeTotals(invoice);
    expect(totals.taxableAmount).toBe(50);
    expect(totals.totalTax).toBe(10);
    expect(totals.grandTotal).toBe(60);
  });

  it('adds shipping to grand total', () => {
    const invoice = baseInvoice([baseItem({ unitPrice: 100 })]);
    invoice.adjustments.shipping = 15;
    const totals = computeTotals(invoice);
    expect(totals.shipping).toBe(15);
    expect(totals.grandTotal).toBe(115);
  });

  it('clamps negative shipping to 0', () => {
    const invoice = baseInvoice([baseItem({ unitPrice: 100 })]);
    invoice.adjustments.shipping = -50;
    expect(computeTotals(invoice).shipping).toBe(0);
  });

  it('returns zeros for empty line items', () => {
    const totals = computeTotals(baseInvoice([]));
    expect(totals.subtotal).toBe(0);
    expect(totals.grandTotal).toBe(0);
  });

  it('handles missing adjustments object (line 80 branch)', () => {
    const invoice = baseInvoice([baseItem({ unitPrice: 100 })]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (invoice as any).adjustments = undefined;
    const totals = computeTotals(invoice);
    expect(totals.additionalDiscount).toBe(0);
    expect(totals.shipping).toBe(0);
    expect(totals.grandTotal).toBe(100);
  });
});

describe('formatCurrency', () => {
  it('formats USD with 2 decimals', () => {
    expect(formatCurrency(1234.5, 'USD')).toBe('$1,234.50');
  });

  it('formats GBP', () => {
    expect(formatCurrency(50, 'GBP')).toBe('£50.00');
  });

  it('returns currency-formatted 0 for non-finite values', () => {
    expect(formatCurrency(NaN, 'USD')).toBe('$0.00');
    expect(formatCurrency(Infinity, 'USD')).toBe('$0.00');
  });
});

describe('formatPreciseCurrency', () => {
  it('preserves more precision than formatCurrency', () => {
    expect(formatPreciseCurrency(0.123456789, 'USD')).toBe('$0.123456789');
  });

  it('returns currency-formatted 0 for NaN (line 130 branch)', () => {
    expect(formatPreciseCurrency(NaN, 'USD')).toBe('$0.00');
  });

  it('returns currency-formatted 0 for Infinity', () => {
    expect(formatPreciseCurrency(Infinity, 'USD')).toBe('$0.00');
  });
});

describe('formatDate', () => {
  it('formats ISO date as Mon dd, yyyy', () => {
    expect(formatDate('2026-04-14')).toBe('Apr 14, 2026');
  });

  it('returns empty string for empty input', () => {
    expect(formatDate('')).toBe('');
  });

  it('returns original string when date is invalid', () => {
    expect(formatDate('not-a-date')).toBe('not-a-date');
  });
});

describe('newLineItem', () => {
  it('returns a line item with sensible defaults and a unique id', () => {
    const a = newLineItem();
    const b = newLineItem();
    expect(a.id).not.toBe(b.id);
    expect(a.quantity).toBe(1);
    expect(a.unitPrice).toBe(0);
    expect(a.discountType).toBe('percentage');
    expect(a.taxRate).toBe(0);
  });
});

describe('newPaymentHistoryEntry', () => {
  it('returns an entry with unique id and today\'s date', () => {
    const entry = newPaymentHistoryEntry();
    expect(entry.id).toBeTruthy();
    expect(entry.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(entry.cardBrand).toBe('visa');
  });
});
