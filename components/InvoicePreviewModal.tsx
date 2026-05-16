'use client';

import dynamic from 'next/dynamic';
import { InvoiceData } from '@/types/invoice';
import Button from '@/components/ui/Button';

const PDFPreview = dynamic(() => import('@/components/PDFPreview'), {
  ssr: false,
  loading: () => (
    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
      Loading preview…
    </div>
  ),
});

interface Props {
  data: InvoiceData;
  onClose: () => void;
  onDownload: () => void;
  downloading: boolean;
}

export default function InvoicePreviewModal({ data, onClose, onDownload, downloading }: Props) {
  const fileLinks = [
    { label: 'Invoice File', url: data.fileDownloads?.invoiceUrl },
    { label: 'Receipt File', url: data.fileDownloads?.receiptUrl },
  ].filter((link): link is { label: string; url: string } => Boolean(link.url));

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gray-900/70 backdrop-blur-sm">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#1C2434] shadow-lg flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
          <span className="text-white font-semibold text-sm">PDF Preview</span>
          <span className="text-gray-400 text-xs">· {data.invoiceNumber}</span>
        </div>
        <div className="flex items-center gap-3">
          {fileLinks.map((link) => (
            <a
              key={link.label}
              href={link.url}
              download
              target="_blank"
              rel="noreferrer"
              className="hidden rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-gray-200 transition hover:border-white/20 hover:bg-white/10 sm:inline-flex"
            >
              {link.label}
            </a>
          ))}
          <Button
            variant="primary"
            size="sm"
            loading={downloading}
            onClick={onDownload}
            icon={
              !downloading ? (
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              ) : undefined
            }
          >
            Download PDF
          </Button>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition p-1.5 rounded-lg hover:bg-gray-700"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-hidden">
        <PDFPreview data={data} />
      </div>
    </div>
  );
}
