'use client';

import { UseFormRegister } from 'react-hook-form';
import { InvoiceData } from '@/types/invoice';
import Card from '@/components/ui/Card';
import FormField from '@/components/ui/FormField';
import Textarea from '@/components/ui/Textarea';
import Input from '@/components/ui/Input';

interface Props {
  register: UseFormRegister<InvoiceData>;
}

export default function NotesSection({ register }: Props) {
  return (
    <Card title="Notes, Terms & Footer" subtitle="Additional text printed on the invoice">
      <div className="flex flex-col gap-4">
        <FormField
          label="Notes to Customer"
          hint="Thank-you message, delivery info, or custom message"
        >
          <Textarea
            {...register('notes')}
            rows={3}
            placeholder="Thank you for your business! Payment is due within 30 days."
          />
        </FormField>

        <FormField
          label="Terms & Conditions"
          hint="Late fees, refund policy, legal terms"
        >
          <Textarea
            {...register('terms')}
            rows={3}
            placeholder="Payments are due within the specified period. Late payments may incur a 1.5% monthly fee..."
          />
        </FormField>

        <FormField
          label="Footer Text"
          hint="Appears at the bottom of every page — company tagline, website, etc."
        >
          <Input
            {...register('footerText')}
            placeholder="Acme Corp · www.acme.com · billing@acme.com"
          />
        </FormField>
      </div>
    </Card>
  );
}
