'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import LocalHydrationPanel from '@/components/LocalHydrationPanel';
import FormField from '@/components/ui/FormField';
import Card from '@/components/ui/Card';
import ImageUpload from '@/components/ui/ImageUpload';
import { generateInvoiceNumber, generateReceiptNumber } from '@/lib/invoice-utils';
import Select from '@/components/ui/Select';
import { getStripeCardAsset, STRIPE_CARD_ASSETS } from '@/lib/stripe-card-assets';
import {
  type HydrationProfile,
  describeHydrationSources,
  fetchLocalJson,
  fetchLocalText,
  EMPTY_HYDRATION_ID,
  isEmptyHydrationId,
  loadHydrationManifest,
  resolveLocalUrl,
} from '@/lib/local-hydration';

function genCardLast4(): string {
  return String(Math.floor(1000 + Math.random() * 9000));
}

interface LineItem {
  id: string;
  name: string;
  qty: string;
  unitPrice: string;
  taxRate: string;
}

interface Fields {
  companyName: string;
  fromEmail: string;
  toEmail: string;
  sentDateTime: string;
  paymentDate: string;
  billingPeriod: string;
  receiptNumber: string;
  invoiceNumber: string;
  subject: string;
  lineItems: LineItem[];
  taxLabel: string;
  taxCountry: string;
  taxConvertedAmount: string;
  cardBrand: string;
  cardLast4: string;
  mailedBy: string;
  signedBy: string;
  supportUrl: string;
  contactEmail: string;
  illustrationUrl: string;
  logoUrl: string;
  logo?: string; // base64 data URL from file upload
  emailType: 'receipt' | 'refund';
  invoiceDownloadUrl: string;
  receiptDownloadUrl: string;
}

interface Attachment {
  name: string;
  mimeType: string;
  base64: string; // base64, chunked at 76 chars for EML
}

interface FileUploadState {
  status: 'idle' | 'uploading' | 'done' | 'error';
  filename?: string;
  url?: string;
  expiresAt?: string;
  error?: string;
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

function fmtUnitPrice(raw: string, maxFractionDigits = 18): string {
  const value = Number(raw);
  if (!Number.isFinite(value)) return fmt(0);

  const fractionalPart = raw.trim().split(/[eE]/)[0]?.split('.')[1] ?? '';
  const significantDecimals = fractionalPart.replace(/0+$/, '').length;
  const maximumFractionDigits = Math.min(Math.max(significantDecimals, 2), maxFractionDigits);

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(value);
}

function fmtDisplayedUnitPrice(raw: string): string {
  return fmtUnitPrice(raw, 9);
}

function fmtQuantity(raw: string): string {
  const value = Number(raw);
  if (!Number.isFinite(value)) return raw || '1';

  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 8,
  }).format(value);
}

function lineSubtotal(item: LineItem): number {
  const qty = parseFloat(item.qty) || 0;
  const unitPrice = parseFloat(item.unitPrice) || 0;
  return qty * unitPrice;
}

function lineTax(item: LineItem): number {
  const subtotal = lineSubtotal(item);
  const taxRate = Math.max(0, parseFloat(item.taxRate) || 0);
  return parseFloat((subtotal * taxRate / 100).toFixed(2));
}

function lineTotal(item: LineItem): number {
  return lineSubtotal(item) + lineTax(item);
}

function toRFC2822(datetimeLocal: string): string {
  try {
    return new Date(datetimeLocal).toUTCString().replace('GMT', '+0000');
  } catch {
    return new Date().toUTCString().replace('GMT', '+0000');
  }
}

function chunkBase64(b64: string): string {
  return b64.match(/.{1,76}/g)?.join('\r\n') ?? b64;
}

function parseDataImageUrl(value: string): { b64: string; mime: string } | null {
  const match = value.trim().match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([\s\S]+)$/);
  if (!match) return null;

  return {
    mime: match[1],
    b64: match[2].replace(/\s/g, ''),
  };
}

const DEFAULT_ILLUSTRATION_URL = 'https://stripe-images.s3.amazonaws.com/emails/invoices_invoice_illustration.png';
const ILLUSTRATION_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 94 91" width="94" height="91"><rect x="18" y="13" width="52" height="67" rx="6" fill="#e3e8ee"/><rect x="14" y="9" width="52" height="67" rx="6" fill="white"/><rect x="14" y="9" width="52" height="22" rx="6" fill="#f3f4f6"/><rect x="14" y="25" width="52" height="6" fill="#f3f4f6"/><rect x="24" y="16" width="32" height="4" rx="2" fill="#d1d5db"/><rect x="24" y="39" width="36" height="4" rx="2" fill="#1a1a1a"/><rect x="24" y="48" width="24" height="3" rx="1.5" fill="#e5e7eb"/><rect x="24" y="55" width="28" height="3" rx="1.5" fill="#e5e7eb"/><rect x="24" y="63" width="32" height="1" fill="#e5e7eb"/><rect x="24" y="68" width="12" height="3" rx="1.5" fill="#d1d5db"/><rect x="46" y="68" width="10" height="3" rx="1.5" fill="#6b7280"/><circle cx="72" cy="67" r="17" fill="#635bff"/><polyline points="63,67 69,73 81,59" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const TAX_PRESETS: Array<{ label: string; taxLabel: string; country: string; rate: number }> = [
  { label: 'VAT - United Kingdom (20%)', taxLabel: 'VAT', country: 'United Kingdom', rate: 20 },
  { label: 'VAT - Germany (19%)', taxLabel: 'VAT', country: 'Germany', rate: 19 },
  { label: 'VAT - France (20%)', taxLabel: 'VAT', country: 'France', rate: 20 },
  { label: 'VAT - Netherlands (21%)', taxLabel: 'VAT', country: 'Netherlands', rate: 21 },
  { label: 'GST - Australia (10%)', taxLabel: 'GST', country: 'Australia', rate: 10 },
  { label: 'GST - New Zealand (15%)', taxLabel: 'GST', country: 'New Zealand', rate: 15 },
  { label: 'GST - Singapore (9%)', taxLabel: 'GST', country: 'Singapore', rate: 9 },
  { label: 'HST - Canada (13%)', taxLabel: 'HST', country: 'Canada', rate: 13 },
  { label: 'VAT - Philippines (12%)', taxLabel: 'VAT', country: 'Philippines', rate: 12 },
  { label: 'No tax', taxLabel: 'Tax', country: '', rate: 0 },
];

const taxLabelOptions = [
  { value: 'Tax', label: 'Tax (generic)' },
  { value: 'VAT', label: 'VAT - Value Added Tax' },
  { value: 'GST', label: 'GST - Goods & Services Tax' },
  { value: 'HST', label: 'HST - Harmonized Sales Tax' },
  { value: 'PST', label: 'PST - Provincial Sales Tax' },
  { value: 'Sales Tax', label: 'Sales Tax' },
  { value: 'Service Tax', label: 'Service Tax' },
];

type ReceiptEmlPrefill = Partial<Omit<Fields, 'lineItems'>> & {
  lineItems?: Array<Partial<LineItem>>;
};

function normalizePrefill(raw: unknown): ReceiptEmlPrefill | null {
  if (!raw || typeof raw !== 'object') return null;
  const root = raw as { receiptEml?: unknown };
  const config = (root.receiptEml && typeof root.receiptEml === 'object' ? root.receiptEml : raw) as ReceiptEmlPrefill;
  if (!config || typeof config !== 'object') return null;

  return config;
}

function applyReceiptPrefill(prev: Fields, config: ReceiptEmlPrefill): Fields {
  return {
    ...prev,
    ...config,
    lineItems: (config.lineItems?.length ? config.lineItems : prev.lineItems).map((item, index) => ({
      id: item.id ?? String(index + 1),
      name: item.name ?? '',
      qty: item.qty ?? '1',
      unitPrice: item.unitPrice ?? '',
      taxRate: item.taxRate ?? '0',
    })),
  };
}

function getTaxSummaryLabel(f: Fields): string {
  const base = f.taxCountry.trim()
    ? `${f.taxLabel || 'Tax'} - ${f.taxCountry.trim()}`
    : (f.taxLabel || 'Tax');
  const rates = [...new Set(f.lineItems
    .map(item => Math.max(0, parseFloat(item.taxRate) || 0))
    .filter(rate => rate > 0)
  )];

  if (rates.length === 1) return `${base} (${rates[0]}%)`;
  return base;
}

