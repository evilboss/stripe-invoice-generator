'use client';

import { useState, useMemo, useRef } from 'react';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import Card from '@/components/ui/Card';
import ImageUpload from '@/components/ui/ImageUpload';

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
  productName: string;
  price: string;
  taxRate: string;
  cardLast4: string;
  logo?: string; // base64 data URL
}

interface Attachment {
  name: string;
  mimeType: string;
  base64: string; // base64, chunked at 76 chars for EML
}

function fmt(n: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
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

function buildReceiptHtml(f: Fields, subtotal: number, tax: number, total: number): string {
  const FF = `-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Ubuntu,sans-serif`;

  const logoHtml = f.logo
    ? `<img src="${f.logo}" alt="${f.companyName}" style="border-radius:100%;width:32px;height:32px;object-fit:contain;display:block;">`
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

  const productLineItem =
    `<table cellpadding="0" cellspacing="0" style="width:100%"><tbody>
<tr>
  <td style="min-width:32px;width:32px;font-size:1px">&nbsp;</td>
  <td>
    <span style="font-family:${FF};color:#1a1a1a;font-size:14px;line-height:16px;font-weight:500;word-break:break-word">${f.productName}</span>
    <div style="height:3px"></div>
    <span style="font-family:${FF};color:#999999;font-size:12px;line-height:14px">Qty 1</span>
  </td>
  <td style="min-width:16px;width:16px;font-size:1px">&nbsp;</td>
  <td align="right" style="text-align:right;vertical-align:top"><span style="font-family:${FF};color:#1a1a1a;font-size:14px;line-height:16px;font-weight:500;white-space:nowrap">${fmt(subtotal)}</span></td>
  <td style="min-width:32px;width:32px;font-size:1px">&nbsp;</td>
</tr>
<tr><td colspan="5" height="24" style="font-size:1px;line-height:1px">&nbsp;</td></tr>
</tbody></table>`;

  const taxSection = tax > 0
    ? `${billRow('Total excluding tax', fmt(subtotal))}
<table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr><td colspan="5" height="30" style="font-size:1px;line-height:1px">&nbsp;</td></tr></tbody></table>
${billRow(`Tax (${f.taxRate}%)`, fmt(tax), true)}
${divider}`
    : '';

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
                  <td style="width:100%">
                    <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr><td style="padding-bottom:2px">
                      <span style="font-family:${FF};color:#7a7a7a;font-size:14px;line-height:20px;font-weight:500">Receipt from ${f.companyName}</span>
                    </td></tr></tbody></table>
                    <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr><td style="padding-bottom:2px">
                      <span style="font-family:${FF};color:#1a1a1a;font-size:36px;line-height:40px;font-weight:600">${fmt(total)}</span>
                    </td></tr></tbody></table>
                    <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr><td>
                      <span style="font-family:${FF};color:#7a7a7a;font-size:14px;line-height:24px;font-weight:500">Paid ${f.paymentDate}</span>
                    </td></tr></tbody></table>
                    <table cellpadding="0" cellspacing="0" style="width:100%"><tbody>
                      <tr><td height="16" style="font-size:1px;line-height:1px">&nbsp;</td></tr>
                      <tr><td height="1" style="height:1px;font-size:1px;background-color:#ebebeb;line-height:1px">&nbsp;</td></tr>
                      <tr><td height="12" style="font-size:1px;line-height:1px">&nbsp;</td></tr>
                    </tbody></table>
                  </td>
                  <td style="width:76px;max-width:76px">
                    <img src="https://stripe-images.s3.amazonaws.com/emails/invoices_invoice_illustration.png" width="94" height="91" style="border:0;display:block;border-radius:8px;margin:0 auto" alt="">
                  </td>
                </tr></tbody></table>

                <!-- Download links -->
                <table cellpadding="0" cellspacing="0"><tbody><tr>
                  <td><span style="font-family:${FF};color:#7a7a7a;font-size:14px;line-height:16px;font-weight:500">&#8595;&nbsp;Download invoice</span></td>
                  <td style="min-width:16px;width:16px;font-size:1px">&nbsp;</td>
                  <td><span style="font-family:${FF};color:#7a7a7a;font-size:14px;line-height:16px;font-weight:500">&#8595;&nbsp;Download receipt</span></td>
                </tr></tbody></table>

                ${sp(32)}

                <!-- Key-value pairs -->
                <table cellpadding="0" cellspacing="0" style="width:100%"><tbody>
                  <tr>
                    <td style="vertical-align:top;white-space:nowrap"><span style="font-family:${FF};color:#7a7a7a;font-size:14px;line-height:16px">Receipt number</span></td>
                    <td style="width:24px">&nbsp;</td>
                    <td align="right"><span style="font-family:${FF};color:#1a1a1a;font-size:14px;line-height:16px">${f.receiptNumber}</span></td>
                  </tr>
                  <tr><td colspan="2" height="8" style="font-size:1px;line-height:1px">&nbsp;</td></tr>
                  <tr>
                    <td style="vertical-align:top;white-space:nowrap"><span style="font-family:${FF};color:#7a7a7a;font-size:14px;line-height:16px">Invoice number</span></td>
                    <td style="width:24px">&nbsp;</td>
                    <td align="right"><span style="font-family:${FF};color:#1a1a1a;font-size:14px;line-height:16px">${f.invoiceNumber}</span></td>
                  </tr>
                  <tr><td colspan="2" height="8" style="font-size:1px;line-height:1px">&nbsp;</td></tr>
                  <tr>
                    <td style="vertical-align:top;white-space:nowrap"><span style="font-family:${FF};color:#7a7a7a;font-size:14px;line-height:16px">Payment method</span></td>
                    <td style="width:24px">&nbsp;</td>
                    <td align="right"><span style="font-family:${FF};color:#1a1a1a;font-size:14px;line-height:16px">Card ending in ${f.cardLast4}</span></td>
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

            ${productLineItem}
            ${billRow('Subtotal', fmt(subtotal))}
            ${divider}
            ${taxSection}
            ${billRow('Total', fmt(total))}
            ${divider}
            ${billRow('Amount paid', fmt(total))}
            ${divider}

            <!-- Support -->
            <table cellpadding="0" cellspacing="0" style="width:100%"><tbody><tr>
              <td style="min-width:32px;width:32px;font-size:1px">&nbsp;</td>
              <td style="font-family:${FF};font-size:14px;line-height:16px;color:#999999">
                Questions? Contact us at <a href="mailto:${f.fromEmail}" style="color:#625afa!important;font-weight:bold;text-decoration:none;white-space:nowrap">${f.fromEmail}</a>.
              </td>
              <td style="min-width:32px;width:32px;font-size:1px">&nbsp;</td>
            </tr></tbody></table>

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
              Powered by <img src="https://stripe-images.s3.amazonaws.com/emails/invoices_stripe_logo_dark.png" height="24" width="51" align="middle" alt="stripe logo" style="border:0;line-height:100%;vertical-align:middle">
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
  const taxLines = tax > 0
    ? `Total excluding tax: ${fmt(subtotal)}\nTax (${f.taxRate}%): ${fmt(tax)}\n`
    : '';
  return `${f.companyName} — Payment Receipt

Receipt from ${f.companyName}
${fmt(total)}
Paid ${f.paymentDate}

Receipt number: ${f.receiptNumber}
Invoice number: ${f.invoiceNumber}
Payment method: Card ending in ${f.cardLast4}

--- Receipt #${f.receiptNumber} ---
${f.billingPeriod}

${f.productName} x1: ${fmt(subtotal)}
Subtotal: ${fmt(subtotal)}
${taxLines}Total: ${fmt(total)}
Amount paid: ${fmt(total)}

---
Questions? Contact ${f.fromEmail}

X-Demo-Notice: Simulated receipt for training/demo purposes only`;
}

function buildEml(
  f: Fields,
  subtotal: number,
  tax: number,
  total: number,
  attachments: Attachment[]
): string {
  const date = toRFC2822(f.sentDateTime);
  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@demo.training>`;
  const html = buildReceiptHtml(f, subtotal, tax, total);
  const plain = buildPlainText(f, subtotal, tax, total);

  const altBoundary = `alt_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  const mixedBoundary = `mixed_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  const hasAttachments = attachments.length > 0;

  const headers = `From: ${f.companyName} <${f.fromEmail}>
To: ${f.toEmail}
Subject: ${f.subject}
Date: ${date}
Message-ID: ${messageId}
MIME-Version: 1.0
X-Demo-Notice: Simulated receipt for training/demo purposes only`;

  const altBody = `--${altBoundary}\r\nContent-Type: text/plain; charset="UTF-8"\r\n\r\n${plain}\r\n\r\n--${altBoundary}\r\nContent-Type: text/html; charset="UTF-8"\r\n\r\n${html}\r\n\r\n--${altBoundary}--`;

  if (!hasAttachments) {
    return `${headers}
Content-Type: multipart/alternative; boundary="${altBoundary}"

${altBody}`;
  }

  const attachmentParts = attachments
    .map(
      att =>
        `--${mixedBoundary}\r\nContent-Type: ${att.mimeType}; name="${att.name}"\r\nContent-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename="${att.name}"\r\n\r\n${att.base64}`
    )
    .join('\r\n\r\n');

  return `${headers}
Content-Type: multipart/mixed; boundary="${mixedBoundary}"

--${mixedBoundary}
Content-Type: multipart/alternative; boundary="${altBoundary}"

${altBody}

${attachmentParts}

--${mixedBoundary}--`;
}

function nowDatetimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ReceiptEmlEditor() {
  const [fields, setFields] = useState<Fields>({
    companyName: 'Acme Corp',
    fromEmail: 'receipts@acme.com',
    toEmail: 'user@example.com',
    sentDateTime: nowDatetimeLocal(),
    paymentDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
    billingPeriod: `Apr 1 – Apr 30, ${new Date().getFullYear()}`,
    receiptNumber: 'RCPT-2026-0001',
    invoiceNumber: 'INV-2026-0001',
    subject: 'Your payment receipt from Acme Corp',
    productName: 'Claude Pro',
    price: '20.00',
    taxRate: '0',
    cardLast4: '4242',
    logo: undefined,
  });

  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [tab, setTab] = useState<'preview' | 'source'>('preview');
  const attachInputRef = useRef<HTMLInputElement>(null);

  function setField(key: keyof Fields) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setFields(prev => ({ ...prev, [key]: e.target.value }));
  }

  function handleAttachFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => {
        const dataUrl = ev.target?.result as string;
        const [meta, data] = dataUrl.split(',');
        const mimeType = meta.match(/:(.*?);/)?.[1] ?? 'application/octet-stream';
        setAttachments(prev => [
          ...prev,
          { name: file.name, mimeType, base64: chunkBase64(data) },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  }

  function removeAttachment(idx: number) {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  }

  const { subtotal, tax, total } = useMemo(() => {
    const subtotal = parseFloat(fields.price) || 0;
    const taxRate = parseFloat(fields.taxRate) || 0;
    const tax = parseFloat((subtotal * taxRate / 100).toFixed(2));
    const total = parseFloat((subtotal + tax).toFixed(2));
    return { subtotal, tax, total };
  }, [fields.price, fields.taxRate]);

  const eml = useMemo(
    () => buildEml(fields, subtotal, tax, total, attachments),
    [fields, subtotal, tax, total, attachments]
  );
  const previewHtml = useMemo(
    () => buildReceiptHtml(fields, subtotal, tax, total),
    [fields, subtotal, tax, total]
  );

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

  const tabBtn = (active: boolean) =>
    `px-4 py-1.5 text-sm rounded-lg font-medium transition ${
      active
        ? 'bg-[#3C50E0] text-white shadow-sm'
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <div className="flex h-full min-h-0">
      {/* Left: Form fields */}
      <aside className="w-72 flex-shrink-0 border-r border-gray-100 bg-white overflow-y-auto p-5 space-y-5">
        <Card title="Sender">
          <div className="space-y-3">
            <FormField label="Company logo" htmlFor="logo">
              <ImageUpload
                value={fields.logo}
                onChange={val => setFields(prev => ({ ...prev, logo: val }))}
                label="Upload logo"
              />
            </FormField>
            <FormField label="Company name" htmlFor="companyName">
              <Input id="companyName" value={fields.companyName} onChange={setField('companyName')} />
            </FormField>
            <FormField label="From email" htmlFor="fromEmail">
              <Input id="fromEmail" type="email" value={fields.fromEmail} onChange={setField('fromEmail')} />
            </FormField>
            <FormField label="To email" htmlFor="toEmail">
              <Input id="toEmail" type="email" value={fields.toEmail} onChange={setField('toEmail')} />
            </FormField>
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
          </div>
        </Card>

        <Card title="Receipt details">
          <div className="space-y-3">
            <FormField label="Payment display date" htmlFor="paymentDate">
              <Input id="paymentDate" value={fields.paymentDate} onChange={setField('paymentDate')} placeholder="April 30, 2026" />
            </FormField>
            <FormField label="Billing period" htmlFor="billingPeriod">
              <Input id="billingPeriod" value={fields.billingPeriod} onChange={setField('billingPeriod')} />
            </FormField>
            <FormField label="Receipt number" htmlFor="receiptNumber">
              <Input id="receiptNumber" value={fields.receiptNumber} onChange={setField('receiptNumber')} />
            </FormField>
            <FormField label="Invoice number" htmlFor="invoiceNumber">
              <Input id="invoiceNumber" value={fields.invoiceNumber} onChange={setField('invoiceNumber')} />
            </FormField>
          </div>
        </Card>

        <Card title="Line item">
          <div className="space-y-3">
            <FormField label="Product name" htmlFor="productName">
              <Input id="productName" value={fields.productName} onChange={setField('productName')} />
            </FormField>
            <FormField label="Price (USD)" htmlFor="price">
              <Input id="price" type="number" min="0" step="0.01" value={fields.price} onChange={setField('price')} prefix="$" />
            </FormField>
            <FormField label="Tax rate" htmlFor="taxRate">
              <Input id="taxRate" type="number" min="0" max="100" step="0.1" value={fields.taxRate} onChange={setField('taxRate')} suffix="%" />
            </FormField>
            <div className="rounded-lg bg-gray-50 p-3 space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span><span>{fmt(subtotal)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>Tax</span><span>{fmt(tax)}</span>
                </div>
              )}
              <div className="flex justify-between font-semibold text-gray-800 border-t border-gray-200 pt-1 mt-1">
                <span>Total</span><span>{fmt(total)}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Payment">
          <FormField label="Card last 4 digits" htmlFor="cardLast4">
            <Input id="cardLast4" maxLength={4} value={fields.cardLast4} onChange={setField('cardLast4')} placeholder="4242" />
          </FormField>
        </Card>

        <Card
          title="Attachments"
          subtitle="Added as base64 MIME parts"
          action={
            <>
              <input
                ref={attachInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleAttachFiles}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => attachInputRef.current?.click()}
                icon={
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                }
              >
                Add
              </Button>
            </>
          }
        >
          {attachments.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-2">No attachments</p>
          ) : (
            <ul className="space-y-2">
              {attachments.map((att, i) => (
                <li key={i} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate text-gray-700 flex-1" title={att.name}>
                    {att.name}
                  </span>
                  <button
                    onClick={() => removeAttachment(i)}
                    className="flex-shrink-0 text-gray-400 hover:text-red-500 transition"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
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
