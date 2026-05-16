'use client';

import { useState, useCallback, useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { format, addDays } from 'date-fns';
import dynamic from 'next/dynamic';
import { InvoiceData } from '@/types/invoice';
import { generateInvoiceNumber, generateReceiptNumber, isReceiptDocument, newLineItem, num } from '@/lib/invoice-utils';
import BusinessInfoSection from '@/components/form/BusinessInfoSection';
import CustomerInfoSection from '@/components/form/CustomerInfoSection';
import InvoiceDetailsSection from '@/components/form/InvoiceDetailsSection';
import LineItemsSection from '@/components/form/LineItemsSection';
import AdjustmentsSection from '@/components/form/AdjustmentsSection';
import PaymentInfoSection from '@/components/form/PaymentInfoSection';
import FileDownloadsSection from '@/components/form/FileDownloadsSection';
import NotesSection from '@/components/form/NotesSection';
import CustomizationSection from '@/components/form/CustomizationSection';
import ReceiptDetailsSection from '@/components/form/ReceiptDetailsSection';
import Button from '@/components/ui/Button';
import LocalHydrationPanel from '@/components/LocalHydrationPanel';
import { getStripeCardAsset } from '@/lib/stripe-card-assets';
import {
  type HydrationProfile,
  describeHydrationSources,
  fetchLocalJson,
  EMPTY_HYDRATION_ID,
  isEmptyHydrationId,
  loadHydrationManifest,
  resolveLocalUrl,
} from '@/lib/local-hydration';

const InvoicePreviewModal = dynamic(() => import('@/components/InvoicePreviewModal'), { ssr: false });

type InvoicePrefill = Partial<InvoiceData>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeInvoiceData(base: InvoiceData, patch: InvoicePrefill): InvoiceData {
  const merge = (left: unknown, right: unknown): unknown => {
    if (Array.isArray(right)) return right;
    if (isRecord(left) && isRecord(right)) {
      return Object.fromEntries(
        [...new Set([...Object.keys(left), ...Object.keys(right)])]
          .map(key => [key, merge(left[key], right[key])])
      );
    }
    return right === undefined ? left : right;
  };

  return merge(base, patch) as InvoiceData;
}

function receiptPrefillToInvoice(config: Record<string, unknown>): InvoicePrefill {
  const lineItems = Array.isArray(config.lineItems) ? config.lineItems : [];
  const paymentDate = typeof config.paymentDate === 'string' ? config.paymentDate : '';
  const isoPaidDate = paymentDate ? format(new Date(paymentDate), 'yyyy-MM-dd') : defaultValues.invoiceDate;
  const cardBrand = typeof config.cardBrand === 'string' ? config.cardBrand : '';
  const cardLast4 = typeof config.cardLast4 === 'string' ? config.cardLast4 : '';
  const invoiceLineItems = lineItems.map((raw, index) => {
    const item = isRecord(raw) ? raw : {};
    return {
      id: typeof item.id === 'string' ? item.id : String(index + 1),
      name: typeof item.name === 'string' ? item.name : '',
      description: typeof config.billingPeriod === 'string' ? config.billingPeriod : '',
      quantity: Number(item.qty) || 0,
      unitPrice: Number(item.unitPrice) || 0,
      discountType: 'percentage' as const,
      discountValue: 0,
      taxRate: Number(item.taxRate) || 0,
    };
  });
  const amountPaid = invoiceLineItems.reduce((sum, item) => {
    const subtotal = Math.max(0, item.quantity * item.unitPrice);
    return sum + subtotal + subtotal * (Math.max(0, item.taxRate) / 100);
  }, 0);

  return {
    invoiceTitle: 'Invoice',
    invoiceNumber: typeof config.invoiceNumber === 'string' ? config.invoiceNumber : defaultValues.invoiceNumber,
    invoiceDate: isoPaidDate,
    dueDate: isoPaidDate,
    currency: 'USD',
    from: {
      ...defaultValues.from,
      logo: typeof config.logo === 'string' ? config.logo : undefined,
      name: typeof config.companyName === 'string' ? config.companyName : '',
      email: typeof config.fromEmail === 'string' ? config.fromEmail : '',
      website: typeof config.supportUrl === 'string' ? config.supportUrl : '',
      address: {
        line1: '548 Market St',
        line2: 'PMB 68956',
        city: 'San Francisco',
        state: 'California',
        zipCode: '94104',
        country: 'United States',
      },
    },
    billTo: {
      ...defaultValues.billTo,
      name: 'Gilberto B. Reyes Jr',
      email: typeof config.toEmail === 'string' ? config.toEmail : 'jr.evilboss@gmail.com',
      taxId: 'GB434338990',
      address: {
        line1: '21 Milton Park',
        line2: '',
        city: 'London',
        state: 'England',
        zipCode: 'N6 5QA',
        country: 'United Kingdom',
      },
    },
    lineItems: invoiceLineItems,
    adjustments: {
      shipping: 0,
      additionalDiscountType: 'percentage',
      additionalDiscountValue: 0,
    },
    paymentInfo: {
      ...defaultValues.paymentInfo,
      method: cardBrand && cardLast4 ? `${getStripeCardAsset(cardBrand).label} - ${cardLast4}` : '',
      cardBrand,
      cardLast4,
    },
    fileDownloads: {
      invoiceUrl: typeof config.invoiceDownloadUrl === 'string' ? config.invoiceDownloadUrl : '',
      receiptUrl: typeof config.receiptDownloadUrl === 'string' ? config.receiptDownloadUrl : '',
    },
    taxLabel: typeof config.taxLabel === 'string' ? config.taxLabel : 'Tax',
    taxCountry: typeof config.taxCountry === 'string' ? config.taxCountry : '',
    layoutStyle: 'clean',
    receiptNumber: typeof config.receiptNumber === 'string' ? config.receiptNumber : defaultValues.receiptNumber,
    datePaid: isoPaidDate,
    amountPaid,
    renderPaymentHistory: true,
    paymentHistory: [{
      id: 'local-payment-history',
      paymentMethod: cardBrand && cardLast4 ? `${getStripeCardAsset(cardBrand).label} - ${cardLast4}` : '',
      cardBrand,
      cardLast4,
      date: isoPaidDate,
      amountPaid,
      receiptNumber: typeof config.receiptNumber === 'string' ? config.receiptNumber : '',
    }],
    notes: typeof config.contactEmail === 'string'
      ? `Questions? Visit our support site or contact us at ${config.contactEmail}.`
      : defaultValues.notes,
  };
}

function normalizeInvoicePrefill(raw: unknown): InvoicePrefill | null {
  if (!isRecord(raw)) return null;
  if (isRecord(raw.invoiceGenerator)) return raw.invoiceGenerator as InvoicePrefill;
  if (isRecord(raw.invoice)) return raw.invoice as InvoicePrefill;
  if (isRecord(raw.receiptEml)) return receiptPrefillToInvoice(raw.receiptEml);
  return raw as InvoicePrefill;
}

const defaultValues: InvoiceData = {
  invoiceTitle: 'Invoice',
  invoiceNumber: generateInvoiceNumber(),
  invoiceDate: format(new Date(), 'yyyy-MM-dd'),
  dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
  currency: 'USD',
  poNumber: '',
  reference: '',
  from: {
    logo: undefined,
    name: '',
    email: '',
    phone: '',
    website: '',
    taxId: '',
    registrationNumber: '',
    address: { line1: '', line2: '', city: '', state: '', zipCode: '', country: 'United States' },
  },
  billTo: {
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    taxId: '',
    address: { line1: '', line2: '', city: '', state: '', zipCode: '', country: 'United States' },
  },
  shipTo: {
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: { line1: '', line2: '', city: '', state: '', zipCode: '', country: 'United States' },
  },
  useShipTo: false,
  lineItems: [newLineItem()],
  adjustments: {
    shipping: 0,
    additionalDiscountType: 'percentage',
    additionalDiscountValue: 0,
  },
  paymentInfo: {
    method: '',
    cardBrand: '',
    cardLast4: '',
    bankName: '',
    accountName: '',
    accountNumber: '',
    routingNumber: '',
    iban: '',
    swift: '',
    paymentUrl: '',
  },
  fileDownloads: {
    invoiceUrl: '',
    receiptUrl: '',
  },
  notes: '',
  terms: '',
  footerText: '',
  taxLabel: 'Tax',
  taxCountry: '',
  layoutStyle: 'modern',
  receiptNumber: '',
  datePaid: '',
  amountPaid: undefined,
  renderPaymentHistory: false,
  paymentHistory: [],
  primaryColor: '#635BFF',
  accentColor: '#00D4FF',
  headerTextColor: '#ffffff',
};

export default function InvoiceForm() {
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<InvoiceData | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [hydrationProfiles, setHydrationProfiles] = useState<HydrationProfile[]>([]);
  const [selectedHydrationId, setSelectedHydrationId] = useState(EMPTY_HYDRATION_ID);
  const [hydrationLoading, setHydrationLoading] = useState(false);
  const [localPrefill, setLocalPrefill] = useState<InvoicePrefill | null>(null);
  const [localPrefillSource, setLocalPrefillSource] = useState('');
  const [localPrefillApplied, setLocalPrefillApplied] = useState(false);

  const { register, control, watch, setValue, getValues, reset, handleSubmit, formState: { errors } } = useForm<InvoiceData>({
    defaultValues,
    mode: 'onChange',
  });

  useEffect(() => {
    let cancelled = false;

    loadHydrationManifest().then(profiles => {
      if (cancelled) return;
      setHydrationProfiles(profiles);
      setSelectedHydrationId(prev =>
        prev && (profiles.some(p => p.id === prev) || isEmptyHydrationId(prev))
          ? prev
          : EMPTY_HYDRATION_ID
      );
    });

    return () => { cancelled = true; };
  }, []);

  const [lastResolvedHydrationId, setLastResolvedHydrationId] = useState(selectedHydrationId);
  if (selectedHydrationId !== lastResolvedHydrationId) {
    setLastResolvedHydrationId(selectedHydrationId);
    if (isEmptyHydrationId(selectedHydrationId)) {
      setLocalPrefill(null);
      setLocalPrefillSource('');
      setLocalPrefillApplied(false);
      setHydrationLoading(false);
    }
  }

  useEffect(() => {
    if (isEmptyHydrationId(selectedHydrationId)) return;

    const profile = hydrationProfiles.find(p => p.id === selectedHydrationId);
    if (!profile) return;

    let cancelled = false;
    setHydrationLoading(true);
    setLocalPrefillApplied(false);

    const loadProfilePrefill = async () => {
      const loadOne = async (url: string | undefined) => {
        if (!url) return null;
        const raw = await fetchLocalJson(url);
        return raw ? normalizeInvoicePrefill(raw) : null;
      };

      const receiptUrl = resolveLocalUrl(profile.receiptPrefill);
      const invoiceUrl = resolveLocalUrl(profile.invoicePrefill);
      const [receiptConfig, invoiceConfig] = await Promise.all([
        loadOne(receiptUrl),
        loadOne(invoiceUrl),
      ]);

      const mergedConfig = receiptConfig && invoiceConfig
        ? mergeInvoiceData(mergeInvoiceData(defaultValues, receiptConfig), invoiceConfig)
        : (invoiceConfig ?? receiptConfig);

      if (cancelled) return;

      setLocalPrefill(mergedConfig);
      setLocalPrefillSource(
        mergedConfig
          ? describeHydrationSources(profile, {
              receipt: Boolean(receiptConfig),
              invoice: Boolean(invoiceConfig),
            })
          : ''
      );
    };

    loadProfilePrefill().finally(() => {
      if (!cancelled) setHydrationLoading(false);
    });

    return () => { cancelled = true; };
  }, [selectedHydrationId, hydrationProfiles]);

  const applyLocalPrefill = () => {
    if (!localPrefill) return;
    reset(mergeInvoiceData(defaultValues, localPrefill));
    setPreviewData(null);
    setLocalPrefillApplied(true);
  };

  const resetFromHydration = () => {
    reset({
      ...defaultValues,
      invoiceNumber: generateInvoiceNumber(),
      receiptNumber: '',
      invoiceDate: format(new Date(), 'yyyy-MM-dd'),
      dueDate: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    });
    setPreviewData(null);
    setLocalPrefillApplied(false);
  };

  /**
   * Sanitize all numeric fields before rendering the PDF.
   * Form inputs with valueAsNumber can produce NaN when cleared;
   * this guarantees the renderer only sees finite numbers (or undefined
   * where undefined is a meaningful "fall back to default" signal).
   */
  const sanitize = (data: InvoiceData): InvoiceData => ({
    ...data,
    receiptNumber: isReceiptDocument(data.invoiceTitle) ? (data.receiptNumber ?? '') : '',
    lineItems: data.lineItems.map((it) => ({
      ...it,
      quantity:      num(it.quantity),
      unitPrice:     num(it.unitPrice),
      discountValue: num(it.discountValue),
      taxRate:       num(it.taxRate),
    })),
    adjustments: {
      ...data.adjustments,
      shipping:                num(data.adjustments?.shipping),
      additionalDiscountValue: num(data.adjustments?.additionalDiscountValue),
    },
    amountPaid: Number.isFinite(data.amountPaid) ? data.amountPaid : undefined,
    paymentHistory: data.renderPaymentHistory
      ? (data.paymentHistory ?? []).map((p) => ({
          ...p,
          cardBrand: p.cardBrand ?? '',
          cardLast4: p.cardLast4 ?? '',
          paymentMethod: p.cardBrand
            ? `${getStripeCardAsset(p.cardBrand).label}${p.cardLast4 ? ` - ${p.cardLast4}` : ''}`
            : (p.paymentMethod ?? ''),
          amountPaid: num(p.amountPaid),
        }))
      : [],
    fileDownloads: {
      invoiceUrl: data.fileDownloads?.invoiceUrl?.trim() ?? '',
      receiptUrl: data.fileDownloads?.receiptUrl?.trim() ?? '',
    },
  });

  const handlePreview = handleSubmit((data: InvoiceData) => {
    setPreviewData(sanitize(data));
    setShowPreview(true);
  });

  const handleDownload = useCallback(async () => {
    if (!previewData) return;
    setDownloading(true);
    try {
      const ReactPDF = await import('@react-pdf/renderer');
      const React = await import('react');
      const docModule = previewData.layoutStyle === 'clean'
        ? await import('@/components/pdf/CleanReceiptDocument')
        : await import('@/components/pdf/InvoiceDocument');
      const DocComponent = docModule.default;
      const element = React.createElement(DocComponent, { data: previewData });
      // @ts-expect-error: react-pdf element type differs from React.ReactElement
      const blob = await ReactPDF.pdf(element).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${previewData.invoiceTitle.replace(/\s+/g, '-')}-${previewData.invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }, [previewData]);

  const handleReset = () => {
    if (!confirm('Reset the form? All entered data will be cleared.')) return;
    (Object.keys(defaultValues) as Array<keyof InvoiceData>).forEach((key) => {
      setValue(key, defaultValues[key] as never);
    });
    setValue('invoiceNumber', generateInvoiceNumber());
    setValue('receiptNumber', isReceiptDocument(getValues('invoiceTitle')) ? generateReceiptNumber() : '');
    setValue('invoiceDate', format(new Date(), 'yyyy-MM-dd'));
    setValue('dueDate', format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  };

  const layoutStyle = useWatch({ control, name: 'layoutStyle' });
  const paymentCardBrand = useWatch({ control, name: 'paymentInfo.cardBrand' });
  const isClean = layoutStyle === 'clean';

  return (
    <>
      <form onSubmit={handlePreview} className="flex flex-col gap-6">
        {(hydrationProfiles.length > 0 || hydrationLoading) && (
          <LocalHydrationPanel
            profiles={hydrationProfiles}
            selectedId={selectedHydrationId}
            onSelectedIdChange={setSelectedHydrationId}
            sourceDescription={localPrefillSource}
            hasData={Boolean(localPrefill)}
            loading={hydrationLoading}
            applied={localPrefillApplied}
            onApply={applyLocalPrefill}
            onReset={resetFromHydration}
            title="Local invoice hydration available"
          />
        )}

        {/* Section Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="flex flex-col gap-6">
            <InvoiceDetailsSection register={register} setValue={setValue} errors={errors} />
            <BusinessInfoSection register={register} control={control as never} errors={errors} setValue={setValue} />
            {!isClean && <PaymentInfoSection register={register} cardBrand={paymentCardBrand} />}
          </div>
          <div className="flex flex-col gap-6">
            <CustomerInfoSection register={register} control={control as never} errors={errors} />
            <CustomizationSection register={register} watch={watch} setValue={setValue} />
            <ReceiptDetailsSection
              register={register}
              watch={watch}
              setValue={setValue}
              control={control as never}
            />

            <NotesSection register={register} />
          </div>
        </div>

        {/* Line Items - Full Width */}
        <LineItemsSection control={control as never} register={register} watch={watch} setValue={setValue} />
        <AdjustmentsSection register={register} watch={watch} setValue={setValue} />
        <FileDownloadsSection register={register} />

        {/* Action Bar */}
        <div className="sticky bottom-0 left-0 right-0 flex items-center justify-between gap-4 rounded-2xl border border-gray-100 bg-white/90 px-6 py-4 shadow-lg backdrop-blur-md">
          <Button type="button" variant="ghost" size="md" onClick={handleReset}>
            Reset Form
          </Button>
          <div className="flex items-center gap-3">
            <p className="text-xs text-gray-400 hidden sm:block">
              All data stays in your browser — nothing is stored on any server.
            </p>
            <Button
              type="submit"
              variant="primary"
              size="lg"
              icon={
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.58-3.007-9.964-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              }
            >
              Preview & Download PDF
            </Button>
          </div>
        </div>
      </form>

      {showPreview && previewData && (
        <InvoicePreviewModal
          data={previewData}
          onClose={() => setShowPreview(false)}
          onDownload={handleDownload}
          downloading={downloading}
        />
      )}
    </>
  );
}
