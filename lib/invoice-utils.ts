import { ComputedTotals, InvoiceData, LineItem, PaymentHistoryEntry } from '@/types/invoice';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

export function generateInvoiceNumber(): string {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 9000) + 1000;
  return `INV-${year}-${random}`;
}

/** Stripe-style receipt number: NNNN-NNNN-NNNN (matches OpenAI/Anthropic). */
export function generateReceiptNumber(): string {
  const block = () => String(Math.floor(Math.random() * 9000) + 1000);
  return `${block()}-${block()}-${block()}`;
}

/** Coerce any form value to a finite number (treats NaN/undefined/"" as 0). */
export function num(v: unknown): number {
  const n = typeof v === 'number' ? v : parseFloat(v as string);
  return Number.isFinite(n) ? n : 0;
}

/** Gross value for a line item (qty × unit price), clamped at 0. */
function grossFor(item: LineItem): number {
  return Math.max(0, num(item.quantity) * num(item.unitPrice));
}

/**
 * Discount amount for a line item.
 *  - percentage: clamped 0–100% of gross
 *  - fixed: clamped at gross so subtotal never goes negative
 */
export function computeLineItemDiscount(item: LineItem): number {
  const gross = grossFor(item);
  if (gross <= 0) return 0;
  const raw =
    item.discountType === 'percentage'
      ? gross * (Math.min(100, Math.max(0, num(item.discountValue))) / 100)
      : Math.max(0, num(item.discountValue));
  return Math.min(raw, gross);
}

/** Post-discount subtotal (gross − discount), never negative. */
export function computeLineItemSubtotal(item: LineItem): number {
  return Math.max(0, grossFor(item) - computeLineItemDiscount(item));
}

/** Tax on a single line item — applied to post-discount subtotal. */
export function computeLineItemTax(item: LineItem): number {
  const rate = Math.max(0, num(item.taxRate));
  return computeLineItemSubtotal(item) * (rate / 100);
}

/** Full line-item total (subtotal + tax). */
export function computeLineItemTotal(item: LineItem): number {
  return computeLineItemSubtotal(item) + computeLineItemTax(item);
}

export function computeTotals(data: InvoiceData): ComputedTotals {
  // Gross subtotal (pre-discount)
  const subtotal = data.lineItems.reduce(
    (sum, item) => sum + grossFor(item),
    0
  );

  // Sum of all line-item discounts
  const totalItemDiscounts = data.lineItems.reduce(
    (sum, item) => sum + computeLineItemDiscount(item),
    0
  );

  const afterItemDiscounts = Math.max(0, subtotal - totalItemDiscounts);

  // Invoice-level (additional) discount, clamped to the remaining amount
  const adjType  = data.adjustments?.additionalDiscountType ?? 'percentage';
  const adjValue = num(data.adjustments?.additionalDiscountValue);
  const additionalDiscountRaw =
    adjType === 'percentage'
      ? afterItemDiscounts * (Math.min(100, Math.max(0, adjValue)) / 100)
      : Math.max(0, adjValue);
  const additionalDiscount = Math.min(additionalDiscountRaw, afterItemDiscounts);

  const totalDiscount = totalItemDiscounts + additionalDiscount;
  const taxableAmount = Math.max(0, afterItemDiscounts - additionalDiscount);

  // Tax is computed per line on post-line-discount subtotal.
  // We scale it down proportionally if an additional (invoice-level) discount
  // eats into the taxable amount so tax stays consistent with taxableAmount.
  const rawTax = data.lineItems.reduce(
    (sum, item) => sum + computeLineItemTax(item),
    0
  );
  const totalTax =
    afterItemDiscounts > 0
      ? rawTax * (taxableAmount / afterItemDiscounts)
      : 0;

  const shipping = Math.max(0, num(data.adjustments?.shipping));
  const grandTotal = taxableAmount + totalTax + shipping;

  return {
    subtotal,
    totalItemDiscounts,
    additionalDiscount,
    totalDiscount,
    taxableAmount,
    totalTax,
    shipping,
    grandTotal,
  };
}

export function formatCurrency(amount: number, currency: string): string {
  // Intl.NumberFormat renders NaN as "NaN" — coerce to 0 first.
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(safe);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), 'MMM dd, yyyy');
  } catch {
    return dateStr;
  }
}

export function newLineItem(): LineItem {
  return {
    id: uuidv4(),
    name: '',
    description: '',
    quantity: 1,
    unit: '',
    unitPrice: 0,
    discountType: 'percentage',
    discountValue: 0,
    taxRate: 0,
  };
}

export const CURRENCIES = [
  { value: 'USD', label: 'USD — US Dollar' },
  { value: 'EUR', label: 'EUR — Euro' },
  { value: 'GBP', label: 'GBP — British Pound' },
  { value: 'AUD', label: 'AUD — Australian Dollar' },
  { value: 'CAD', label: 'CAD — Canadian Dollar' },
  { value: 'JPY', label: 'JPY — Japanese Yen' },
  { value: 'SGD', label: 'SGD — Singapore Dollar' },
  { value: 'HKD', label: 'HKD — Hong Kong Dollar' },
  { value: 'NZD', label: 'NZD — New Zealand Dollar' },
  { value: 'CHF', label: 'CHF — Swiss Franc' },
  { value: 'MYR', label: 'MYR — Malaysian Ringgit' },
  { value: 'PHP', label: 'PHP — Philippine Peso' },
  { value: 'INR', label: 'INR — Indian Rupee' },
  { value: 'IDR', label: 'IDR — Indonesian Rupiah' },
  { value: 'THB', label: 'THB — Thai Baht' },
];

export const COUNTRIES = [
  'United States', 'United Kingdom', 'Australia', 'Canada', 'Germany',
  'France', 'Japan', 'Singapore', 'Malaysia', 'Philippines', 'India',
  'Indonesia', 'Thailand', 'Hong Kong', 'New Zealand', 'Switzerland',
  'Netherlands', 'Sweden', 'Norway', 'Denmark', 'Other',
];

export function newPaymentHistoryEntry(): PaymentHistoryEntry {
  return {
    id: uuidv4(),
    paymentMethod: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    amountPaid: 0,
    receiptNumber: '',
  };
}

export const PAYMENT_METHODS = [
  'Bank Transfer', 'Credit Card', 'Debit Card', 'PayPal', 'Stripe',
  'Wise', 'Cryptocurrency', 'Check', 'Cash', 'Other',
];
