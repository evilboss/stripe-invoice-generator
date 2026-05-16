'use client';

import { UseFormRegister } from 'react-hook-form';
import { InvoiceData } from '@/types/invoice';
import Card from '@/components/ui/Card';
import FormField from '@/components/ui/FormField';
import Input from '@/components/ui/Input';

interface Props {
  register: UseFormRegister<InvoiceData>;
}

export default function FileDownloadsSection({ register }: Props) {
  return (
    <Card title="Invoice & Receipt Files" subtitle="Optional public S3 URLs for downloadable files">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          label="Invoice File URL"
          hint="Public S3 URL for the invoice file"
        >
          <Input
            type="url"
            inputMode="url"
            {...register('fileDownloads.invoiceUrl')}
            placeholder="https://bucket.s3.amazonaws.com/invoice.pdf"
          />
        </FormField>

        <FormField
          label="Receipt File URL"
          hint="Public S3 URL for the receipt file"
        >
          <Input
            type="url"
            inputMode="url"
            {...register('fileDownloads.receiptUrl')}
            placeholder="https://bucket.s3.amazonaws.com/receipt.pdf"
          />
        </FormField>
      </div>
    </Card>
  );
}
