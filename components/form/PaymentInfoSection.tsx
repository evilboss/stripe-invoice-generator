'use client';

import { UseFormRegister } from 'react-hook-form';
import { InvoiceData } from '@/types/invoice';
import Card from '@/components/ui/Card';
import FormField from '@/components/ui/FormField';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PAYMENT_METHODS } from '@/lib/invoice-utils';

interface Props {
  register: UseFormRegister<InvoiceData>;
}

const methodOptions = PAYMENT_METHODS.map((m) => ({ value: m, label: m }));

export default function PaymentInfoSection({ register }: Props) {
  return (
    <Card title="Payment Information" subtitle="Bank details and payment links shown on the invoice">
      <div className="grid grid-cols-1 gap-4">
        <FormField label="Payment Method" hint="e.g. Bank Transfer, Credit Card, PayPal">
          <Select
            {...register('paymentInfo.method')}
            options={methodOptions}
            placeholder="Select method"
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Bank Name">
            <Input {...register('paymentInfo.bankName')} placeholder="Chase Bank" />
          </FormField>
          <FormField label="Account Name">
            <Input {...register('paymentInfo.accountName')} placeholder="Acme Corp LLC" />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Account Number">
            <Input {...register('paymentInfo.accountNumber')} placeholder="000123456789" />
          </FormField>
          <FormField label="Routing Number (US)">
            <Input {...register('paymentInfo.routingNumber')} placeholder="021000021" />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="IBAN" hint="International Bank Account Number">
            <Input {...register('paymentInfo.iban')} placeholder="GB29 NWBK 6016 1331 9268 19" />
          </FormField>
          <FormField label="SWIFT / BIC">
            <Input {...register('paymentInfo.swift')} placeholder="CHASUS33" />
          </FormField>
        </div>

        <FormField label="Online Payment URL / Link" hint="Stripe, PayPal, or any payment link">
          <Input
            {...register('paymentInfo.paymentUrl')}
            placeholder="https://pay.stripe.com/..."
            type="url"
          />
        </FormField>
      </div>
    </Card>
  );
}
