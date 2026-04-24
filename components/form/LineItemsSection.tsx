'use client';

import { useFieldArray, Control, UseFormRegister, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { InvoiceData, LineItem } from '@/types/invoice';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import {
  computeLineItemSubtotal,
  computeLineItemTax,
  computeLineItemDiscount,
  formatCurrency,
  newLineItem,
} from '@/lib/invoice-utils';

interface Props {
  control: Control<InvoiceData>;
  register: UseFormRegister<InvoiceData>;
  watch: UseFormWatch<InvoiceData>;
  setValue: UseFormSetValue<InvoiceData>;
}

const discountTypeOptions = [
  { value: 'percentage', label: '%' },
  { value: 'fixed', label: '$' },
];

const TAX_PRESETS = [0, 5, 8, 10, 13, 15, 20];

function LineItemRow({
  index,
  item,
  register,
  watch,
  setValue,
  onRemove,
  currency,
}: {
  index: number;
  item: LineItem;
  register: UseFormRegister<InvoiceData>;
  watch: UseFormWatch<InvoiceData>;
  setValue: UseFormSetValue<InvoiceData>;
  onRemove: () => void;
  currency: string;
}) {
  const watched = watch(`lineItems.${index}`);
  const subtotal = computeLineItemSubtotal(watched || item);
  const tax = computeLineItemTax(watched || item);
  const discount = computeLineItemDiscount(watched || item);
  const total = subtotal + tax;

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          Item {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          className="text-red-400 hover:text-red-600 text-xs flex items-center gap-1 transition"
        >
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
          Remove
        </button>
      </div>

      {/* Name & Description */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Item Name *</label>
          <Input
            {...register(`lineItems.${index}.name`)}
            placeholder="Service or Product Name"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Description</label>
          <Input
            {...register(`lineItems.${index}.description`)}
            placeholder="Optional details"
          />
        </div>
      </div>

      {/* Qty, Unit, Price */}
      <div className="grid grid-cols-4 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Quantity</label>
          <Input
            type="number"
            step="any"
            min="0"
            {...register(`lineItems.${index}.quantity`, { valueAsNumber: true })}
            placeholder="1"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Unit</label>
          <Input
            {...register(`lineItems.${index}.unit`)}
            placeholder="hrs / pcs / kg"
          />
        </div>
        <div className="col-span-2 flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Unit Price</label>
          <Input
            type="number"
            step="any"
            min="0"
            {...register(`lineItems.${index}.unitPrice`, { valueAsNumber: true })}
            placeholder="0.00"
            prefix={currency}
          />
        </div>
      </div>

      {/* Discount & Tax */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Discount</label>
          <div className="flex gap-2">
            <div className="w-20 flex-shrink-0">
              <Select
                {...register(`lineItems.${index}.discountType`)}
                options={discountTypeOptions}
              />
            </div>
            <Input
              type="number"
              step="any"
              min="0"
              {...register(`lineItems.${index}.discountValue`, { valueAsNumber: true })}
              placeholder="0"
            />
          </div>
          {discount > 0 && (
            <span className="text-xs text-orange-500">
              −{formatCurrency(discount, currency)}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-gray-600">Tax Rate (%)</label>
          <div className="flex flex-col gap-1">
            <Input
              type="number"
              step="any"
              min="0"
              max="100"
              {...register(`lineItems.${index}.taxRate`, { valueAsNumber: true })}
              placeholder="0"
              suffix="%"
            />
            <div className="flex gap-1 flex-wrap">
              {TAX_PRESETS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() =>
                    setValue(`lineItems.${index}.taxRate`, t, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  className="px-2 py-0.5 text-xs rounded border border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition"
                >
                  {t}%
                </button>
              ))}
            </div>
          </div>
          {tax > 0 && (
            <span className="text-xs text-blue-500">
              Tax: {formatCurrency(tax, currency)}
            </span>
          )}
        </div>
      </div>

      {/* Row Total */}
      <div className="flex justify-end border-t border-gray-200 pt-2">
        <div className="text-right">
          <span className="text-xs text-gray-400">Line Total: </span>
          <span className="text-sm font-semibold text-gray-800">{formatCurrency(total, currency)}</span>
        </div>
      </div>
    </div>
  );
}

export default function LineItemsSection({ control, register, watch, setValue }: Props) {
  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });
  const currency = watch('currency') || 'USD';
  const taxLabel = watch('taxLabel') || 'Tax';

  /** Apply a single tax rate to every line item. Common VAT workflow. */
  const applyTaxToAll = (rate: number) => {
    fields.forEach((_, i) =>
      setValue(`lineItems.${i}.taxRate`, rate, { shouldDirty: true }),
    );
  };

  return (
    <Card
      title="Line Items"
      subtitle="Products, services, and quantities"
      action={
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append(newLineItem())}
          icon={
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          }
        >
          Add Item
        </Button>
      }
    >
      <div className="flex flex-col gap-3">
        {fields.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-400">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 14.25l6-6m4.5-3.493V21.75l-3.75-1.5-3.75 1.5-3.75-1.5-3.75 1.5V4.757c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0c1.1.128 1.907 1.077 1.907 2.185z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">No items yet</p>
              <p className="text-xs text-gray-400 mt-0.5">Click "Add Item" to add your first line item</p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => append(newLineItem())}
            >
              Add First Item
            </Button>
          </div>
        )}

        {fields.map((field, index) => (
          <LineItemRow
            key={field.id}
            index={index}
            item={field}
            register={register}
            watch={watch}
            setValue={setValue}
            onRemove={() => remove(index)}
            currency={currency}
          />
        ))}

        {/* Apply VAT/tax to all items at once */}
        {fields.length > 1 && (
          <div className="flex items-center gap-2 flex-wrap px-1">
            <span className="text-xs text-gray-500">Apply {taxLabel} to all:</span>
            {TAX_PRESETS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => applyTaxToAll(t)}
                className="px-2 py-0.5 text-xs rounded border border-gray-200 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition"
              >
                {t}%
              </button>
            ))}
          </div>
        )}

        {fields.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="self-start"
            onClick={() => append(newLineItem())}
            icon={
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            }
          >
            Add Another Item
          </Button>
        )}
      </div>
    </Card>
  );
}