function buildDownloadLinks(f: Fields, FF: string): string {
  const hasInvoice = f.invoiceDownloadUrl.trim();
  const hasReceipt = f.receiptDownloadUrl.trim();
  if (!hasInvoice && !hasReceipt) return '';

  const arrowSrc = 'https://stripe-images.s3.amazonaws.com/emails/invoices_arrow_down.png';
  const aStyle = `border:0;margin:0;padding:0;text-decoration:none;outline:0;display:block;line-height:16px`;
  const imgStyle = `border:0;line-height:100%;margin:0;padding:0;display:block;width:12px;height:12px`;
  const spanStyle = `font-family:${FF};text-decoration:none;color:#7a7a7a!important;font-size:14px;line-height:16px;font-weight:500;white-space:nowrap`;
  const linkInner = (label: string) =>
    `<table border="0" cellpadding="0" cellspacing="0" style="border:0; border-collapse:collapse; margin:0; padding:0"><tbody><tr>` +
    `<td valign="middle" width="12" height="16" style="border:0; border-collapse:collapse; margin:0; padding:0; width:12px; height:16px; line-height:16px"><img src="${arrowSrc}" height="12" width="12" alt="" style="${imgStyle}"></td>` +
    `<td width="4" style="border:0; border-collapse:collapse; margin:0; padding:0; width:4px; font-size:1px; line-height:1px">&nbsp;</td>` +
    `<td valign="middle" style="border:0; border-collapse:collapse; margin:0; padding:0; height:16px; line-height:16px"><span style="${spanStyle}">${label} </span></td>` +
    `</tr></tbody></table>`;

  const invoiceTd = hasInvoice
    ? `<td valign="middle" style="border:0; border-collapse:collapse; margin:0; padding:0; height:16px; line-height:16px"><a href="${hasInvoice}" target="_blank" rel="noopener noreferrer" style="${aStyle}">${linkInner('Download invoice')}</a></td>`
    : '';

  const gapTd = (hasInvoice && hasReceipt)
    ? `<td style="border:0; border-collapse:collapse; margin:0; padding:0; min-width:16px; width:16px; font-size:1px">&nbsp; </td>`
    : '';

  const receiptTd = hasReceipt
    ? `<td valign="middle" style="border:0; border-collapse:collapse; margin:0; padding:0; height:16px; line-height:16px"><a href="${hasReceipt}" target="_blank" rel="noopener noreferrer" style="${aStyle}">${linkInner('Download receipt')}</a></td>`
    : '';

  return `<table border="0" cellpadding="0" cellspacing="0" style="border:0; border-collapse:collapse; margin:0; padding:0"><tbody><tr>${invoiceTd}${gapTd}${receiptTd}</tr></tbody></table>`;
}

