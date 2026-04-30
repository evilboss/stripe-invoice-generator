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
  const taxRow =
    tax > 0
      ? `<tr>
          <td style="padding:6px 12px;font-size:14px;color:#6b7280;">Tax (${f.taxRate}%)</td>
          <td style="padding:6px 12px;font-size:14px;color:#111827;text-align:right;">${fmt(tax)}</td>
         </tr>`
      : '';

  const logoHtml = f.logo
    ? `<img src="${f.logo}" alt="${f.companyName}" style="height:44px;max-width:140px;object-fit:contain;display:block;margin:0 auto 10px;" />`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Payment Receipt</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 20px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

  <!-- Header -->
  <tr>
    <td style="background:#0d0d0d;border-radius:12px 12px 0 0;padding:24px 40px;text-align:center;">
      ${logoHtml}
      <span style="color:white;font-size:22px;font-weight:700;letter-spacing:-0.3px;">${f.companyName}</span>
    </td>
  </tr>

  <!-- Main card -->
  <tr>
    <td style="background:white;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;padding:40px;">

      <p style="color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px 0;">Payment receipt</p>
      <p style="color:#111827;font-size:42px;font-weight:700;margin:0 0 32px 0;line-height:1;">${fmt(total)}</p>

      <!-- Details grid -->
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;margin-bottom:32px;overflow:hidden;">
        <tr>
          <td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;width:50%;">
            <span style="color:#6b7280;font-size:12px;display:block;margin-bottom:3px;">Date paid</span>
            <span style="color:#111827;font-size:14px;font-weight:500;">${f.paymentDate}</span>
          </td>
          <td style="padding:14px 18px;border-bottom:1px solid #e5e7eb;border-left:1px solid #e5e7eb;width:50%;">
            <span style="color:#6b7280;font-size:12px;display:block;margin-bottom:3px;">Payment method</span>
            <span style="color:#111827;font-size:14px;font-weight:500;">Card ending in ${f.cardLast4}</span>
          </td>
        </tr>
        <tr>
          <td style="padding:14px 18px;">
            <span style="color:#6b7280;font-size:12px;display:block;margin-bottom:3px;">Billing period</span>
            <span style="color:#111827;font-size:14px;font-weight:500;">${f.billingPeriod}</span>
          </td>
          <td style="padding:14px 18px;border-left:1px solid #e5e7eb;">
            <span style="color:#6b7280;font-size:12px;display:block;margin-bottom:3px;">Receipt number</span>
            <span style="color:#111827;font-size:14px;font-weight:500;">${f.receiptNumber}</span>
          </td>
        </tr>
      </table>

      <!-- Line items -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:0;">
        <thead>
          <tr style="background:#f9fafb;">
            <th style="padding:10px 12px;text-align:left;font-size:12px;color:#6b7280;font-weight:500;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;">Description</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:500;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;width:60px;">Qty</th>
            <th style="padding:10px 12px;text-align:right;font-size:12px;color:#6b7280;font-weight:500;border-top:1px solid #e5e7eb;border-bottom:1px solid #e5e7eb;width:100px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding:12px;font-size:14px;color:#111827;border-bottom:1px solid #e5e7eb;">${f.productName}</td>
            <td style="padding:12px;font-size:14px;color:#111827;text-align:right;border-bottom:1px solid #e5e7eb;">1</td>
            <td style="padding:12px;font-size:14px;color:#111827;text-align:right;border-bottom:1px solid #e5e7eb;">${fmt(subtotal)}</td>
          </tr>
        </tbody>
      </table>

      <!-- Totals -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
        <tr>
          <td style="padding:8px 12px;font-size:14px;color:#6b7280;">Subtotal</td>
          <td style="padding:8px 12px;font-size:14px;color:#111827;text-align:right;">${fmt(subtotal)}</td>
        </tr>
        ${taxRow}
        <tr>
          <td style="padding:8px 12px;font-size:14px;font-weight:600;color:#111827;border-top:1px solid #e5e7eb;">Total</td>
          <td style="padding:8px 12px;font-size:14px;font-weight:600;color:#111827;text-align:right;border-top:1px solid #e5e7eb;">${fmt(total)}</td>
        </tr>
        <tr style="background:#f9fafb;">
          <td style="padding:8px 12px;font-size:14px;font-weight:600;color:#111827;border-top:1px solid #e5e7eb;">Amount paid</td>
          <td style="padding:8px 12px;font-size:14px;font-weight:600;color:#111827;text-align:right;border-top:1px solid #e5e7eb;">${fmt(total)}</td>
        </tr>
      </table>

      <p style="font-size:13px;color:#9ca3af;margin:0;">Questions? Contact us at ${f.fromEmail}. Invoice number: ${f.invoiceNumber}</p>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:20px 40px;text-align:center;">
      <p style="color:#9ca3af;font-size:13px;margin:0 0 4px 0;">Powered by <strong style="color:#635bff;">Stripe</strong></p>
      <p style="color:#d1d5db;font-size:11px;margin:0;">X-Demo-Notice: Simulated receipt for training/demo purposes only</p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

function buildPlainText(f: Fields, subtotal: number, tax: number, total: number): string {
  const taxLine = tax > 0 ? `Tax (${f.taxRate}%): ${fmt(tax)}\n` : '';
  return `${f.companyName} — Payment Receipt

Amount paid: ${fmt(total)}
Date paid: ${f.paymentDate}
Billing period: ${f.billingPeriod}
Receipt number: ${f.receiptNumber}
Invoice number: ${f.invoiceNumber}
Payment method: Card ending in ${f.cardLast4}

--- Summary ---
${f.productName} x1: ${fmt(subtotal)}
Subtotal: ${fmt(subtotal)}
${taxLine}Total: ${fmt(total)}
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
