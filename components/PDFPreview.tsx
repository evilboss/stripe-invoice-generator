'use client';

import { usePDF } from '@react-pdf/renderer';
import InvoiceDocument from './pdf/InvoiceDocument';
import CleanReceiptDocument from './pdf/CleanReceiptDocument';
import { InvoiceData } from '@/types/invoice';

export default function PDFPreview({ data }: { data: InvoiceData }) {
  const doc = data.layoutStyle === 'clean'
    ? <CleanReceiptDocument data={data} />
    : <InvoiceDocument data={data} />;

  const [instance] = usePDF({ document: doc });

  if (instance.loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        Generating preview…
      </div>
    );
  }
  if (instance.error) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400 text-sm">
        Preview error: {instance.error}
      </div>
    );
  }

  return (
    <iframe
      src={instance.url ?? undefined}
      className="w-full h-full border-none"
      title="Invoice Preview"
    />
  );
}
