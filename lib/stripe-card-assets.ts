export interface StripeCardAsset {
  value: string;
  label: string;
  stripeBrand: string;
  filename: string;
  url: string;
  width: number;
  height: number;
}

const BASE_URL = 'https://stripe-images.stripecdn.com/emails/receipt_assets/card';

export const STRIPE_CARD_ASSETS: StripeCardAsset[] = [
  {
    value: 'visa',
    label: 'Visa',
    stripeBrand: 'visa',
    filename: 'visa-dark@2x.png',
    url: `${BASE_URL}/visa-dark@2x.png`,
    width: 36,
    height: 16,
  },
  {
    value: 'mastercard',
    label: 'Mastercard',
    stripeBrand: 'mastercard',
    filename: 'mastercard-dark@2x.png',
    url: `${BASE_URL}/mastercard-dark@2x.png`,
    width: 75,
    height: 16,
  },
  {
    value: 'amex',
    label: 'American Express',
    stripeBrand: 'amex',
    filename: 'amex-dark@2x.png',
    url: `${BASE_URL}/amex-dark@2x.png`,
    width: 45,
    height: 16,
  },
  {
    value: 'discover',
    label: 'Discover',
    stripeBrand: 'discover',
    filename: 'discover-dark@2x.png',
    url: `${BASE_URL}/discover-dark@2x.png`,
    width: 57,
    height: 16,
  },
  {
    value: 'diners',
    label: 'Diners Club',
    stripeBrand: 'diners',
    filename: 'diners-dark@2x.png',
    url: `${BASE_URL}/diners-dark@2x.png`,
    width: 20,
    height: 16,
  },
  {
    value: 'jcb',
    label: 'JCB',
    stripeBrand: 'jcb',
    filename: 'jcb-dark@2x.png',
    url: `${BASE_URL}/jcb-dark@2x.png`,
    width: 19,
    height: 16,
  },
  {
    value: 'unionpay',
    label: 'UnionPay',
    stripeBrand: 'unionpay',
    filename: 'unionpay-dark@2x.png',
    url: `${BASE_URL}/unionpay-dark@2x.png`,
    width: 26,
    height: 16,
  },
  {
    value: 'eftpos_au',
    label: 'eftpos AU',
    stripeBrand: 'eftpos_au',
    filename: 'eftpos_au-dark@2x.png',
    url: `${BASE_URL}/eftpos_au-dark@2x.png`,
    width: 43,
    height: 16,
  },
];

export const DEFAULT_STRIPE_CARD_ASSET = STRIPE_CARD_ASSETS[0];

export function getStripeCardAsset(value: string | undefined): StripeCardAsset {
  return STRIPE_CARD_ASSETS.find((asset) => asset.value === value) ?? DEFAULT_STRIPE_CARD_ASSET;
}
