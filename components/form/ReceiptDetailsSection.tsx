'use client';

import { useEffect } from 'react';
import { UseFormRegister, UseFormWatch, UseFormSetValue, Control, useFieldArray } from 'react-hook-form';
import { InvoiceData } from '@/types/invoice';
import { newPaymentHistoryEntry, generateReceiptNumber, isReceiptDocument } from '@/lib/invoice-utils';
import Card from '@/components/ui/Card';
import FormField from '@/components/ui/FormField';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { getStripeCardAsset, STRIPE_CARD_ASSETS } from '@/lib/stripe-card-assets';

interface Props {
  register: UseFormRegister<InvoiceData>;
  watch: UseFormWatch<InvoiceData>;
  setValue: UseFormSetValue<InvoiceData>;
  control: Control<InvoiceData>;
}

export default function ReceiptDetailsSection({ register, watch, setValue, control }: Props) {
  const currency = watch('currency') || 'USD';
  const invoiceTitle = watch('invoiceTitle');
  const isReceipt = isReceiptDocument(invoiceTitle);
  const renderPaymentHistory = watch('renderPaymentHistory') ?? false;
  const paymentHistory = watch('paymentHistory') ?? [];

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'paymentHistory',
  });

  const appendPaymentHistoryRow = () => {
    const row = newPaymentHistoryEntry();
    const cardBrand = watch('paymentInfo.cardBrand') || row.cardBrand || 'visa';
    const cardLast4 = watch('paymentInfo.cardLast4') || row.cardLast4 || '';

    append({
      ...row,
      cardBrand,
      cardLast4,
      paymentMethod: `${getStripeCardAsset(cardBrand).label}${cardLast4 ? ` - ${cardLast4}` : ''}`,
      amountPaid: watch('amountPaid') ?? 0,
      receiptNumber: isReceipt ? (watch('receiptNumber') || row.receiptNumber) : row.receiptNumber,
      date: watch('datePaid') || watch('invoiceDate') || row.date,
    });
  };

  useEffect(() => {
    if (!isReceipt) {
      setValue('receiptNumber', '', { shouldDirty: true });
    }
  }, [isReceipt, setValue]);

  return (
    <Card
      title="Receipt & Payment History"
      subtitle={
        isReceipt
          ? 'Receipt number, amount paid, and payment history rows (shown on both layouts)'
          : 'Amount paid and payment history — receipt number is only used for Receipt documents'
      }
    >
      <div className="flex flex-col gap-5">
        {/* Receipt number + Date paid */}
        <div className={`grid gap-4 ${isReceipt ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {isReceipt && (
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
          )}

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
        <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm font-medium text-gray-700">Payment History</p>
              <p className="text-xs text-gray-400">Optional table rendered at the bottom of the PDF</p>
            </div>
            <label className="flex items-center gap-2 text-xs font-medium text-gray-600">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 accent-[#635BFF]"
                {...register('renderPaymentHistory')}
              />
              Render
            </label>
          </div>

          {renderPaymentHistory ? (
            <div className="mt-4 space-y-3">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={appendPaymentHistoryRow}
                >
                  + Add Row
                </Button>
              </div>

              {fields.length === 0 && (
                <div className="rounded-xl border border-dashed border-gray-200 bg-white py-6 flex items-center justify-center text-xs text-gray-400">
                  No payment history rows yet — click "Add Row" to add one
                </div>
              )}

              {fields.map((field, index) => {
                const cardBrand = paymentHistory[index]?.cardBrand || 'visa';
                const selectedCard = getStripeCardAsset(cardBrand);

                return (
                  <div
                    key={field.id}
                    className="rounded-xl border border-gray-100 bg-white p-3"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-500">Payment {index + 1}</span>
                        <img
                          src={selectedCard.url}
                          alt={selectedCard.label}
                          width={selectedCard.width}
                          height={selectedCard.height}
                          className="h-4 w-auto"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition"
                        title="Remove row"
                      >
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-[minmax(150px,1fr)_110px_150px_140px_150px] gap-3 items-start">
                      <FormField label="Card">
                        <Select
                          {...register(`paymentHistory.${index}.cardBrand`)}
                          options={STRIPE_CARD_ASSETS.map((asset) => ({ value: asset.value, label: asset.label }))}
                        />
                      </FormField>
                      <FormField label="Last 4">
                        <Input
                          {...register(`paymentHistory.${index}.cardLast4`)}
                          placeholder="1349"
                          inputMode="numeric"
                          maxLength={4}
                        />
                      </FormField>
                      <FormField label="Date">
                        <Input
                          type="date"
                          {...register(`paymentHistory.${index}.date`)}
                        />
                      </FormField>
                      <FormField label="Amount Paid">
                        <Input
                          type="number"
                          step="any"
                          min="0"
                          {...register(`paymentHistory.${index}.amountPaid`, {
                            setValueAs: (v) => {
                              if (v === '' || v === null || v === undefined) return 0;
                              const n = typeof v === 'number' ? v : parseFloat(v);
                              return Number.isFinite(n) ? n : 0;
                            },
                          })}
                          placeholder="0.00"
                        />
                      </FormField>
                      <FormField label="Receipt Number">
                        <Input
                          {...register(`paymentHistory.${index}.receiptNumber`)}
                          placeholder="2887-3995"
                        />
                      </FormField>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="mt-4 rounded-xl border border-dashed border-gray-200 bg-white py-5 px-4 text-xs text-gray-400"
            >
              Enable this to include a payment-history table with card, date, amount, and receipt number.
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
