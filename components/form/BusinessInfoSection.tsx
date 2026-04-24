'use client';

import { UseFormRegister, Controller, Control, FieldErrors } from 'react-hook-form';
import { InvoiceData } from '@/types/invoice';
import Card from '@/components/ui/Card';
import FormField from '@/components/ui/FormField';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import ImageUpload from '@/components/ui/ImageUpload';
import { COUNTRIES } from '@/lib/invoice-utils';

interface Props {
  register: UseFormRegister<InvoiceData>;
  control: Control<InvoiceData>;
  errors: FieldErrors<InvoiceData>;
}

const countryOptions = COUNTRIES.map((c) => ({ value: c, label: c }));

export default function BusinessInfoSection({ register, control, errors }: Props) {
  return (
    <Card title="From (Your Business)" subtitle="Your company details appear in the invoice header">
      <div className="grid grid-cols-1 gap-5">
        {/* Logo */}
        <FormField label="Company Logo" hint="Stored as base64 — embedded directly in the PDF">
          <Controller
            name="from.logo"
            control={control}
            render={({ field }) => (
              <ImageUpload
                value={field.value}
                onChange={field.onChange}
                label="Upload Company Logo"
              />
            )}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Company / Business Name" required htmlFor="from.name" error={errors.from?.name?.message}>
            <Input id="from.name" {...register('from.name')} placeholder="Acme Corp" />
          </FormField>
          <FormField label="Email Address" htmlFor="from.email" error={errors.from?.email?.message}>
            <Input id="from.email" type="email" {...register('from.email')} placeholder="billing@acme.com" />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Phone Number" htmlFor="from.phone">
            <Input id="from.phone" {...register('from.phone')} placeholder="+1 555 000 0000" />
          </FormField>
          <FormField label="Website" htmlFor="from.website">
            <Input id="from.website" {...register('from.website')} placeholder="https://acme.com" />
          </FormField>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField label="Tax ID / VAT Number" htmlFor="from.taxId">
            <Input id="from.taxId" {...register('from.taxId')} placeholder="US-123456789" />
          </FormField>
          <FormField label="Registration Number" htmlFor="from.registrationNumber">
            <Input id="from.registrationNumber" {...register('from.registrationNumber')} placeholder="LLC-987654" />
          </FormField>
        </div>

        {/* Address */}
        <div className="rounded-xl bg-gray-50 p-4 flex flex-col gap-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Business Address</p>
          <FormField label="Address Line 1" htmlFor="from.address.line1">
            <Input id="from.address.line1" {...register('from.address.line1')} placeholder="123 Main Street" />
          </FormField>
          <FormField label="Address Line 2" htmlFor="from.address.line2">
            <Input id="from.address.line2" {...register('from.address.line2')} placeholder="Suite 400 (optional)" />
          </FormField>
          <div className="grid grid-cols-3 gap-3">
            <FormField label="City" htmlFor="from.address.city">
              <Input id="from.address.city" {...register('from.address.city')} placeholder="New York" />
            </FormField>
            <FormField label="State / Province" htmlFor="from.address.state">
              <Input id="from.address.state" {...register('from.address.state')} placeholder="NY" />
            </FormField>
            <FormField label="ZIP / Postal Code" htmlFor="from.address.zipCode">
              <Input id="from.address.zipCode" {...register('from.address.zipCode')} placeholder="10001" />
            </FormField>
          </div>
          <FormField label="Country" htmlFor="from.address.country">
            <Select
              id="from.address.country"
              {...register('from.address.country')}
              options={countryOptions}
              placeholder="Select country"
            />
          </FormField>
        </div>
      </div>
    </Card>
  );
}
