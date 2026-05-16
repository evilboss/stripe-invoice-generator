'use client';

import { UseFormRegister } from 'react-hook-form';
import { InvoiceData } from '@/types/invoice';
import Card from '@/components/ui/Card';
import FormField from '@/components/ui/FormField';
import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { PAYMENT_METHODS } from '@/lib/invoice-utils';
import { getStripeCardAsset, STRIPE_CARD_ASSETS } from '@/lib/stripe-card-assets';

interface Props {
  register: UseFormRegister<InvoiceData>;
  cardBrand?: string;
}

const methodOptions = PAYMENT_METHODS.map((m) => ({ value: m, label: m }));
const cardBrandOptions = STRIPE_CARD_ASSETS.map((asset) => ({ value: asset.value, label: asset.label }));

export default function PaymentInfoSection({ register, cardBrand }: Props) {
  const selectedCard = cardBrand ? getStripeCardAsset(cardBrand) : null;

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

        <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Card details</p>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="Card Type" hint="Stripe dark receipt asset">
              <Select
                {...register('paymentInfo.cardBrand')}
                options={cardBrandOptions}
                placeholder="Select card"
              />
            </FormField>
            <FormField label="Card Last 4">
              <Input
                {...register('paymentInfo.cardLast4')}
                placeholder="4242"
                inputMode="numeric"
                maxLength={4}
              />
            </FormField>
          </div>
          {selectedCard && (
            <div className="mt-3 flex items-center gap-2 rounded-md border border-gray-100 bg-white px-3 py-2">
              <img
                src={selectedCard.url}
                alt={selectedCard.label}
                width={selectedCard.width}
                height={selectedCard.height}
                className="h-4 w-auto"
              />
              <span className="text-xs font-medium text-gray-500">{selectedCard.filename}</span>
            </div>
          )}
        </div>

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
