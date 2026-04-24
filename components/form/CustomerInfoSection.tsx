'use client';

import { UseFormRegister, Control, FieldErrors, useWatch } from 'react-hook-form';
import { InvoiceData } from '@/types/invoice';
import Card from '@/components/ui/Card';
import FormField from '@/components/ui/FormField';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { COUNTRIES } from '@/lib/invoice-utils';

interface Props {
  register: UseFormRegister<InvoiceData>;
  control: Control<InvoiceData>;
  errors: FieldErrors<InvoiceData>;
}

const countryOptions = COUNTRIES.map((c) => ({ value: c, label: c }));

function AddressBlock({
  prefix,
  register,
}: {
  prefix: 'billTo' | 'shipTo';
  register: UseFormRegister<InvoiceData>;
}) {
  return (
    <div className="rounded-xl bg-gray-50 p-4 flex flex-col gap-3">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        {prefix === 'billTo' ? 'Billing' : 'Shipping'} Address
      </p>
      <FormField label="Address Line 1">
        <Input {...register(`${prefix}.address.line1`)} placeholder="123 Customer Ave" />
      </FormField>
      <FormField label="Address Line 2">
        <Input {...register(`${prefix}.address.line2`)} placeholder="Unit 5 (optional)" />
      </FormField>
      <div className="grid grid-cols-3 gap-3">
        <FormField label="City">
          <Input {...register(`${prefix}.address.city`)} placeholder="Los Angeles" />
        </FormField>
        <FormField label="State / Province">
          <Input {...register(`${prefix}.address.state`)} placeholder="CA" />
        </FormField>
        <FormField label="ZIP / Postal Code">
          <Input {...register(`${prefix}.address.zipCode`)} placeholder="90001" />
        </FormField>
      </div>
      <FormField label="Country">
        <Select
          {...register(`${prefix}.address.country`)}
          options={countryOptions}
          placeholder="Select country"
        />
      </FormField>
    </div>
  );
}

export default function CustomerInfoSection({ register, control, errors }: Props) {
  const useShipTo = useWatch({ control, name: 'useShipTo' });

  return (
    <Card title="Bill To (Customer)" subtitle="Customer details shown on the invoice">
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Company / Customer Name" required htmlFor="billTo.name" error={errors.billTo?.name?.message}>
            <Input id="billTo.name" {...register('billTo.name')} placeholder="Client Inc." />
          </FormField>
          <FormField label="Contact Person" htmlFor="billTo.contactPerson">
            <Input id="billTo.contactPerson" {...register('billTo.contactPerson')} placeholder="John Smith" />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Email" htmlFor="billTo.email">
            <Input id="billTo.email" type="email" {...register('billTo.email')} placeholder="accounts@client.com" />
          </FormField>
          <FormField label="Phone" htmlFor="billTo.phone">
            <Input id="billTo.phone" {...register('billTo.phone')} placeholder="+1 555 111 2222" />
          </FormField>
        </div>

        <FormField label="Customer Tax ID / VAT" htmlFor="billTo.taxId">
          <Input id="billTo.taxId" {...register('billTo.taxId')} placeholder="EU-VAT-123456" />
        </FormField>

        <AddressBlock prefix="billTo" register={register} />

        {/* Ship To Toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            {...register('useShipTo')}
            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700 font-medium">Add separate Ship To address</span>
        </label>

        {useShipTo && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Ship To: Company / Name">
                <Input {...register('shipTo.name')} placeholder="Warehouse Name" />
              </FormField>
              <FormField label="Ship To: Contact Person">
                <Input {...register('shipTo.contactPerson')} placeholder="Jane Doe" />
              </FormField>
            </div>
            <FormField label="Ship To: Phone">
              <Input {...register('shipTo.phone')} placeholder="+1 555 333 4444" />
            </FormField>
            <AddressBlock prefix="shipTo" register={register} />
          </>
        )}
      </div>
    </Card>
  );
}
