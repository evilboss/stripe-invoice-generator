'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { format, addDays } from 'date-fns';
import dynamic from 'next/dynamic';
import { InvoiceData } from '@/types/invoice';
import { generateInvoiceNumber, generateReceiptNumber, newLineItem, num } from '@/lib/invoice-utils';
import BusinessInfoSection from '@/components/form/BusinessInfoSection';
import CustomerInfoSection from '@/components/form/CustomerInfoSection';
import InvoiceDetailsSection from '@/components/form/InvoiceDetailsSection';
import LineItemsSection from '@/components/form/LineItemsSection';
import AdjustmentsSection from '@/components/form/AdjustmentsSection';
import PaymentInfoSection from '@/components/form/PaymentInfoSection';
import NotesSection from '@/components/form/NotesSection';
import CustomizationSection from '@/components/form/CustomizationSection';
import ReceiptDetailsSection from '@/components/form/ReceiptDetailsSection';
import Button from '@/components/ui/Button';

const InvoicePreviewModal = dynamic(() => import('@/components/InvoicePreviewModal'), { ssr: false });

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
  notes: '',
  terms: '',
  footerText: '',
  taxLabel: 'Tax',
  taxCountry: '',
  layoutStyle: 'modern',
  receiptNumber: generateReceiptNumber(),
  datePaid: '',
  amountPaid: undefined,
  paymentHistory: [],
  primaryColor: '#635BFF',
  accentColor: '#00D4FF',
  headerTextColor: '#ffffff',
};

export default function InvoiceForm() {
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<InvoiceData | null>(null);
  const [downloading, setDownloading] = useState(false);

  const { register, control, watch, setValue, handleSubmit, formState: { errors } } = useForm<InvoiceData>({
    defaultValues,
    mode: 'onChange',
  });

  /**
   * Sanitize all numeric fields before rendering the PDF.
   * Form inputs with valueAsNumber can produce NaN when cleared;
   * this guarantees the renderer only sees finite numbers (or undefined
   * where undefined is a meaningful "fall back to default" signal).
   */
  const sanitize = (data: InvoiceData): InvoiceData => ({
    ...data,
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
    paymentHistory: (data.paymentHistory ?? []).map((p) => ({
      ...p,
      amountPaid: num(p.amountPaid),
    })),
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
    setValue('receiptNumber', generateReceiptNumber());
    setValue('invoiceDate', format(new Date(), 'yyyy-MM-dd'));
    setValue('dueDate', format(addDays(new Date(), 30), 'yyyy-MM-dd'));
  };

  const isClean = watch('layoutStyle') === 'clean';

  return (
    <>
      <form onSubmit={handlePreview} className="flex flex-col gap-6">
        {/* Section Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="flex flex-col gap-6">
            <InvoiceDetailsSection register={register} setValue={setValue} errors={errors} />
            <BusinessInfoSection register={register} control={control as never} errors={errors} setValue={setValue} />
            {!isClean && <PaymentInfoSection register={register} cardBrand={watch('paymentInfo.cardBrand')} />}
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
