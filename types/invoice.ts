export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface BusinessInfo {
  logo?: string; // base64 data URL
  name: string;
  email: string;
  phone?: string;
  address: Address;
  taxId?: string;
  registrationNumber?: string;
  website?: string;
}

export interface CustomerInfo {
  name: string;
  contactPerson?: string;
  email: string;
  phone?: string;
  address: Address;
  taxId?: string;
}

export type DiscountType = 'percentage' | 'fixed';
export type LayoutStyle = 'modern' | 'clean';

export interface PaymentHistoryEntry {
  id: string;
  paymentMethod: string; // e.g. "Mastercard - 8308"
  date: string;          // ISO yyyy-MM-dd
  amountPaid: number;
  receiptNumber: string;
}

export interface LineItem {
  id: string;
  name: string;
  description?: string;
  quantity: number;
  unit?: string;
  unitPrice: number;
  discountType: DiscountType;
  discountValue: number;
  taxRate: number;
}

export interface InvoiceAdjustments {
  shipping: number;
  additionalDiscountType: DiscountType;
  additionalDiscountValue: number;
}

export interface PaymentInfo {
  method?: string;
  cardBrand?: string;
  cardLast4?: string;
  bankName?: string;
  accountName?: string;
  accountNumber?: string;
  routingNumber?: string;
  iban?: string;
  swift?: string;
  paymentUrl?: string;
}

export type InvoiceTitle = 'Invoice' | 'Tax Invoice' | 'Quote' | 'Receipt' | 'Credit Note' | 'Proforma Invoice';

export interface InvoiceData {
  // Metadata
  invoiceTitle: InvoiceTitle;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  currency: string;
  poNumber?: string;
  reference?: string;

  // Parties
  from: BusinessInfo;
  billTo: CustomerInfo;
  shipTo?: CustomerInfo;
  useShipTo: boolean;

  // Items
  lineItems: LineItem[];
  adjustments: InvoiceAdjustments;

  // Payment
  paymentInfo: PaymentInfo;

  // Text
  notes?: string;
  terms?: string;
  footerText?: string;

  // Tax settings
  taxLabel: string;    // e.g. "VAT", "GST", "HST", "Sales Tax"
  taxCountry?: string; // e.g. "United Kingdom" — shown as "VAT - United Kingdom"

  // Layout
  layoutStyle: LayoutStyle; // 'modern' (coloured header) | 'clean' (B&W)

  // Receipt-specific (used by clean layout)
  receiptNumber?: string;
  datePaid?: string;        // ISO yyyy-MM-dd; falls back to invoiceDate
  amountPaid?: number;      // explicit override; falls back to grandTotal
  paymentHistory?: PaymentHistoryEntry[];

  // Customization
  primaryColor: string;
  accentColor: string;
  headerTextColor: string; // text/logo colour on the coloured header band
}

export interface ComputedTotals {
  subtotal: number;
  totalItemDiscounts: number;
  additionalDiscount: number;
  totalDiscount: number;
  taxableAmount: number;
  totalTax: number;
  shipping: number;
  grandTotal: number;
}
