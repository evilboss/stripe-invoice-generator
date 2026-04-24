'use client';

import { UseFormRegister, UseFormWatch, UseFormSetValue, Control, useFieldArray } from 'react-hook-form';
import { InvoiceData } from '@/types/invoice';
import { newPaymentHistoryEntry, generateReceiptNumber } from '@/lib/invoice-utils';
import Card from '@/components/ui/Card';
import FormField from '@/components/ui/FormField';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';

interface Props {
  register: UseFormRegister<InvoiceData>;
  watch: UseFormWatch<InvoiceData>;
  setValue: UseFormSetValue<InvoiceData>;
  control: Control<InvoiceData>;
}

export default function ReceiptDetailsSection({ register, watch, setValue, control }: Props) {
  const currency = watch('currency') || 'USD';

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'paymentHistory',
  });

  return (
    <Card
      title="Receipt & Payment History"
      subtitle="Receipt number, amount paid, and payment history rows (shown on both layouts)"
    >
      <div className="flex flex-col gap-5">
        {/* Receipt number + Date paid */}
        <div className="grid grid-cols-2 gap-4">
          <FormField
            label="Receipt Number"
            hint="Optional — click Auto to generate a Stripe-style number"
          >
            <div className="flex gap-2">
              <Input
                {...register('receiptNumber')}
                placeholder="2247-1223-8255"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setValue('receiptNumber', generateReceiptNumber(), {
                    shouldDirty: true,
                  })
                }
              >
                Auto
              </Button>
            </div>
          </FormField>

          <FormField
            label="Date Paid"
            hint="Defaults to Invoice Date if blank"
          >
            <Input
              type="date"
              {...register('datePaid')}
            />
          </FormField>
        </div>

        {/* Amount paid override */}
        <FormField
          label="Amount Paid Override"
          hint="Leave blank to use the computed grand total"
        >
          <Input
            type="number"
            step="any"
            min="0"
            {...register('amountPaid', {
              // Empty → undefined (not NaN), valid number → number.
              // This lets `??` fallback work correctly in the PDF.
              setValueAs: (v) => {
                if (v === '' || v === null || v === undefined) return undefined;
                const n = typeof v === 'number' ? v : parseFloat(v);
                return Number.isFinite(n) ? n : undefined;
              },
            })}
            placeholder="Auto (grand total)"
            prefix={currency}
          />
        </FormField>

        {/* Payment history table */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-gray-700">Payment History</p>
              <p className="text-xs text-gray-400">Shown in the "Payment history" table at the bottom of the PDF</p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append(newPaymentHistoryEntry())}
            >
              + Add Row
            </Button>
          </div>

          {fields.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 py-6 flex items-center justify-center text-xs text-gray-400">
              No payment history rows yet — click "Add Row" to add one
            </div>
          )}

          {fields.map((field, index) => (
            <div
              key={field.id}
              className="grid grid-cols-[1fr_140px_140px_140px_32px] gap-2 items-start mb-3"
            >
              <FormField label={index === 0 ? 'Payment Method' : undefined}>
                <Input
                  {...register(`paymentHistory.${index}.paymentMethod`)}
                  placeholder="Visa - 7058"
                />
              </FormField>
              <FormField label={index === 0 ? 'Date' : undefined}>
                <Input
                  type="date"
                  {...register(`paymentHistory.${index}.date`)}
                />
              </FormField>
              <FormField label={index === 0 ? 'Amount Paid' : undefined}>
                <Input
                  type="number"
                  step="any"
                  min="0"
                  {...register(`paymentHistory.${index}.amountPaid`, {
                    // Empty → 0 (not NaN). Row-level amounts always display,
                    // so 0 is a safer fallback than undefined here.
                    setValueAs: (v) => {
                      if (v === '' || v === null || v === undefined) return 0;
                      const n = typeof v === 'number' ? v : parseFloat(v);
                      return Number.isFinite(n) ? n : 0;
                    },
                  })}
                  placeholder="0.00"
                />
              </FormField>
              <FormField label={index === 0 ? 'Receipt Number' : undefined}>
                <Input
                  {...register(`paymentHistory.${index}.receiptNumber`)}
                  placeholder="2262-7779"
                />
              </FormField>
              <div className={index === 0 ? 'pt-6' : ''}>
                <button
                  type="button"
                  onClick={() => remove(index)}
                  className="w-8 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                  title="Remove row"
                >
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
