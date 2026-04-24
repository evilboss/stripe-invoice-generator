'use client';

import { UseFormRegister, UseFormWatch, UseFormSetValue } from 'react-hook-form';
import { InvoiceData } from '@/types/invoice';
import Card from '@/components/ui/Card';
import FormField from '@/components/ui/FormField';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { computeTotals, formatCurrency } from '@/lib/invoice-utils';

interface Props {
  register: UseFormRegister<InvoiceData>;
  watch: UseFormWatch<InvoiceData>;
  setValue: UseFormSetValue<InvoiceData>;
}

/** One-click VAT jurisdictions — sets label, country, and rate on every line. */
const VAT_PRESETS: Array<{ label: string; taxLabel: string; country: string; rate: number }> = [
  { label: 'UK VAT 20%',      taxLabel: 'VAT', country: 'United Kingdom', rate: 20 },
  { label: 'EU VAT 19% (DE)', taxLabel: 'VAT', country: 'Germany',        rate: 19 },
  { label: 'EU VAT 20% (FR)', taxLabel: 'VAT', country: 'France',         rate: 20 },
  { label: 'EU VAT 21% (NL)', taxLabel: 'VAT', country: 'Netherlands',    rate: 21 },
  { label: 'AU GST 10%',      taxLabel: 'GST', country: 'Australia',      rate: 10 },
  { label: 'NZ GST 15%',      taxLabel: 'GST', country: 'New Zealand',    rate: 15 },
  { label: 'SG GST 9%',       taxLabel: 'GST', country: 'Singapore',      rate: 9  },
  { label: 'CA HST 13% (ON)', taxLabel: 'HST', country: 'Canada',         rate: 13 },
  { label: 'PH VAT 12%',      taxLabel: 'VAT', country: 'Philippines',    rate: 12 },
  { label: 'No tax',          taxLabel: 'Tax', country: '',               rate: 0  },
];

const discountTypeOptions = [
  { value: 'percentage', label: '% Percent' },
  { value: 'fixed', label: '$ Fixed Amount' },
];

const taxLabelOptions = [
  { value: 'Tax', label: 'Tax (generic)' },
  { value: 'VAT', label: 'VAT — Value Added Tax' },
  { value: 'GST', label: 'GST — Goods & Services Tax' },
  { value: 'HST', label: 'HST — Harmonized Sales Tax' },
  { value: 'PST', label: 'PST — Provincial Sales Tax' },
  { value: 'Sales Tax', label: 'Sales Tax' },
  { value: 'Service Tax', label: 'Service Tax' },
];

export default function AdjustmentsSection({ register, watch, setValue }: Props) {
  const data = watch();
  const totals = computeTotals(data);
  const currency = data.currency || 'USD';

  const applyVatPreset = (preset: typeof VAT_PRESETS[number]) => {
    setValue('taxLabel',   preset.taxLabel, { shouldDirty: true });
    setValue('taxCountry', preset.country,  { shouldDirty: true });
    (data.lineItems || []).forEach((_, i) =>
      setValue(`lineItems.${i}.taxRate`, preset.rate, { shouldDirty: true }),
    );
  };

  return (
    <Card title="Adjustments & Totals" subtitle="Invoice-level discounts, shipping, and summary">
      <div className="flex flex-col gap-5">
        {/* VAT / Tax jurisdiction presets */}
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Tax Jurisdiction Presets</p>
          <div className="flex flex-wrap gap-1.5">
            {VAT_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => applyVatPreset(p)}
                className="px-2.5 py-1 text-xs rounded-md border border-gray-200 text-gray-600 hover:border-blue-400 hover:text-blue-600 transition"
              >
                {p.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-1.5">
            Applies tax label, country, and rate to all line items
          </p>
        </div>

        {/* Tax Type */}
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Tax Type" hint="Label shown on invoice and PDF">
            <Select
              {...register('taxLabel')}
              options={taxLabelOptions}
            />
          </FormField>
          <FormField label="Tax Country" hint='Optional — shown as "VAT - United Kingdom"'>
            <Input
              {...register('taxCountry')}
              placeholder="e.g. United Kingdom"
            />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Shipping & Handling" hint="Added to the invoice total">
            <Input
              type="number"
              step="any"
              min="0"
              {...register('adjustments.shipping', { valueAsNumber: true })}
              placeholder="0.00"
              prefix={currency}
            />
          </FormField>

          <FormField label="Additional Discount" hint="Applied after line-item discounts">
            <div className="flex gap-2">
              <div className="w-36 flex-shrink-0">
                <Select
                  {...register('adjustments.additionalDiscountType')}
                  options={discountTypeOptions}
                />
              </div>
              <Input
                type="number"
                step="any"
                min="0"
                {...register('adjustments.additionalDiscountValue', { valueAsNumber: true })}
                placeholder="0"
              />
            </div>
          </FormField>
        </div>

        {/* Summary Table */}
        <div className="rounded-xl bg-gray-50 border border-gray-100 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-white">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Live Summary</h4>
          </div>
          <div className="px-5 py-4 flex flex-col gap-2">
            <SummaryRow label="Subtotal" value={formatCurrency(totals.subtotal, currency)} />
            {totals.totalItemDiscounts > 0 && (
              <SummaryRow
                label="Item Discounts"
                value={`−${formatCurrency(totals.totalItemDiscounts, currency)}`}
                valueClass="text-orange-500"
              />
            )}
            {totals.additionalDiscount > 0 && (
              <SummaryRow
                label="Additional Discount"
                value={`−${formatCurrency(totals.additionalDiscount, currency)}`}
                valueClass="text-orange-500"
              />
            )}
            {totals.totalTax > 0 && (
              <SummaryRow
                label={data.taxCountry ? `${data.taxLabel} — ${data.taxCountry}` : (data.taxLabel || 'Tax')}
                value={formatCurrency(totals.totalTax, currency)}
              />
            )}
            {totals.shipping > 0 && (
              <SummaryRow label="Shipping & Handling" value={formatCurrency(totals.shipping, currency)} />
            )}
            <div className="border-t border-gray-200 pt-2 mt-1">
              <SummaryRow
                label={`Total Due (${currency})`}
                value={formatCurrency(totals.grandTotal, currency)}
                isFinal
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SummaryRow({
  label,
  value,
  valueClass = 'text-gray-800',
  isFinal = false,
}: {
  label: string;
  value: string;
  valueClass?: string;
  isFinal?: boolean;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className={`text-sm ${isFinal ? 'font-semibold text-gray-800' : 'text-gray-500'}`}>
        {label}
      </span>
      <span className={`text-sm font-semibold ${isFinal ? 'text-[#3C50E0] text-base' : valueClass}`}>
        {value}
      </span>
    </div>
  );
}
