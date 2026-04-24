'use client';

import { UseFormRegister, UseFormSetValue, FieldErrors } from 'react-hook-form';
import { InvoiceData } from '@/types/invoice';
import Card from '@/components/ui/Card';
import FormField from '@/components/ui/FormField';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import Button from '@/components/ui/Button';
import { generateInvoiceNumber, CURRENCIES } from '@/lib/invoice-utils';
import { format, addDays } from 'date-fns';

interface Props {
  register: UseFormRegister<InvoiceData>;
  setValue: UseFormSetValue<InvoiceData>;
  errors: FieldErrors<InvoiceData>;
}

const titleOptions = [
  { value: 'Invoice', label: 'Invoice' },
  { value: 'Tax Invoice', label: 'Tax Invoice' },
  { value: 'Quote', label: 'Quote' },
  { value: 'Receipt', label: 'Receipt' },
  { value: 'Credit Note', label: 'Credit Note' },
  { value: 'Proforma Invoice', label: 'Proforma Invoice' },
];

const NET_OPTIONS = [
  { value: '7', label: 'Net 7' },
  { value: '14', label: 'Net 14' },
  { value: '30', label: 'Net 30' },
  { value: '45', label: 'Net 45' },
  { value: '60', label: 'Net 60' },
  { value: '90', label: 'Net 90' },
];

export default function InvoiceDetailsSection({ register, setValue, errors }: Props) {
  function handleNetDays(days: string) {
    const due = addDays(new Date(), parseInt(days));
    setValue('dueDate', format(due, 'yyyy-MM-dd'));
  }

  return (
    <Card title="Invoice Details">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Document Type" required>
            <Select
              {...register('invoiceTitle')}
              options={titleOptions}
            />
          </FormField>
          <FormField label="Currency" required>
            <Select
              {...register('currency')}
              options={CURRENCIES}
            />
          </FormField>
        </div>

        <FormField
          label="Invoice Number"
          required
          error={errors.invoiceNumber?.message}
          hint="Auto-generated or enter manually"
        >
          <div className="flex gap-2">
            <Input
              {...register('invoiceNumber')}
              placeholder="INV-2026-0001"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setValue('invoiceNumber', generateInvoiceNumber())}
            >
              Auto
            </Button>
          </div>
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Invoice Date" required error={errors.invoiceDate?.message}>
            <Input type="date" {...register('invoiceDate')} />
          </FormField>
          <FormField label="Due Date" required error={errors.dueDate?.message}>
            <div className="flex flex-col gap-1.5">
              <Input type="date" {...register('dueDate')} />
              <div className="flex gap-1 flex-wrap">
                {NET_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleNetDays(opt.value)}
                    className="px-2 py-0.5 text-xs rounded border border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="PO / Purchase Order Number" htmlFor="poNumber">
            <Input id="poNumber" {...register('poNumber')} placeholder="PO-2026-001" />
          </FormField>
          <FormField label="Reference / Project" htmlFor="reference">
            <Input id="reference" {...register('reference')} placeholder="Project Alpha" />
          </FormField>
        </div>
      </div>
    </Card>
  );
}
