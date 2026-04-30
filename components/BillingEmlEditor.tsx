'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import Card from '@/components/ui/Card';

// ─── types ───────────────────────────────────────────────────────────────────

interface Fields {
  // identity
  companyName: string;
  // email headers
  fromEmail: string;
  toEmail: string;
  subject: string;
  sentDateTime: string;
  mailedBy: string;
  signedBy: string;
  // logo
  logoUrl: string;
  // body
  recipientName: string;
  chargeAmount: string;
  paymentMethodText: string;
  productName: string;
  billingHistoryUrl: string;
  billingHistoryLinkText: string;
  linkColor: string;
  preheaderText: string;
  // footer
  footerText: string;
  orgInfo: string;
}

interface Attachment {
  name: string;
  mimeType: string;
  base64: string;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function chunkBase64(b64: string): string {
  return b64.match(/.{1,76}/g)?.join('\r\n') ?? b64;
}

function toRFC2822(datetimeLocal: string): string {
  try {
    return new Date(datetimeLocal).toUTCString().replace('GMT', '+0000');
  } catch {
    return new Date().toUTCString().replace('GMT', '+0000');
  }
}

function nowDatetimeLocal(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

function buildBillingHtml(f: Fields, logoSrc: string): string {
  const FF = `Colfax,Helvetica,Arial,sans-serif`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${f.subject}</title>
</head>
<body style="background-color:#ffffff;font-family:${FF};width:100%;height:100%;padding:0;margin:0">

  <!-- Preheader -->
  <div style="display:none;max-width:0;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#fff;opacity:0">
    ${f.preheaderText}
  </div>

  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="font-family:${FF};border-collapse:collapse">
    <tbody>

    <!-- Main content -->
    <tr>
      <td align="center" style="font-family:${FF}">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="width:560px;background-color:#fff;font-family:${FF};border-collapse:collapse">
          <tbody>

          <!-- Logo row -->
          <tr>
            <td valign="top" style="padding:27px 20px 24px 15px;font-family:${FF}">
              <table align="left" width="100%" border="0" cellpadding="0" cellspacing="0" style="min-width:100%;font-family:${FF};border-collapse:collapse">
                <tbody><tr>
                  <td valign="top" style="padding-top:0;padding-bottom:0;text-align:left;font-family:${FF}">
                    <img src="${logoSrc}" width="560" height="168"
                      style="width:140px;max-width:100%;padding-bottom:0;display:inline!important;vertical-align:bottom;height:auto;line-height:100%;text-decoration:none;border:0;outline:none"
                      alt="${f.companyName}">
                  </td>
                </tr></tbody>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td align="left" bgcolor="#ffffff" style="padding:16px 24px;font-size:16px;line-height:24px;font-family:${FF}">
              <p style="margin:0">Hi ${f.recipientName},</p>
              <p style="margin:0;margin-top:16px">
                We charged ${f.chargeAmount} to ${f.paymentMethodText} to fund your <span>${f.companyName}</span> ${f.productName}.
              </p>
              <p style="margin:0;margin-top:16px">
                You may review your <a href="${f.billingHistoryUrl}" style="font-family:${FF};color:${f.linkColor}">${f.billingHistoryLinkText}</a> at any time.
              </p>
            </td>
          </tr>

          </tbody>
        </table>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td align="center" style="padding:24px;font-family:${FF}">
        <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:560px;font-family:${FF};border-collapse:collapse">
          <tbody><tr>
            <td align="left" style="padding:4px 24px;font-size:13px;line-height:20px;color:#888;font-family:${FF}">
              <p style="margin:0">
                ${f.footerText}<br>
                Organization: ${f.orgInfo}
              </p>
            </td>
          </tr></tbody>
        </table>
      </td>
    </tr>

    </tbody>
  </table>

  <div style="display:none;max-width:0;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#ececf1;opacity:0"></div>

</body>
</html>`;
}

// ─── plain text builder ───────────────────────────────────────────────────────

function buildPlainText(f: Fields): string {
  return `Hi ${f.recipientName},

We charged ${f.chargeAmount} to ${f.paymentMethodText} to fund your ${f.companyName} ${f.productName}.

You may review your ${f.billingHistoryLinkText} at any time:
${f.billingHistoryUrl}

---
${f.footerText}
Organization: ${f.orgInfo}

X-Demo-Notice: Simulated billing email for training/demo purposes only`;
}

// ─── EML builder ─────────────────────────────────────────────────────────────

function buildEml(
  f: Fields,
  attachments: Attachment[],
  logoB64: string | null,
  logoMime: string | null
): string {
  const date = toRFC2822(f.sentDateTime);
  const messageId = `<${Date.now()}.${Math.random().toString(36).slice(2)}@demo.training>`;
  const logoSrc = logoB64 ? 'cid:logo@billing.demo' : 'https://cdn.openai.com/API/logo-assets/openai-logo-email-header-1.png';
  const html = buildBillingHtml(f, logoSrc);
  const plain = buildPlainText(f);

  const rand = () => Math.random().toString(36).slice(2);
  const altBoundary = `alt_${rand()}_${Date.now()}`;
  const relBoundary = `rel_${rand()}_${Date.now()}`;
  const mixedBoundary = `mixed_${rand()}_${Date.now()}`;

  const mailedByHeaders = f.mailedBy.trim()
    ? `\nReturn-Path: <noreply@${f.mailedBy.trim()}>\nSender: noreply@${f.mailedBy.trim()}`
    : '';

  const dkimHeader = f.signedBy.trim()
    ? `\nDKIM-Signature: v=1; a=rsa-sha256; c=relaxed/relaxed; d=${f.signedBy.trim()}; s=default;\r\n h=from:to:subject:date; bh=demo; b=demo-signature-for-training-purposes-only`
    : '';

  const headers = `From: ${f.fromEmail}
To: ${f.toEmail}
Subject: ${f.subject}
Date: ${date}
Message-ID: ${messageId}${mailedByHeaders}${dkimHeader}
MIME-Version: 1.0
X-Demo-Notice: Simulated billing email for training/demo purposes only`;

  const altBody =
    `--${altBoundary}\r\nContent-Type: text/plain; charset="UTF-8"\r\n\r\n${plain}\r\n\r\n` +
    `--${altBoundary}\r\nContent-Type: text/html; charset="UTF-8"\r\n\r\n${html}\r\n\r\n` +
    `--${altBoundary}--`;

  const logoParts: string[] = [];
  if (logoB64 && logoMime) {
    const ext = logoMime === 'image/svg+xml' ? 'svg' : (logoMime.split('/')[1] ?? 'png');
    logoParts.push(
      `--${relBoundary}\r\n` +
      `Content-Type: ${logoMime}; name="logo.${ext}"\r\n` +
      `Content-Transfer-Encoding: base64\r\n` +
      `Content-ID: <logo@billing.demo>\r\n` +
      `Content-Disposition: inline; filename="logo.${ext}"\r\n` +
      `\r\n${chunkBase64(logoB64)}`
    );
  }

  const relBody =
    `--${relBoundary}\r\n` +
    `Content-Type: multipart/alternative; boundary="${altBoundary}"\r\n` +
    `\r\n${altBody}\r\n\r\n` +
    logoParts.map(p => `${p}\r\n\r\n`).join('') +
    `--${relBoundary}--`;

  if (attachments.length === 0) {
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

// ─── component ────────────────────────────────────────────────────────────────

export default function BillingEmlEditor() {
  const [fields, setFields] = useState<Fields>({
    companyName: 'OpenAI',
    fromEmail: 'billing@openai.com',
    toEmail: 'user@example.com',
    subject: 'Your OpenAI billing receipt',
    sentDateTime: '',
    mailedBy: '',
    signedBy: '',
    logoUrl: 'https://cdn.openai.com/API/logo-assets/openai-logo-email-header-1.png',
    recipientName: '',
    chargeAmount: '$0.00',
    paymentMethodText: 'your credit card ending in 0000',
    productName: 'OpenAI API credit balance',
    billingHistoryUrl: 'https://platform.openai.com/account/billing/history',
    billingHistoryLinkText: 'billing history',
    linkColor: '#10a37f',
    preheaderText: '',
    footerText: 'You received this email because you have a paid account with OpenAI',
    orgInfo: '',
  });

  useEffect(() => {
    setFields(prev => ({ ...prev, sentDateTime: nowDatetimeLocal() }));
  }, []);

  const setField = (key: keyof Fields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFields(prev => ({ ...prev, [key]: e.target.value }));

  // ── logo fetch ──────────────────────────────────────────────────────────────
  type FetchStatus = 'idle' | 'loading' | 'ok' | 'error';
  const [logoMode, setLogoMode] = useState<'url' | 'svg'>('url');
  const [logoSvgMarkup, setLogoSvgMarkup] = useState('');
  const [logoData, setLogoData] = useState<{ b64: string; mime: string } | null>(null);
  const [logoStatus, setLogoStatus] = useState<FetchStatus>('idle');

  useEffect(() => {
    if (logoMode !== 'url') { setLogoData(null); setLogoStatus('idle'); return; }
    const url = fields.logoUrl.trim();
    if (!url) { setLogoData(null); setLogoStatus('idle'); return; }
    setLogoStatus('loading');
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
      .then(data => { if (!cancelled) { setLogoData(data); setLogoStatus('ok'); } })
      .catch(() => { if (!cancelled) { setLogoData(null); setLogoStatus('error'); } });
    return () => { cancelled = true; };
  }, [fields.logoUrl, logoMode]);

  // ── attachments ─────────────────────────────────────────────────────────────
  const [attachments, setAttachments] = useState<Attachment[]>([]);

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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop: onDropFiles, multiple: true });

  function removeAttachment(idx: number) {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  }

  function downloadAttachment(att: Attachment) {
    const cleanB64 = att.base64.replace(/\r\n/g, '');
    const binary = atob(cleanB64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: att.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = att.name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  // ── EML + preview ───────────────────────────────────────────────────────────

  // Safe UTF-8 base64 for SVG markup
  function svgToB64(svg: string): string {
    return btoa(unescape(encodeURIComponent(svg)));
  }

  const svgTrimmed = logoSvgMarkup.trim();
  const isSvgMode = logoMode === 'svg' && svgTrimmed.length > 0;

  const logoB64 = isSvgMode ? svgToB64(svgTrimmed) : (logoData?.b64 ?? null);
  const logoMime = isSvgMode ? 'image/svg+xml' : (logoData?.mime ?? null);
  const logoPreviewSrc = isSvgMode
    ? `data:image/svg+xml;base64,${svgToB64(svgTrimmed)}`
    : (fields.logoUrl.trim() || null);

  const eml = useMemo(
    () => buildEml(fields, attachments, logoB64, logoMime),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields, attachments, logoB64, logoMime]
  );

  const previewHtml = buildBillingHtml(fields, logoPreviewSrc ?? '');

  function handleExport() {
    const blob = new Blob([eml], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `billing-${Date.now()}.eml`;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  }

  const [tab, setTab] = useState<'preview' | 'source'>('preview');

  const tabBtn = (active: boolean) =>
    `px-4 py-1.5 text-sm rounded-lg font-medium transition ${
      active ? 'bg-[#3C50E0] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
    }`;

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0">

      {/* ── Left: form ── */}
      <aside className="w-72 flex-shrink-0 border-r border-gray-100 bg-white overflow-y-auto p-5 space-y-5">

        <Card title="Sender / Recipient">
          <div className="space-y-3">
            <FormField label="Company name" htmlFor="companyName" hint="Used in the email body and logo alt text">
              <Input id="companyName" value={fields.companyName} onChange={setField('companyName')} placeholder="OpenAI" />
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
            <FormField label="Subject" htmlFor="subject">
              <Input id="subject" value={fields.subject} onChange={setField('subject')} />
            </FormField>
            <FormField label="Sent date & time" htmlFor="sentDateTime" hint="Sets the EML Date: header">
              <Input id="sentDateTime" type="datetime-local" value={fields.sentDateTime} onChange={setField('sentDateTime')} />
            </FormField>
            <FormField label="Mailed-by domain" htmlFor="mailedBy" hint="Optional — sets Return-Path & Sender headers">
              <Input id="mailedBy" value={fields.mailedBy} onChange={setField('mailedBy')} placeholder="openai.com" />
            </FormField>
            <FormField label="Signed-by domain" htmlFor="signedBy" hint="Optional — adds DKIM-Signature header">
              <Input id="signedBy" value={fields.signedBy} onChange={setField('signedBy')} placeholder="openai.com" />
            </FormField>
          </div>
        </Card>

        <Card title="Logo">
          <div className="space-y-3">
            {/* Mode toggle */}
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
              <button
                type="button"
                onClick={() => setLogoMode('url')}
                className={`flex-1 py-1.5 transition ${logoMode === 'url' ? 'bg-[#635BFF] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Image URL
              </button>
              <button
                type="button"
                onClick={() => setLogoMode('svg')}
                className={`flex-1 py-1.5 transition ${logoMode === 'svg' ? 'bg-[#635BFF] text-white' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                Inline SVG
              </button>
            </div>

            {logoMode === 'url' ? (
              <>
                <FormField label="Logo image URL" htmlFor="logoUrl" hint="Fetched and embedded in EML via CID">
                  <Input id="logoUrl" type="url" value={fields.logoUrl} onChange={setField('logoUrl')} placeholder="https://example.com/logo.png" />
                </FormField>
                {fields.logoUrl && (
                  <div className="flex items-center gap-2">
                    <img
                      src={fields.logoUrl}
                      alt="logo preview"
                      className="h-8 max-w-[120px] object-contain border border-gray-100 bg-gray-50 rounded p-1"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span className={`text-xs font-medium ${
                      logoStatus === 'ok' ? 'text-green-600' :
                      logoStatus === 'error' ? 'text-red-500' :
                      logoStatus === 'loading' ? 'text-gray-400' : 'text-gray-400'
                    }`}>
                      {logoStatus === 'ok' ? '✓ Embedded in EML' :
                       logoStatus === 'error' ? '✗ Could not fetch (CORS?)' :
                       logoStatus === 'loading' ? 'Fetching…' : ''}
                    </span>
                  </div>
                )}
              </>
            ) : (
              <>
                <FormField label="SVG markup" htmlFor="logoSvgMarkup" hint="Paste raw <svg>…</svg> — base64-encoded and embedded via CID">
                  <textarea
                    id="logoSvgMarkup"
                    value={logoSvgMarkup}
                    onChange={e => setLogoSvgMarkup(e.target.value)}
                    placeholder={'<svg xmlns="http://www.w3.org/2000/svg" …>…</svg>'}
                    rows={5}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-mono text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#635BFF]/30 focus:border-[#635BFF] resize-y"
                    spellCheck={false}
                  />
                </FormField>
                {svgTrimmed && (
                  <div className="flex items-center gap-2">
                    <img
                      src={`data:image/svg+xml;base64,${svgToB64(svgTrimmed)}`}
                      alt="svg preview"
                      className="h-8 max-w-[120px] object-contain border border-gray-100 bg-gray-50 rounded p-1"
                    />
                    <span className="text-xs font-medium text-green-600">✓ Embedded in EML</span>
                  </div>
                )}
              </>
            )}
          </div>
        </Card>

        <Card title="Billing details">
          <div className="space-y-3">
            <FormField label="Recipient name" htmlFor="recipientName" hint='Appears after "Hi"'>
              <Input id="recipientName" value={fields.recipientName} onChange={setField('recipientName')} placeholder="Ashfords" />
            </FormField>
            <FormField label="Charge amount" htmlFor="chargeAmount">
              <Input id="chargeAmount" value={fields.chargeAmount} onChange={setField('chargeAmount')} placeholder="$36.00" />
            </FormField>
            <FormField label="Payment method text" htmlFor="paymentMethodText" hint='e.g. "your credit card ending in 8308"'>
              <Input id="paymentMethodText" value={fields.paymentMethodText} onChange={setField('paymentMethodText')} placeholder="your credit card ending in 8308" />
            </FormField>
            <FormField label="Product / service name" htmlFor="productName">
              <Input id="productName" value={fields.productName} onChange={setField('productName')} placeholder="OpenAI API credit balance" />
            </FormField>
          </div>
        </Card>

        <Card title="Billing history link">
          <div className="space-y-3">
            <FormField label="Link text" htmlFor="billingHistoryLinkText">
              <Input id="billingHistoryLinkText" value={fields.billingHistoryLinkText} onChange={setField('billingHistoryLinkText')} placeholder="billing history" />
            </FormField>
            <FormField label="Link URL" htmlFor="billingHistoryUrl">
              <Input id="billingHistoryUrl" type="url" value={fields.billingHistoryUrl} onChange={setField('billingHistoryUrl')} />
            </FormField>
            <FormField label="Link colour" htmlFor="linkColor">
              <div className="flex items-center gap-2">
                <input
                  id="linkColor"
                  type="color"
                  value={fields.linkColor}
                  onChange={setField('linkColor')}
                  className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white"
                />
                <Input value={fields.linkColor} onChange={setField('linkColor')} placeholder="#10a37f" className="font-mono" />
              </div>
            </FormField>
          </div>
        </Card>

        <Card title="Footer">
          <div className="space-y-3">
            <FormField label="Footer body text" htmlFor="footerText">
              <Input id="footerText" value={fields.footerText} onChange={setField('footerText')} placeholder="You received this email because…" />
            </FormField>
            <FormField label="Organization info" htmlFor="orgInfo" hint='Appears after "Organization:"'>
              <Input id="orgInfo" value={fields.orgInfo} onChange={setField('orgInfo')} placeholder="Acme (org-xxxxxxxxxxxx)" />
            </FormField>
            <FormField label="Preheader text" htmlFor="preheaderText" hint="Hidden preview text shown in inbox list">
              <Input id="preheaderText" value={fields.preheaderText} onChange={setField('preheaderText')} placeholder="Your charge of $36.00 has been processed" />
            </FormField>
          </div>
        </Card>

        <Card title="Attachments" subtitle="Embedded as MIME parts">
          <div className="space-y-3">
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
            </div>
            {attachments.length > 0 && (
              <ul className="space-y-1.5">
                {attachments.map((att, i) => (
                  <li key={i} className="flex items-center gap-2 text-xs text-gray-700">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    <span className="flex-1 truncate min-w-0" title={att.name}>{att.name}</span>
                    <button onClick={() => downloadAttachment(att)} className="flex-shrink-0 text-gray-400 hover:text-[#635bff] transition" title="Download">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                    </button>
                    <button onClick={() => removeAttachment(i)} className="flex-shrink-0 text-gray-400 hover:text-red-500 transition text-sm leading-none">×</button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

      </aside>

      {/* ── Right: preview / source ── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-100 bg-white flex-shrink-0">
          <button className={tabBtn(tab === 'preview')} onClick={() => setTab('preview')}>Preview</button>
          <button className={tabBtn(tab === 'source')} onClick={() => setTab('source')}>EML Source</button>
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
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
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
              <div className="min-h-full" dangerouslySetInnerHTML={{ __html: previewHtml }} />
              <button
                onClick={handleExport}
                className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-[#3C50E0] hover:bg-[#3347C8] active:scale-95 text-white text-sm font-medium rounded-xl shadow-lg transition-all"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
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