function buildReceiptHtml(
  f: Fields,
  subtotal: number,
  tax: number,
  total: number,
  illustrationSrc: string,
  logoSrc: string | null
): string {
  const FF = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif`;
  const isRefund = f.emailType === 'refund';
  const summaryLabel = isRefund ? `Refund from ${f.companyName}` : `Receipt from ${f.companyName}`;
  const dateLabel = isRefund ? `Refunded on ${f.paymentDate}` : `Paid ${f.paymentDate}`;

  const logoHtml = logoSrc
    ? `<img src="${logoSrc}" alt="${f.companyName}" style="border-radius:100%;width:32px;height:32px;object-fit:contain;display:block;">`
    : `<div style="border-radius:100%;width:32px;height:32px;background:#635bff;display:inline-flex;align-items:center;justify-content:center;color:white;font-size:14px;font-weight:600;font-family:-apple-system,sans-serif;">${f.companyName.charAt(0).toUpperCase()}</div>`;

  const sp = (h: number) =>
    `<table border="0" cellpadding="0" cellspacing="0" width="100%"><tbody><tr><td height="${h}" style="border:0;margin:0;padding:0;font-size:1px;line-height:1px"><div>&nbsp;</div></td></tr></tbody></table>`;

  const divider =
    `<table cellpadding="0" cellspacing="0" style="width:100%"><tbody>` +
    `<tr><td colspan="3" height="16" style="font-size:1px;line-height:1px">&nbsp;</td></tr>` +
    `<tr><td style="min-width:32px;width:32px;font-size:1px">&nbsp;</td><td height="1" style="height:1px;font-size:1px;background-color:#ebebeb;line-height:1px">&nbsp;</td><td style="min-width:32px;width:32px;font-size:1px">&nbsp;</td></tr>` +
    `<tr><td colspan="3" height="16" style="font-size:1px;line-height:1px">&nbsp;</td></tr>` +
    `</tbody></table>`;

  const billRow = (label: string, value: string, muted = false) => {
    const c = muted ? '#999999' : '#1a1a1a';
    return `<table cellpadding="0" cellspacing="0" style="width:100%"><tbody>
<tr>
  <td style="min-width:32px;width:32px;font-size:1px">&nbsp;</td>
  <td><span style="font-family:${FF};color:${c};font-size:14px;line-height:16px;font-weight:500;word-break:break-word">${label}</span></td>
  <td style="min-width:16px;width:16px;font-size:1px">&nbsp;</td>
  <td align="right" style="text-align:right;vertical-align:top"><span style="font-family:${FF};color:${c};font-size:14px;line-height:16px;font-weight:500;white-space:nowrap">${value}</span></td>
  <td style="min-width:32px;width:32px;font-size:1px">&nbsp;</td>
</tr>
<tr><td colspan="5" height="0" style="font-size:1px;line-height:1px">&nbsp;</td></tr>
</tbody></table>`;
  };

  const rightOnlyRow = (value: string) =>
    `<table cellpadding="0" cellspacing="0" style="width:100%"><tbody>
<tr>
  <td style="min-width:32px;width:32px;font-size:1px">&nbsp;</td>
  <td align="right" style="text-align:right;vertical-align:top;width:100%"><span style="font-family:${FF};color:#999999;font-size:13px;line-height:16px;white-space:nowrap">${value}</span></td>
  <td style="min-width:32px;width:32px;font-size:1px">&nbsp;</td>
</tr>
<tr><td colspan="3" height="0" style="font-size:1px;line-height:1px">&nbsp;</td></tr>
</tbody></table>`;

  const taxSummaryHtml = tax > 0
    ? `${divider}
            ${billRow('Total excluding tax', fmt(subtotal))}
            ${sp(14)}
            ${billRow(getTaxSummaryLabel(f), fmt(tax), true)}
            ${f.taxConvertedAmount.trim() ? `${sp(6)}${rightOnlyRow(f.taxConvertedAmount.trim())}` : ''}`
    : '';

  const cardAsset = getStripeCardAsset(f.cardBrand);
  const paymentMethodHtml =
    `<span style="font-family:${FF}; text-decoration:none; color:#1a1a1a!important; font-size:14px; line-height:16px;">` +
    `<span><img src="${cardAsset.url}" alt="${cardAsset.label}" height="${cardAsset.height}" width="${cardAsset.width}" style="border:0; margin:0; padding:0; vertical-align:text-bottom"> </span>` +
    `<span>- ${f.cardLast4} </span>` +
    `</span>`;
  const supportLinkHtml = f.supportUrl.trim()
    ? `Visit our <a href="${f.supportUrl.trim()}" style="color:#625afa!important;font-weight:bold;text-decoration:none;white-space:nowrap">support site</a>`
    : '';
  const contactLinkHtml = f.contactEmail.trim()
    ? `contact us at <a href="mailto:${f.contactEmail.trim()}" style="color:#625afa!important;font-weight:bold;text-decoration:none;white-space:nowrap">${f.contactEmail.trim()}</a>`
    : '';
  const supportTextHtml = [supportLinkHtml, contactLinkHtml].filter(Boolean).join(' or ');

  const lineItemsHtml = f.lineItems.map(item => {
    const amount = lineTotal(item);
    const eachPrice = `${fmtDisplayedUnitPrice(item.unitPrice)} each`;
    return `<table cellpadding="0" cellspacing="0" style="width:100%"><tbody>
<tr>
  <td style="border:0; border-collapse:collapse; margin:0; padding:0; min-width:32px; width:32px; font-size:1px">&nbsp; </td>
  <td style="border:0; border-collapse:collapse; margin:0; padding:0; padding-left:0px">
    <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr><td align="" style="border:0; border-collapse:collapse; margin:0; padding:0; width:100%">
      <span style="font-family:${FF}; text-decoration:none; color:#1a1a1a!important; font-size:14px; line-height:16px; font-weight:500; word-break:break-word;">${item.name || '(unnamed)'} </span>
    </td></tr></tbody></table>
    <table border="0" cellpadding="0" cellspacing="0" width="100%"><tbody><tr><td height="3" style="border:0; margin:0; padding:0; font-size:1px; line-height:1px; max-height:1px"><div>&nbsp;</div></td></tr></tbody></table>
    <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr><td align="" style="border:0; border-collapse:collapse; margin:0; padding:0; width:100%">
      <span style="font-family:${FF}; text-decoration:none; color:#999999!important; font-size:12px; line-height:14px;">Qty ${fmtQuantity(item.qty || '1')} </span>
    </td></tr></tbody></table>
  </td>
  <td style="border:0; border-collapse:collapse; margin:0; padding:0; min-width:16px; width:16px; font-size:1px">&nbsp; </td>
  <td align="right" style="border:0; border-collapse:collapse; margin:0; padding:0; text-align:right; vertical-align:top">
    <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr><td align="right" nowrap style="border:0; border-collapse:collapse; margin:0; padding:0; width:100%">
      <span style="font-family:${FF}; text-decoration:none; color:#1a1a1a!important; font-size:14px; line-height:16px; font-weight:500; white-space:nowrap;">${fmt(amount)} </span>
    </td></tr></tbody></table>
    <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr><td align="right" nowrap style="border:0; border-collapse:collapse; margin:0; padding:0; width:100%">
      <span style="font-family:${FF}; text-decoration:none; color:#999999!important; font-size:12px; line-height:14px;">${eachPrice} </span>
    </td></tr></tbody></table>
  </td>
  <td style="border:0; border-collapse:collapse; margin:0; padding:0; min-width:32px; width:32px; font-size:1px">&nbsp; </td>
</tr>
<tr><td colspan="5" height="24" style="border:0; border-collapse:collapse; margin:0; padding:0; height:24px; font-size:1px; line-height:1px">&nbsp; </td></tr>
</tbody></table>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Payment Receipt</title>
</head>
<body style="margin:0;padding:0;background:#f0f0eb;font-family:${FF};">
<table bgcolor="#f0f0eb" border="0" cellpadding="0" cellspacing="0" width="100%" style="border:0;margin:0;padding:0">
<tbody><tr>
  <td style="font-size:16px">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>
  <td>
    <table align="center" border="0" cellpadding="0" cellspacing="0" style="width:480px;min-width:480px;max-width:480px">
    <tbody><tr><td>

      ${sp(58)}

      <!-- Company: logo + name -->
      <table cellpadding="0" cellspacing="0"><tbody><tr>
        <td valign="middle" height="32" style="height:32px">${logoHtml}</td>
        <td style="width:12px">&nbsp;</td>
        <td valign="middle"><span style="font-family:${FF};font-weight:500;color:#000000;font-size:16px">${f.companyName}</span></td>
      </tr></tbody></table>

      ${sp(32)}

      <!-- CARD 1: Summary -->
      <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr>
        <td style="width:100%;border-radius:12px;background-color:#e3e8ee;padding:1px">
          <table cellpadding="0" cellspacing="0" style="width:100%;background-color:#ffffff;border-radius:12px"><tbody><tr><td>
            ${sp(32)}
            <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr>
              <td style="min-width:32px;width:32px;font-size:1px">&nbsp;</td>
              <td>
                <!-- Amount header + illustration -->
                <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr>
                  <td style="border:0; border-collapse:collapse; margin:0; padding:0; width:100%">
                    <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr><td align="" style="border:0; border-collapse:collapse; margin:0; padding:0; width:100%; padding-bottom:2px">
                      <span style="font-family:${FF}; text-decoration:none; color:#7a7a7a!important; font-size:14px; line-height:20px; font-weight:500;">${summaryLabel} </span>
                    </td></tr></tbody></table>
                    <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr><td align="" style="border:0; border-collapse:collapse; margin:0; padding:0; width:100%; padding-bottom:2px">
                      <span style="font-family:${FF}; text-decoration:none; color:#1a1a1a!important; font-size:36px; line-height:40px; font-weight:600;">${fmt(total)} </span>
                    </td></tr></tbody></table>
                    <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr><td align="" style="border:0; border-collapse:collapse; margin:0; padding:0; width:100%">
                      <span style="font-family:${FF}; text-decoration:none; color:#7a7a7a!important; font-size:14px; line-height:24px; font-weight:500;">${dateLabel} </span>
                    </td></tr></tbody></table>
                    <table cellpadding="0" cellspacing="0" style="width:100%"><tbody>
                      <tr><td colspan="1" height="16" style="border:0; border-collapse:collapse; margin:0; padding:0; height:16px; font-size:1px; line-height:1px">&nbsp; </td></tr>
                      <tr><td height="1" style="border:0; border-collapse:collapse; margin:0; padding:0; height:1px; font-size:1px; background-color:#ebebeb!important; line-height:1px;">&nbsp; </td></tr>
                      <tr><td colspan="1" height="12" style="border:0; border-collapse:collapse; margin:0; padding:0; height:12px; font-size:1px; line-height:1px">&nbsp; </td></tr>
                    </tbody></table>
                  </td>
                  <td style="border:0; border-collapse:collapse; margin:0; padding:0; width:76px; max-width:76px">
                    <img src="${illustrationSrc}" width="94" height="91" alt="invoice illustration" style="border:0; margin:0 auto; padding:0; display:block; border-radius:8px; margin:0 auto">
                  </td>
                </tr></tbody></table>

                ${buildDownloadLinks(f, FF)}

                ${sp(32)}

                <!-- Key-value pairs -->
                <table cellpadding="0" cellspacing="0" style="width:100%"><tbody>
                  <tr>
                    <td style="border:0; border-collapse:collapse; margin:0; padding:0; vertical-align:top; white-space:nowrap"><span style="font-family:${FF}; text-decoration:none; color:#7a7a7a!important; font-size:14px; line-height:16px;">Receipt number </span></td>
                    <td style="border:0; border-collapse:collapse; margin:0; padding:0; width:24px">&nbsp; </td>
                    <td align="right" style="border:0; border-collapse:collapse; margin:0; padding:0"><span style="font-family:${FF}; text-decoration:none; color:#1a1a1a!important; font-size:14px; line-height:16px;">${f.receiptNumber} </span></td>
                  </tr>
                  <tr><td colspan="2" height="8" style="border:0; border-collapse:collapse; margin:0; padding:0; height:8px; font-size:1px; line-height:1px">&nbsp; </td></tr>
                  <tr>
                    <td style="border:0; border-collapse:collapse; margin:0; padding:0; vertical-align:top; white-space:nowrap"><span style="font-family:${FF}; text-decoration:none; color:#7a7a7a!important; font-size:14px; line-height:16px;">Invoice number </span></td>
                    <td style="border:0; border-collapse:collapse; margin:0; padding:0; width:24px">&nbsp; </td>
                    <td align="right" style="border:0; border-collapse:collapse; margin:0; padding:0"><span style="font-family:${FF}; text-decoration:none; color:#1a1a1a!important; font-size:14px; line-height:16px;">${f.invoiceNumber} </span></td>
                  </tr>
                  <tr><td colspan="2" height="8" style="border:0; border-collapse:collapse; margin:0; padding:0; height:8px; font-size:1px; line-height:1px">&nbsp; </td></tr>
                  <tr>
                    <td style="border:0; border-collapse:collapse; margin:0; padding:0; vertical-align:top; white-space:nowrap"><span style="font-family:${FF}; text-decoration:none; color:#7a7a7a!important; font-size:14px; line-height:16px;">Payment method </span></td>
                    <td style="border:0; border-collapse:collapse; margin:0; padding:0; width:24px">&nbsp; </td>
                    <td align="right" style="border:0; border-collapse:collapse; margin:0; padding:0">${paymentMethodHtml}</td>
                  </tr>
                </tbody></table>
              </td>
              <td style="min-width:32px;width:32px;font-size:1px">&nbsp;</td>
            </tr></tbody></table>

            ${sp(24)}
          </td></tr></tbody></table>
        </td>
      </tr></tbody></table>

      ${sp(20)}

      <!-- CARD 2: Line items -->
      <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr>
        <td style="width:100%;border-radius:12px;background-color:#e3e8ee;padding:1px">
          <table cellpadding="0" cellspacing="0" style="width:100%;background-color:#ffffff;border-radius:12px"><tbody><tr><td>
            ${sp(32)}

            <!-- Receipt # title -->
            <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr>
              <td style="min-width:32px;width:32px;font-size:1px">&nbsp;</td>
              <td nowrap><span style="font-family:${FF};color:#1a1a1a;font-size:16px;line-height:20px;font-weight:500;white-space:nowrap">Receipt #${f.receiptNumber}</span></td>
            </tr></tbody></table>

            ${sp(26)}

            <!-- Billing period -->
            <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr>
              <td style="min-width:32px;width:32px;font-size:1px">&nbsp;</td>
              <td><span style="font-family:${FF};color:#7a7a7a;font-size:13px;line-height:16px;font-weight:500">${f.billingPeriod}</span></td>
            </tr></tbody></table>

            ${sp(8)}

            ${lineItemsHtml}
            ${billRow('Subtotal', fmt(subtotal))}
            ${taxSummaryHtml}
            ${divider}
            ${billRow('Total', fmt(total))}
            ${divider}
            ${billRow('Amount paid', fmt(total))}
            ${divider}

            ${supportTextHtml ? `
              <!-- Support -->
              <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr>
                <td style="min-width:32px;width:32px;font-size:1px">&nbsp;</td>
                <td style="font-family:${FF};font-size:14px;line-height:16px;color:#999999">
                  Questions? ${supportTextHtml}.
                </td>
                <td style="min-width:32px;width:32px;font-size:1px">&nbsp;</td>
              </tr></tbody></table>
            ` : ''}

            ${sp(24)}
          </td></tr></tbody></table>
        </td>
      </tr></tbody></table>

      ${sp(32)}

      <!-- Footer: Powered by Stripe -->
      <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr>
        <td style="width:100%;text-align:center;color:#000000;opacity:0.5">
          <span style="font-family:${FF};font-size:12px;line-height:20px">
            <p style="border:0;margin:0;padding:0;font-family:-apple-system,'SF Pro Display','SF Pro Text','Helvetica',sans-serif">
              Powered by
              <a style="border:0;margin:0;padding:0;text-decoration:none;outline:0" href="https://stripe.com">
                <img src="https://stripe-images.s3.amazonaws.com/emails/invoices_stripe_logo_dark.png" height="24" width="51" align="middle" style="border:0;line-height:100%;vertical-align:middle" alt="Stripe">
              </a>&nbsp;&nbsp;|&nbsp;&nbsp;<a style="border:0;margin:0;padding:0;text-decoration:none;outline:0;color:rgb(0,0,0)" href="https://stripe.com/billing">Learn more about Stripe Billing</a>
            </p>
          </span>
        </td>
      </tr></tbody></table>

      ${sp(64)}

    </td></tr></tbody></table>
  </td>
  <td style="font-size:16px">&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</td>
</tr></tbody></table>
</body>
</html>`;
}

function buildPlainText(f: Fields, subtotal: number, tax: number, total: number): string {
  const cardAsset = getStripeCardAsset(f.cardBrand);
  const isRefund = f.emailType === 'refund';
  const summaryLabel = isRefund ? `Refund from ${f.companyName}` : `Receipt from ${f.companyName}`;
  const dateLabel = isRefund ? `Refunded on ${f.paymentDate}` : `Paid ${f.paymentDate}`;
  const emailTitle = isRefund ? 'Refund' : 'Payment Receipt';
  const downloadLines = [
    f.invoiceDownloadUrl.trim() ? `Download Invoice: ${f.invoiceDownloadUrl.trim()}` : '',
    f.receiptDownloadUrl.trim() ? `Download Receipt: ${f.receiptDownloadUrl.trim()}` : '',
  ].filter(Boolean).join('\n');
  const supportPlain = [
    f.supportUrl.trim() ? `Visit our support site: ${f.supportUrl.trim()}` : '',
    f.contactEmail.trim() ? `contact us at ${f.contactEmail.trim()}` : '',
  ].filter(Boolean).join(' or ');

  return `${f.companyName} — ${emailTitle}

${summaryLabel}
${fmt(total)}
${dateLabel}

Receipt number: ${f.receiptNumber}
Invoice number: ${f.invoiceNumber}
Payment method: ${cardAsset.label} ending in ${f.cardLast4}
${downloadLines ? `\n${downloadLines}\n` : ''}
--- Receipt #${f.receiptNumber} ---
${f.billingPeriod}

${f.lineItems.map(item => {
  return `${item.name || '(unnamed)'} x${fmtQuantity(item.qty || '1')}: ${fmt(lineTotal(item))} (${fmtDisplayedUnitPrice(item.unitPrice)} each)`;
}).join('\n')}
Subtotal: ${fmt(subtotal)}
${tax > 0 ? `Total excluding tax: ${fmt(subtotal)}
${getTaxSummaryLabel(f)}: ${fmt(tax)}
${f.taxConvertedAmount.trim() ? `${f.taxConvertedAmount.trim()}\n` : ''}` : ''}
Total: ${fmt(total)}
Amount paid: ${fmt(total)}

---
${supportPlain ? `Questions? ${supportPlain}.` : ''}

X-Demo-Notice: Simulated receipt for training/demo purposes only`;
}

function buildEml(
  f: Fields,
  subtotal: number,
  tax: number,
  total: number,
  attachments: Attachment[],
  illB64: string,
  illMime: string,
  logoB64: string | null,
  logoMime: string | null
): string {
  const date = toRFC2822(f.sentDateTime);
  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@demo.training>`;
  const logoSrc = logoB64 ? 'cid:logo@receipt.demo' : null;

  const html = buildReceiptHtml(f, subtotal, tax, total, 'cid:illustration@receipt.demo', logoSrc);
  const plain = buildPlainText(f, subtotal, tax, total);

  const rand = () => Math.random().toString(36).slice(2);
  const altBoundary = `alt_${rand()}_${Date.now()}`;
  const relBoundary = `rel_${rand()}_${Date.now()}`;
  const mixedBoundary = `mixed_${rand()}_${Date.now()}`;
  const hasAttachments = attachments.length > 0;

  const mailedByHeaders = f.mailedBy.trim()
    ? `\nReturn-Path: <noreply@${f.mailedBy.trim()}>\nSender: noreply@${f.mailedBy.trim()}`
    : '';

  const dkimHeader = f.signedBy.trim()
    ? `\nDKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; d=${f.signedBy.trim()}; s=default;\r\n h=from:to:subject:date; bh=demo; b=demo-signature-for-training-purposes-only`
    : '';

  const headers = `From: ${f.companyName} <${f.fromEmail}>
To: ${f.toEmail}
Subject: ${f.subject}
Date: ${date}
Message-ID: ${messageId}${mailedByHeaders}${dkimHeader}
MIME-Version: 1.0
X-Demo-Notice: Simulated receipt for training/demo purposes only`;

  const altBody =
    `--${altBoundary}\r\nContent-Type: text/plain; charset="UTF-8"\r\n\r\n${plain}\r\n\r\n` +
    `--${altBoundary}\r\nContent-Type: text/html; charset="UTF-8"\r\n\r\n${html}\r\n\r\n` +
    `--${altBoundary}--`;

  const illExt = illMime === 'image/svg+xml' ? 'svg' : (illMime.split('/')[1] ?? 'png');
  const illPart =
    `--${relBoundary}\r\n` +
    `Content-Type: ${illMime}; name="illustration.${illExt}"\r\n` +
    `Content-Transfer-Encoding: base64\r\n` +
    `Content-ID: <illustration@receipt.demo>\r\n` +
    `Content-Disposition: inline; filename="illustration.${illExt}"\r\n` +
    `\r\n${chunkBase64(illB64)}`;

  const logoExt = logoMime === 'image/svg+xml' ? 'svg' : (logoMime?.split('/')[1] ?? 'png');
  const logoPart = logoB64 && logoMime
    ? `--${relBoundary}\r\n` +
      `Content-Type: ${logoMime}; name="logo.${logoExt}"\r\n` +
      `Content-Transfer-Encoding: base64\r\n` +
      `Content-ID: <logo@receipt.demo>\r\n` +
      `Content-Disposition: inline; filename="logo.${logoExt}"\r\n` +
      `\r\n${chunkBase64(logoB64)}`
    : null;

  const relBody =
    `--${relBoundary}\r\n` +
    `Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n` +
    `\r\n${altBody}\r\n\r\n` +
    `${illPart}\r\n\r\n` +
    (logoPart ? `${logoPart}\r\n\r\n` : '') +
    `--${relBoundary}--`;

  if (!hasAttachments) {
    return `${headers}
Content-Type: multipart/related; boundary="${relBoundary}"; type="multipart/alternative"

${relBody}`;
  }

  const attachmentParts = attachments
    .map(att =>
      `--${mixedBoundary}\r\nContent-Type: ${att.mimeType}; name="${att.name}"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename="${att.name}"\r\n\r\n${att.base64}`
    )
    .join('\r\n\r\n');

  return `${headers}
Content-Type: multipart/mixed; boundary="${mixedBoundary}"

--${mixedBoundary}
Content-Type: multipart/related; boundary="${relBoundary}"; type="multipart/alternative"

${relBody}

${attachmentParts}

--${mixedBoundary}--`;
}

function nowDatetimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const RECEIPT_STATIC_DEFAULTS: Fields = {
  companyName: 'Acme Corp',
  fromEmail: 'receipts@acme.com',
  toEmail: 'user@example.com',
  sentDateTime: '',
  paymentDate: '',
  billingPeriod: '',
  receiptNumber: '',
  invoiceNumber: '',
  subject: 'Your payment receipt from Acme Corp',
  lineItems: [{ id: '1', name: '', qty: '1', unitPrice: '', taxRate: '0' }],
  taxLabel: 'Tax',
  taxCountry: '',
  taxConvertedAmount: '',
  cardBrand: 'visa',
  cardLast4: '',
  mailedBy: '',
  signedBy: '',
  supportUrl: 'https://support.example.com',
  contactEmail: '',
  illustrationUrl: DEFAULT_ILLUSTRATION_URL,
  logoUrl: '',
  logo: undefined,
  emailType: 'receipt',
  invoiceDownloadUrl: '',
  receiptDownloadUrl: '',
};

function createDefaultReceiptFields(): Fields {
  const now = new Date();
  return {
    ...RECEIPT_STATIC_DEFAULTS,
    sentDateTime: nowDatetimeLocal(),
    paymentDate: now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    billingPeriod: `${now.toLocaleDateString('en-US', { month: 'short' })} 1 – ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${now.getFullYear()}`,
    receiptNumber: generateReceiptNumber(),
    invoiceNumber: generateInvoiceNumber(),
    cardLast4: genCardLast4(),
  };
}

export default function ReceiptEmlEditor() {
  const [fields, setFields] = useState<Fields>(RECEIPT_STATIC_DEFAULTS);

  // Populate non-deterministic values client-side only to avoid SSR/hydration mismatch
  useEffect(() => {
    setFields(createDefaultReceiptFields());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [tab, setTab] = useState<'preview' | 'source'>('preview');
  const [invoiceUpload, setInvoiceUpload] = useState<FileUploadState>({ status: 'idle' });
  const [receiptUpload, setReceiptUpload] = useState<FileUploadState>({ status: 'idle' });
  const [hydrationProfiles, setHydrationProfiles] = useState<HydrationProfile[]>([]);
  const [selectedHydrationId, setSelectedHydrationId] = useState(EMPTY_HYDRATION_ID);
  const [hydrationLoading, setHydrationLoading] = useState(false);
  const [hydrationSource, setHydrationSource] = useState('');
  const [prefillConfig, setPrefillConfig] = useState<ReceiptEmlPrefill | null>(null);
  const [prefillLogo, setPrefillLogo] = useState<string | null>(null);
  const [prefillApplied, setPrefillApplied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    loadHydrationManifest().then(profiles => {
      if (cancelled) return;
      setHydrationProfiles(profiles);
      setSelectedHydrationId(prev =>
        prev && (profiles.some(p => p.id === prev) || isEmptyHydrationId(prev))
          ? prev
          : EMPTY_HYDRATION_ID
      );
    });

    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (isEmptyHydrationId(selectedHydrationId)) {
      setPrefillConfig(null);
      setPrefillLogo(null);
      setHydrationSource('');
      setPrefillApplied(false);
      setHydrationLoading(false);
      return;
    }

    const profile = hydrationProfiles.find(p => p.id === selectedHydrationId);
    if (!profile) return;

    let cancelled = false;
    setHydrationLoading(true);
    setPrefillApplied(false);

    const loadProfilePrefill = async () => {
      const receiptUrl = resolveLocalUrl(profile.receiptPrefill);
      const logoUrl = resolveLocalUrl(profile.logo);
      const [receiptRaw, logoText] = await Promise.all([
        receiptUrl ? fetchLocalJson(receiptUrl) : null,
        logoUrl ? fetchLocalText(logoUrl) : null,
      ]);

      const config = receiptRaw ? normalizePrefill(receiptRaw) : null;
      const logo = logoText?.trim().startsWith('data:image/') ? logoText.trim() : null;

      if (cancelled) return;

      setPrefillConfig(config);
      setPrefillLogo(logo);
      setHydrationSource(
        config || logo
          ? describeHydrationSources(profile, {
              receipt: Boolean(config),
              logo: Boolean(logo),
            })
          : ''
      );
    };

    loadProfilePrefill().finally(() => {
      if (!cancelled) setHydrationLoading(false);
    });

    return () => { cancelled = true; };
  }, [selectedHydrationId, hydrationProfiles]);

  function applyLocalPrefill() {
    if (!prefillConfig) return;
    setFields(prev => ({
      ...applyReceiptPrefill(prev, prefillConfig),
      ...(prefillLogo ? { logo: prefillLogo, logoUrl: '' } : {}),
    }));
    setInvoiceUpload({ status: 'idle' });
    setReceiptUpload({ status: 'idle' });
    setPrefillApplied(true);
  }

  function resetFromHydration() {
    setFields(createDefaultReceiptFields());
    setAttachments([]);
    setInvoiceUpload({ status: 'idle' });
    setReceiptUpload({ status: 'idle' });
    setPrefillApplied(false);
  }

  async function uploadForButton(
    file: File,
    setter: React.Dispatch<React.SetStateAction<FileUploadState>>
  ) {
    setter({ status: 'uploading' });
    try {
      const body = new FormData();
      body.append('file', file);
      body.append('dir', 'email-buttons/');
      const res = await fetch('/api/s3/presign', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setter({ status: 'done', filename: data.filename, url: data.url, expiresAt: data.expiresAt });
    } catch (err) {
      setter({ status: 'error', error: err instanceof Error ? err.message : 'Upload failed' });
    }
  }

  type IllStatus = 'idle' | 'loading' | 'ok' | 'error';
  const [illData, setIllData] = useState<{ b64: string; mime: string } | null>(null);
  const [illStatus, setIllStatus] = useState<IllStatus>('idle');

  useEffect(() => {
    const url = fields.illustrationUrl.trim();
    if (!url) { setIllData(null); setIllStatus('idle'); return; }
    const dataImage = parseDataImageUrl(url);
    if (dataImage) {
      setIllData(dataImage);
      setIllStatus('ok');
      return;
    }
    setIllStatus('loading');
    let cancelled = false;
    fetch(`/api/image-proxy?url=${encodeURIComponent(url)}`)
      .then(async r => {
        const data = await r.json();
        if (!r.ok) throw new Error(data.error ?? 'Image fetch failed');
        return { b64: data.base64 as string, mime: data.mime as string };
      })
      .then(data => { if (!cancelled) { setIllData(data); setIllStatus('ok'); } })
      .catch(() => { if (!cancelled) { setIllData(null); setIllStatus('error'); } });
    return () => { cancelled = true; };
  }, [fields.illustrationUrl]);

  const [logoUrlData, setLogoUrlData] = useState<{ b64: string; mime: string } | null>(null);
  const [logoUrlStatus, setLogoUrlStatus] = useState<IllStatus>('idle');

  useEffect(() => {
    if (fields.logo) { setLogoUrlData(null); setLogoUrlStatus('idle'); return; }
    const url = fields.logoUrl.trim();
    if (!url) { setLogoUrlData(null); setLogoUrlStatus('idle'); return; }
    const dataImage = parseDataImageUrl(url);
    if (dataImage) {
      setLogoUrlData(dataImage);
      setLogoUrlStatus('ok');
      return;
    }
    setLogoUrlStatus('loading');
    let cancelled = false;
    fetch(url)
      .then(r => {
        const mime = r.headers.get('content-type')?.split(';')[0]?.trim() ?? 'image/png';
        return r.blob().then(blob => ({ blob, mime }));
      })
      .then(({ blob, mime }) => new Promise<{ b64: string; mime: string }>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => { const b64 = (reader.result as string).split(',')[1]; res({ b64, mime }); };
        reader.onerror = rej;
        reader.readAsDataURL(blob);
      }))
      .then(data => { if (!cancelled) { setLogoUrlData(data); setLogoUrlStatus('ok'); } })
      .catch(() => { if (!cancelled) { setLogoUrlData(null); setLogoUrlStatus('error'); } });
    return () => { cancelled = true; };
  }, [fields.logoUrl, fields.logo]);

  function setField(key: keyof Fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields(prev => ({ ...prev, [key]: e.target.value }));
  }

  const onDropFiles = useCallback((files: File[]) => {
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = ev.target?.result as string;
        const [meta, data] = dataUrl.split(',');
        const mimeType = meta.match(/:(.*?);/)?.[1] ?? 'application/octet-stream';
        setAttachments(prev => [...prev, { name: file.name, mimeType, base64: chunkBase64(data) }]);
      };
      reader.readAsDataURL(file);
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropFiles,
    multiple: true,
  });

  function removeAttachment(idx: number) {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  }

  const { subtotal, tax, total } = useMemo(() => {
    const subtotal = fields.lineItems.reduce((sum, item) => sum + lineSubtotal(item), 0);
    const tax = parseFloat(fields.lineItems.reduce((sum, item) => sum + lineTax(item), 0).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));
    return { subtotal, tax, total };
  }, [fields.lineItems]);

  const illB64       = illData?.b64  ?? btoa(ILLUSTRATION_SVG);
  const illMime      = illData?.mime ?? 'image/svg+xml';
  const illPreviewSrc = illData
    ? `data:${illData.mime};base64,${illData.b64}`
    : `data:image/svg+xml;base64,${btoa(ILLUSTRATION_SVG)}`;

  // Logo: file-upload takes precedence over URL
  const logoFileB64  = fields.logo ? fields.logo.split(',')[1] : null;
  const logoFileMime = fields.logo ? (fields.logo.split(';')[0].replace('data:', '')) : null;
  const logoB64      = logoFileB64 ?? logoUrlData?.b64 ?? null;
  const logoMime     = logoFileMime ?? logoUrlData?.mime ?? null;
  const logoPreviewSrc: string | null =
    fields.logo ?? (logoUrlData ? fields.logoUrl.trim() : null) ?? (fields.logoUrl.trim() || null);

  // Presigned upload URLs take precedence over manually entered URLs
  const effectiveFields = {
    ...fields,
    invoiceDownloadUrl: invoiceUpload.url ?? fields.invoiceDownloadUrl,
    receiptDownloadUrl: receiptUpload.url ?? fields.receiptDownloadUrl,
  };

  const eml = useMemo(
    () => buildEml(effectiveFields, subtotal, tax, total, attachments, illB64, illMime, logoB64, logoMime),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [effectiveFields.invoiceDownloadUrl, effectiveFields.receiptDownloadUrl, fields, subtotal, tax, total, attachments, illB64, illMime, logoB64, logoMime]
  );
  const previewHtml = buildReceiptHtml(effectiveFields, subtotal, tax, total, illPreviewSrc, logoPreviewSrc);

  function handleExport() {
    const blob = new Blob([eml], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `receipt-${fields.receiptNumber || 'demo'}.eml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadAttachment(att: Attachment) {
    const cleanB64 = att.base64.replace(/\r\n/g, '');
    const binary = atob(cleanB64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: att.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = att.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const tabBtn = (active: boolean) =>
    `px-4 py-1.5 text-sm rounded-lg font-medium transition ${
      active
        ? 'bg-[#3C50E0] text-white shadow-sm'
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }`;

  function applyTaxPreset(preset: typeof TAX_PRESETS[number]) {
    setFields(prev => ({
      ...prev,
      taxLabel: preset.taxLabel,
      taxCountry: preset.country,
      lineItems: prev.lineItems.map(item => ({ ...item, taxRate: String(preset.rate) })),
    }));
  }

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden">
      {/* Left: Form fields */}
      <aside className="w-[420px] flex-shrink-0 border-r border-gray-100 bg-white overflow-y-auto p-5 space-y-5">
        <Card title="Sender">
          <div className="space-y-3">
            <FormField label="Company logo" htmlFor="logo">
              <ImageUpload
                value={fields.logo}
                onChange={val => setFields(prev => ({ ...prev, logo: val }))}
                label="Upload logo"
              />
            </FormField>
            <FormField label="Logo URL" htmlFor="logoUrl" hint="Used if no file is uploaded">
              <Input id="logoUrl" type="text" value={fields.logoUrl} onChange={setField('logoUrl')} placeholder="https://example.com/logo.png or data:image/png;base64,..." />
            </FormField>
            {fields.logoUrl && !fields.logo && (
              <div className="flex items-center gap-2 pt-0.5">
                <img src={fields.logoUrl} alt="logo preview" className="w-8 h-8 rounded-full object-contain border border-gray-100 bg-gray-50" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <span className={`text-xs font-medium ${logoUrlStatus === 'ok' ? 'text-green-600' : logoUrlStatus === 'error' ? 'text-red-500' : logoUrlStatus === 'loading' ? 'text-gray-400' : 'text-gray-400'}`}>
                  {logoUrlStatus === 'ok' ? '✓ Embedded in EML' : logoUrlStatus === 'error' ? '✗ Could not fetch (CORS?)' : logoUrlStatus === 'loading' ? 'Fetching…' : ''}
                </span>
              </div>
            )}
            <FormField label="Company name" htmlFor="companyName">
              <Input id="companyName" value={fields.companyName} onChange={setField('companyName')} />
            </FormField>
            <FormField label="From email" htmlFor="fromEmail">
              <Input id="fromEmail" type="email" value={fields.fromEmail} onChange={setField('fromEmail')} />
            </FormField>
            <FormField label="To email" htmlFor="toEmail">
              <Input id="toEmail" type="email" value={fields.toEmail} onChange={setField('toEmail')} />
            </FormField>
            {(hydrationProfiles.length > 0 || hydrationLoading) && (
              <LocalHydrationPanel
                profiles={hydrationProfiles}
                selectedId={selectedHydrationId}
                onSelectedIdChange={setSelectedHydrationId}
                sourceDescription={hydrationSource}
                hasData={Boolean(prefillConfig)}
                loading={hydrationLoading}
                applied={prefillApplied}
                onApply={applyLocalPrefill}
                onReset={resetFromHydration}
                title="Local receipt hydration"
              />
            )}
          </div>
        </Card>

        <Card title="Email headers">
          <div className="space-y-3">
            <FormField label="Sent date & time" htmlFor="sentDateTime" hint="Sets the EML Date: header">
              <Input id="sentDateTime" type="datetime-local" value={fields.sentDateTime} onChange={setField('sentDateTime')} />
            </FormField>
            <FormField label="Subject line" htmlFor="subject">
              <Input id="subject" value={fields.subject} onChange={setField('subject')} />
            </FormField>
            <FormField label="Mailed-by domain" htmlFor="mailedBy" hint="Optional — sets Return-Path & Sender headers (e.g. stripe.com)">
              <Input id="mailedBy" value={fields.mailedBy} onChange={setField('mailedBy')} placeholder="stripe.com" />
            </FormField>
            <FormField label="Signed-by domain" htmlFor="signedBy" hint="Optional — adds DKIM-Signature header (e.g. stripe.com)">
              <Input id="signedBy" value={fields.signedBy} onChange={setField('signedBy')} placeholder="stripe.com" />
            </FormField>
          </div>
        </Card>

        <Card title="Receipt details">
          <div className="space-y-3">
            <FormField label="Email type" htmlFor="emailType">
              <Select
                id="emailType"
                value={fields.emailType}
                onChange={e => setFields(p => ({ ...p, emailType: e.target.value as 'receipt' | 'refund' }))}
                options={[
                  { value: 'receipt', label: 'Payment Receipt' },
                  { value: 'refund', label: 'Refund' },
                ]}
              />
            </FormField>
            <FormField label="Payment display date" htmlFor="paymentDate">
              <Input id="paymentDate" value={fields.paymentDate} onChange={setField('paymentDate')} placeholder="April 30, 2026" />
            </FormField>
            <FormField label="Billing period" htmlFor="billingPeriod">
              <Input id="billingPeriod" value={fields.billingPeriod} onChange={setField('billingPeriod')} />
            </FormField>
            <FormField label="Receipt number" htmlFor="receiptNumber">
              <div className="flex gap-1.5">
                <Input id="receiptNumber" value={fields.receiptNumber} onChange={setField('receiptNumber')} />
                <button onClick={() => setFields(p => ({ ...p, receiptNumber: generateReceiptNumber() }))} className="flex-shrink-0 px-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition text-sm" title="Regenerate">↺</button>
              </div>
            </FormField>
            <FormField label="Invoice number" htmlFor="invoiceNumber">
              <div className="flex gap-1.5">
                <Input id="invoiceNumber" value={fields.invoiceNumber} onChange={setField('invoiceNumber')} />
                <button onClick={() => setFields(p => ({ ...p, invoiceNumber: generateInvoiceNumber() }))} className="flex-shrink-0 px-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition text-sm" title="Regenerate">↺</button>
              </div>
            </FormField>
          </div>
        </Card>

        <Card title="Tax options">
          <div className="space-y-3">
            <div>
              <p className="mb-2 text-xs font-medium text-gray-500">Tax presets</p>
              <div className="flex flex-wrap gap-2">
                {TAX_PRESETS.map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyTaxPreset(preset)}
                    className="rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition hover:border-[#635bff]/50 hover:bg-[#635bff]/5 hover:text-[#635bff]"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
            <FormField label="Tax type" htmlFor="taxLabel" hint="Label shown in the receipt totals">
              <Select
                id="taxLabel"
                value={fields.taxLabel}
                onChange={e => setFields(p => ({ ...p, taxLabel: e.target.value }))}
                options={taxLabelOptions}
              />
            </FormField>
            <FormField label="Tax country" htmlFor="taxCountry" hint={'Optional - shown as "GST - Australia"'}>
              <Input
                id="taxCountry"
                value={fields.taxCountry}
                onChange={setField('taxCountry')}
                placeholder="Australia"
              />
            </FormField>
            <FormField label="Converted tax amount" htmlFor="taxConvertedAmount" hint="Optional second line, e.g. (A$3.01)">
              <Input
                id="taxConvertedAmount"
                value={fields.taxConvertedAmount}
                onChange={setField('taxConvertedAmount')}
                placeholder="(A$3.01)"
              />
            </FormField>
          </div>
        </Card>

        <Card
          title="Line items"
          action={
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFields(p => ({ ...p, lineItems: [...p.lineItems, { id: String(Date.now()), name: '', qty: '1', unitPrice: '', taxRate: '0' }] }))}
              icon={
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              }
            >
              Add
            </Button>
          }
        >
          <div className="space-y-4">
            {fields.lineItems.map((item, idx) => (
              <div key={item.id} className="space-y-2 pb-3 border-b border-gray-100 last:border-0 last:pb-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-400">Item {idx + 1}</span>
                  {fields.lineItems.length > 1 && (
                    <button
                      onClick={() => setFields(p => ({ ...p, lineItems: p.lineItems.filter((_, i) => i !== idx) }))}
                      className="text-gray-400 hover:text-red-500 transition text-base leading-none"
                      aria-label="Remove item"
                    >×</button>
                  )}
                </div>
                <FormField label="Name" htmlFor={`item-name-${item.id}`}>
                  <Input
                    id={`item-name-${item.id}`}
                    value={item.name}
                    placeholder="Product or service"
                    onChange={e => setFields(p => ({ ...p, lineItems: p.lineItems.map((li, i) => i === idx ? { ...li, name: e.target.value } : li) }))}
                  />
                </FormField>
                <div className="grid grid-cols-[96px_minmax(0,1fr)_96px] gap-2">
                  <div className="min-w-0">
                    <FormField label="Qty" htmlFor={`item-qty-${item.id}`}>
                      <Input
                        id={`item-qty-${item.id}`}
                        type="number"
                        min="0"
                        step="1"
                        value={item.qty}
                        onChange={e => setFields(p => ({ ...p, lineItems: p.lineItems.map((li, i) => i === idx ? { ...li, qty: e.target.value } : li) }))}
                      />
                    </FormField>
                  </div>
                  <div className="min-w-0">
                    <FormField label="Each price" htmlFor={`item-price-${item.id}`}>
                      <Input
                        id={`item-price-${item.id}`}
                        type="number"
                        min="0"
                        step="any"
                        value={item.unitPrice}
                        placeholder="0.00000347222221"
                        onChange={e => setFields(p => ({ ...p, lineItems: p.lineItems.map((li, i) => i === idx ? { ...li, unitPrice: e.target.value } : li) }))}
                        prefix="$"
                      />
                    </FormField>
                  </div>
                  <div className="min-w-0">
                    <FormField label="Tax" htmlFor={`item-tax-${item.id}`} hint="Calculated only">
                      <Input
                        id={`item-tax-${item.id}`}
                        type="number"
                        min="0"
                        max="100"
                        step="any"
                        value={item.taxRate}
                        placeholder="0"
                        onChange={e => setFields(p => ({ ...p, lineItems: p.lineItems.map((li, i) => i === idx ? { ...li, taxRate: e.target.value } : li) }))}
                        suffix="%"
                      />
                    </FormField>
                  </div>
                </div>
                <div className="text-right text-xs text-gray-400 leading-relaxed">
                  <div>{fmtUnitPrice(item.unitPrice)} each</div>
                  {lineTax(item) > 0 && <div>+ {fields.taxLabel || 'Tax'} {fmt(lineTax(item))}</div>}
                  <div>= {fmt(lineTotal(item))}</div>
                </div>
              </div>
            ))}
            <div className="rounded-lg bg-gray-50 p-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span><span>{fmt(subtotal)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>{getTaxSummaryLabel(fields)}</span><span>{fmt(tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-800 border-t border-gray-200 pt-1 mt-1">
                <span>Total</span><span>{fmt(total)}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Attachments">
          <div className="space-y-3">
            {/* Drop zone */}
            <div
              {...getRootProps()}
              className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 cursor-pointer transition select-none
                ${isDragActive ? 'border-[#635bff] bg-[#635bff]/5' : 'border-gray-200 hover:border-[#635bff]/50 hover:bg-gray-50'}`}
            >
              <input {...getInputProps()} />
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDragActive ? '#635bff' : '#9ca3af'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <p className={`text-xs font-medium ${isDragActive ? 'text-[#635bff]' : 'text-gray-500'}`}>
                {isDragActive ? 'Drop files here' : 'Drag & drop or click to browse'}
              </p>
              <p className="text-[11px] leading-4 text-gray-400">
                Multiple files are supported and exported as EML attachments.
              </p>
            </div>

            {/* File list */}
            {attachments.length > 0 && (
              <ul className="space-y-2">
                {attachments.map((att, i) => (
                  <li key={i} className="space-y-1.5 pb-2.5 border-b border-gray-100 last:border-0 last:pb-0">
                    <div className="flex items-center gap-1.5">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                        <polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span className="truncate text-gray-700 flex-1 min-w-0 text-xs" title={att.name}>
                        {att.name}
                      </span>
                      <button
                        onClick={() => downloadAttachment(att)}
                        className="flex-shrink-0 text-gray-400 hover:text-[#635bff] transition"
                        aria-label="Download"
                        title="Download"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                          <polyline points="7 10 12 15 17 10"/>
                          <line x1="12" y1="15" x2="12" y2="3"/>
                        </svg>
                      </button>
                      <button
                        onClick={() => removeAttachment(i)}
                        className="flex-shrink-0 text-gray-400 hover:text-red-500 transition text-base leading-none"
                        aria-label="Remove"
                      >
                        ×
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card title="Payment">
          <div className="space-y-3">
            <FormField label="Card brand" htmlFor="cardBrand">
              <Select
                id="cardBrand"
                value={fields.cardBrand}
                onChange={(e) => setFields(p => ({ ...p, cardBrand: e.target.value }))}
                options={STRIPE_CARD_ASSETS.map(asset => ({ value: asset.value, label: asset.label }))}
              />
            </FormField>
            <div className="flex items-center gap-2 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
              <img
                src={getStripeCardAsset(fields.cardBrand).url}
                alt={getStripeCardAsset(fields.cardBrand).label}
                width={getStripeCardAsset(fields.cardBrand).width}
                height={getStripeCardAsset(fields.cardBrand).height}
                className="h-4 w-auto"
              />
            </div>
            <FormField label="Card last 4 digits" htmlFor="cardLast4">
              <div className="flex gap-1.5">
                <Input id="cardLast4" maxLength={4} value={fields.cardLast4} onChange={setField('cardLast4')} placeholder="4242" />
                <button onClick={() => setFields(p => ({ ...p, cardLast4: genCardLast4() }))} className="flex-shrink-0 px-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition text-sm" title="Regenerate">↺</button>
              </div>
            </FormField>
          </div>
        </Card>

        <Card title="Support">
          <div className="space-y-3">
            <FormField label="Support site URL" htmlFor="supportUrl" hint={'Optional — shown as "Visit our support site"'}>
              <Input id="supportUrl" type="url" value={fields.supportUrl} onChange={setField('supportUrl')} placeholder="https://support.example.com" />
            </FormField>
            <FormField label="Contact email" htmlFor="contactEmail" hint={'Optional — shown as "contact us at" mail link'}>
              <Input id="contactEmail" type="email" value={fields.contactEmail} onChange={setField('contactEmail')} placeholder="billing@example.com" />
            </FormField>
          </div>
        </Card>

        <Card title="File downloads">
          <div className="space-y-4">
            {(['invoice', 'receipt'] as const).map(type => {
              const upload = type === 'invoice' ? invoiceUpload : receiptUpload;
              const setter = type === 'invoice' ? setInvoiceUpload : setReceiptUpload;
              const urlKey = type === 'invoice' ? 'invoiceDownloadUrl' : 'receiptDownloadUrl';
              const label = type === 'invoice' ? 'Invoice PDF' : 'Receipt PDF';

              return (
                <div key={type} className="space-y-2">
                  <p className="text-xs font-medium text-gray-600">{label}</p>

                  {/* Uploaded file badge */}
                  {upload.status === 'done' && upload.filename && (
                    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                      </svg>
                      <span className="flex-1 min-w-0 truncate text-xs text-green-700 font-medium">{upload.filename}</span>
                      <span className="text-xs text-green-600 whitespace-nowrap">7 days</span>
                      <button
                        onClick={() => setter({ status: 'idle' })}
                        className="flex-shrink-0 text-green-500 hover:text-red-500 transition text-base leading-none"
                        title="Remove"
                      >×</button>
                    </div>
                  )}

                  {/* Upload dropzone */}
                  {upload.status !== 'done' && (
                    <label className={`flex items-center gap-2 rounded-lg border-2 border-dashed px-3 py-2 cursor-pointer transition select-none
                      ${upload.status === 'uploading' ? 'border-[#635bff]/40 bg-[#635bff]/5' : 'border-gray-200 hover:border-[#635bff]/50 hover:bg-gray-50'}`}>
                      <input
                        type="file"
                        accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.csv,.txt,.zip"
                        className="sr-only"
                        disabled={upload.status === 'uploading'}
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file) uploadForButton(file, setter);
                          e.target.value = '';
                        }}
                      />
                      {upload.status === 'uploading' ? (
                        <span className="text-xs text-[#635bff]">Uploading…</span>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                          </svg>
                          <span className="text-xs text-gray-400">Upload to S3 &amp; generate presigned URL</span>
                        </>
                      )}
                    </label>
                  )}

                  {upload.status === 'error' && (
                    <p className="text-xs text-red-500">{upload.error}</p>
                  )}

                  {/* Manual URL fallback */}
                  <FormField label="Or paste URL manually" htmlFor={urlKey}>
                    <Input
                      id={urlKey}
                      type="url"
                      value={fields[urlKey]}
                      onChange={setField(urlKey)}
                      placeholder="https://s3.amazonaws.com/…/file.pdf"
                      disabled={upload.status === 'done'}
                    />
                  </FormField>
                </div>
              );
            })}

            {(effectiveFields.invoiceDownloadUrl || effectiveFields.receiptDownloadUrl) && (
              <p className="text-xs text-gray-400">
                {effectiveFields.invoiceDownloadUrl && effectiveFields.receiptDownloadUrl
                  ? 'Two buttons will appear side-by-side in the email.'
                  : 'One full-width button will appear in the email.'}
              </p>
            )}
          </div>
        </Card>

        <Card title="Illustration image">
          <div className="space-y-3">
            <FormField label="Image URL" htmlFor="illustrationUrl" hint="Supports https:// URLs or data:image/...;base64 strings">
              <Input
                id="illustrationUrl"
                type="text"
                value={fields.illustrationUrl}
                onChange={setField('illustrationUrl')}
                placeholder="https://example.com/image.png or data:image/png;base64,..."
              />
            </FormField>
            <div className="flex items-center gap-3 pt-1">
              <img
                src={illPreviewSrc}
                alt="illustration preview"
                className="w-14 h-14 rounded-lg object-contain border border-gray-100 bg-gray-50 flex-shrink-0"
              />
              <span className={`text-xs font-medium ${
                illStatus === 'ok'      ? 'text-green-600' :
                illStatus === 'error'   ? 'text-red-500' :
                illStatus === 'loading' ? 'text-gray-400' :
                'text-gray-400'
              }`}>
                {illStatus === 'ok'      ? '✓ Embedded as base64 in EML' :
                 illStatus === 'error'   ? '✗ Could not load (CORS?) — using built-in fallback' :
                 illStatus === 'loading' ? 'Fetching…' :
                 'Using built-in SVG icon'}
              </span>
            </div>
          </div>
        </Card>

      </aside>

      {/* Right: Preview / Source */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 bg-white flex-shrink-0">
          <button className={tabBtn(tab === 'preview')} onClick={() => setTab('preview')}>
            Preview
          </button>
          <button className={tabBtn(tab === 'source')} onClick={() => setTab('source')}>
            EML Source
          </button>
          {attachments.length > 0 && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {attachments.length} attachment{attachments.length > 1 ? 's' : ''}
            </span>
          )}
          <div className="ml-auto">
            <Button
              onClick={handleExport}
              size="sm"
              icon={
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              }
            >
              Export .eml
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto relative">
          {tab === 'preview' ? (
            <div className="relative min-h-full bg-[#f3f4f6]">
              <div
                className="min-h-full"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
              <button
                onClick={handleExport}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-[#3C50E0] hover:bg-[#3347C8] active:scale-95 text-white text-sm font-medium rounded-xl shadow-lg transition-all"
                title="Download .eml file"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download .eml
              </button>
            </div>
          ) : (
            <pre className="p-6 text-xs font-mono text-green-400 bg-gray-900 min-h-full whitespace-pre-wrap break-all leading-relaxed">
              {eml}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
