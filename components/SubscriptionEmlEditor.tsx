'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import FormField from '@/components/ui/FormField';
import Card from '@/components/ui/Card';
import Textarea from '@/components/ui/Textarea';

// ─── types ───────────────────────────────────────────────────────────────────

interface Fields {
  companyName: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  sentDateTime: string;
  mailedBy: string;
  signedBy: string;
  logoUrl: string;
  preheaderText: string;
  subscriptionMessage: string;
  renewalMessage: string;
  manageUrl: string;
  manageButtonText: string;
  buttonColor: string;
  helpCenterUrl: string;
  helpCenterText: string;
  linkColor: string;
  teamName: string;
  orderNumber: string;
  orderDate: string;
  planName: string;
  planAmount: string;
  taxAmount: string;
  vatNumber: string;
  vatAmount: string;
  totalAmount: string;
  paymentMethod: string;
  cancelUrl: string;
  cancelLinkText: string;
  authorizationText: string;
  footerAddress: string;
  footerReason: string;
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

function generateOrderNumber(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz0123456789';
  const rand = (n: number) =>
    Array.from({ length: n }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `sub_${rand(14)}`;
}

function formatOrderDate(datetimeLocal: string): string {
  if (!datetimeLocal) return '';
  try {
    return new Date(datetimeLocal).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
    });
  } catch {
    return datetimeLocal;
  }
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

function buildSubscriptionHtml(f: Fields, logoSrc: string): string {
  const FF = `Colfax,Helvetica,Arial,sans-serif`;

  const vatNumberRow = f.vatNumber.trim()
    ? `<tr>
        <td style="word-break:break-word;font-family:${FF};font-size:16px">
          <h3 style="margin-top:0;color:#333;font-size:14px;font-weight:bold;text-align:start;padding-bottom:0;margin-bottom:0">
            VAT number: <span style="color:#333;font-weight:normal">${f.vatNumber}</span>
          </h3>
        </td>
      </tr>`
    : '';

  const vatAmountRow = f.vatAmount.trim()
    ? `<tr>
        <td width="80%" style="word-break:break-word;font-family:${FF};font-size:14px;padding:10px 0;color:#333;line-height:18px">&nbsp;</td>
        <td width="20%" style="word-break:break-word;font-family:${FF};font-size:14px;text-align:end">
          <span style="color:#333">VAT: ${f.vatAmount}</span>
        </td>
      </tr>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>${f.subject}</title>
</head>
<body style="height:100%;margin:0;font-family:${FF};background-color:#fff;color:#333;width:100%">

  <div style="display:none;max-width:0;max-height:0;overflow:hidden;font-size:1px;line-height:1px;color:#fff;opacity:0">
    ${f.preheaderText}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;margin:0;padding:0;background-color:#fff">
    <tbody><tr>
      <td align="center" style="word-break:break-word;font-family:${FF};font-size:16px">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;margin:0;padding:0">
          <tbody><tr>
            <td width="100%" style="word-break:break-word;font-family:${FF};font-size:16px;width:100%;margin:0;padding:0">

              <table align="center" width="570" cellpadding="0" cellspacing="0" role="presentation" style="width:570px;margin:0 auto;padding:0;background-color:#fff">
                <tbody><tr>
                  <td style="word-break:break-word;font-family:${FF};font-size:16px;padding:24px">

                    <!-- Logo -->
                    <table align="center" width="100%" cellpadding="0" cellspacing="0" role="presentation">
                      <tbody><tr>
                        <td align="center" style="word-break:break-word;font-family:${FF};font-size:16px;padding-top:24px;padding-bottom:24px">
                          <img src="${logoSrc}" style="border:none;width:140px;max-width:100%;padding-bottom:0;display:inline!important;vertical-align:bottom" width="140" alt="${f.companyName}">
                        </td>
                      </tr></tbody>
                    </table>

                    <div>

                      <!-- Body paragraphs -->
                      <p style="margin:0.4em 0 1.1875em;font-size:16px;line-height:1.625;color:#333">
                        ${f.subscriptionMessage}
                      </p>
                      <p style="margin:0.4em 0 1.1875em;font-size:16px;line-height:1.625;color:#333">
                        ${f.renewalMessage}
                      </p>

                      <!-- CTA button -->
                      <table align="center" width="100%" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;margin:30px auto;padding:0;text-align:center">
                        <tbody><tr>
                          <td align="center" style="word-break:break-word;font-family:${FF};font-size:16px">
                            <table width="100%" border="0" cellspacing="0" cellpadding="0" role="presentation">
                              <tbody><tr>
                                <td align="center" style="word-break:break-word;font-family:${FF};font-size:16px">
                                  <a href="${f.manageUrl}" style="color:#fff;background-color:${f.buttonColor};border-top:12px solid ${f.buttonColor};border-right:24px solid ${f.buttonColor};border-bottom:12px solid ${f.buttonColor};border-left:24px solid ${f.buttonColor};display:inline-block;text-decoration:none;border-radius:3px;box-sizing:border-box;font-family:${FF};font-size:16px">${f.manageButtonText}</a>
                                </td>
                              </tr></tbody>
                            </table>
                          </td>
                        </tr></tbody>
                      </table>

                      <!-- Help & sign-off -->
                      <p style="margin:0.4em 0 1.1875em;font-size:16px;line-height:1.625;color:#333">
                        If you have any questions, please contact us through our <a href="${f.helpCenterUrl}" style="color:${f.linkColor}">${f.helpCenterText}</a>.
                      </p>
                      <p style="margin:0.4em 0 1.1875em;font-size:16px;line-height:1.625;color:#333">
                        ${f.teamName}
                      </p>

                      <!-- Order number / date -->
                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;margin:0;padding:12px 0;font-size:14px;line-height:21px">
                        <tbody>
                          <tr>
                            <td style="word-break:break-word;font-family:${FF};font-size:16px">
                              <h3 style="margin-top:0;color:#333;font-size:14px;font-weight:bold;text-align:start;padding-bottom:0;margin-bottom:0">
                                Order number: <span style="color:#333;font-weight:normal">${f.orderNumber}</span>
                              </h3>
                            </td>
                          </tr>
                          <tr>
                            <td style="word-break:break-word;font-family:${FF};font-size:16px">
                              <h3 style="margin-top:0;color:#333;font-size:14px;font-weight:bold;text-align:start;padding-bottom:0;margin-bottom:0">
                                Order date: <span style="color:#333;font-weight:normal">${f.orderDate}</span>
                              </h3>
                            </td>
                          </tr>
                          ${vatNumberRow}
                        </tbody>
                      </table>

                      <!-- Plan / pricing table -->
                      <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="width:100%;margin:0;padding:12px 0">
                        <tbody>

                          <!-- Header + plan row -->
                          <tr>
                            <td colspan="2" style="word-break:break-word;font-family:${FF};font-size:16px">
                              <table width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:0;padding:0;border-bottom:1px solid #eaeaec">
                                <tbody>
                                  <tr>
                                    <th style="font-family:${FF};font-size:16px;padding-bottom:8px;border-bottom:1px solid #eaeaec;text-align:start">
                                      <p style="margin:0;font-size:14px;line-height:1.625;color:#333">Plan</p>
                                    </th>
                                    <th style="font-family:${FF};font-size:16px;padding-bottom:8px;border-bottom:1px solid #eaeaec;text-align:end">
                                      <p style="margin:0;font-size:14px;line-height:1.625;color:#333">Amount</p>
                                    </th>
                                  </tr>
                                  <tr>
                                    <td width="80%" style="word-break:break-word;font-family:${FF};font-size:14px;padding:10px 0;line-height:18px">
                                      <span style="color:#333">${f.planName}</span>
                                    </td>
                                    <td width="20%" style="word-break:break-word;font-family:${FF};font-size:14px;text-align:end">
                                      <span style="color:#333">${f.planAmount}</span>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>

                          <!-- Tax / VAT / Total -->
                          <tr>
                            <td colspan="2" style="word-break:break-word;font-family:${FF};font-size:16px">
                              <table width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:0;padding:10px 0">
                                <tbody>
                                  <tr>
                                    <td width="80%" style="word-break:break-word;font-family:${FF};font-size:14px;padding:10px 0;color:#333;line-height:18px">&nbsp;</td>
                                    <td width="20%" style="word-break:break-word;font-family:${FF};font-size:14px;text-align:end">
                                      <span style="color:#333">Tax: ${f.taxAmount}</span>
                                    </td>
                                  </tr>
                                  ${vatAmountRow}
                                  <tr>
                                    <td width="80%" style="word-break:break-word;font-family:${FF};font-size:14px;padding:10px 0;color:#333;line-height:18px">&nbsp;</td>
                                    <td width="20%" style="word-break:break-word;font-family:${FF};font-size:14px;text-align:end">
                                      <span style="color:#333">Total: ${f.totalAmount}</span>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>

                          <!-- Payment method -->
                          <tr>
                            <td colspan="2" style="word-break:break-word;font-family:${FF};font-size:16px">
                              <table width="100%" cellpadding="0" cellspacing="0" style="width:100%;margin:0;padding:0;border-top:1px solid #eaeaec">
                                <tbody>
                                  <tr>
                                    <td width="80%" style="word-break:break-word;font-family:${FF};font-size:14px;padding:10px 0;color:#333;line-height:18px;border-bottom:1px solid #eaeaec">
                                      <span style="color:#333">Payment method</span>
                                    </td>
                                    <td width="20%" style="word-break:break-word;font-family:${FF};font-size:14px;text-align:end;padding:10px 0;color:#333;line-height:18px;border-bottom:1px solid #eaeaec">
                                      <span style="color:#333">${f.paymentMethod}</span>
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </td>
                          </tr>

                        </tbody>
                      </table>

                      <!-- Authorization / cancel -->
                      <p style="margin:0.4em 0 1.1875em;font-size:13px;line-height:1.625;color:#333">
                        ${f.authorizationText} <a href="${f.cancelUrl}" style="color:${f.linkColor}">${f.cancelLinkText}</a>.
                      </p>

                    </div>
                  </td>
                </tr></tbody>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="word-break:break-word;font-family:${FF};font-size:16px">
              <table align="center" width="570" cellpadding="0" cellspacing="0" role="presentation" style="width:570px;margin:0 auto;padding:0;text-align:center;opacity:50%">
                <tbody><tr>
                  <td align="center" style="word-break:break-word;font-family:${FF};font-size:16px;padding:24px">
                    <p style="margin:0.4em 0 1.1875em;font-size:13px;line-height:1.625;color:#6c6c6c;text-align:center">
                      ${f.footerAddress}
                    </p>
                    <p style="margin:0.4em 0 1.1875em;font-size:13px;line-height:1.625;color:#6c6c6c;text-align:center">
                      ${f.footerReason}
                    </p>
                  </td>
                </tr></tbody>
              </table>
            </td>
          </tr>

        </tbody></table>
      </td>
    </tr></tbody>
  </table>

</body>
</html>`;
}

// ─── plain text builder ───────────────────────────────────────────────────────

function buildPlainText(f: Fields): string {
  const vatNumberLine = f.vatNumber.trim() ? `VAT number: ${f.vatNumber}\n` : '';
  const vatAmountLine = f.vatAmount.trim() ? `VAT: ${f.vatAmount}\n` : '';
  return `${f.subscriptionMessage}

${f.renewalMessage}

${f.manageButtonText}: ${f.manageUrl}

If you have any questions, please contact us through our ${f.helpCenterText}: ${f.helpCenterUrl}

${f.teamName}

---
Order number: ${f.orderNumber}
Order date: ${f.orderDate}
${vatNumberLine}
Plan: ${f.planName}
Amount: ${f.planAmount}

Tax: ${f.taxAmount}
${vatAmountLine}Total: ${f.totalAmount}

Payment method: ${f.paymentMethod}

---
${f.authorizationText} ${f.cancelLinkText}: ${f.cancelUrl}

${f.footerAddress}
${f.footerReason}

X-Demo-Notice: Simulated subscription confirmation for training/demo purposes only`;
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
  const logoSrc = logoB64 ? 'cid:logo@subscription.demo' : 'https://cdn.openai.com/API/logo-assets/openai-logo-email-header-1.png';
  const html = buildSubscriptionHtml(f, logoSrc);
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
X-Demo-Notice: Simulated subscription confirmation for training/demo purposes only`;

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
      `Content-ID: <logo@subscription.demo>\r\n` +
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

export default function SubscriptionEmlEditor() {
  const [fields, setFields] = useState<Fields>({
    companyName: 'OpenAI',
    fromEmail: 'no-reply@openai.com',
    toEmail: 'user@example.com',
    subject: 'Your ChatGPT Plus subscription confirmation',
    sentDateTime: '',
    mailedBy: '',
    signedBy: '',
    logoUrl: 'https://cdn.openai.com/API/logo-assets/openai-logo-email-header-1.png',
    preheaderText: 'You\'ve successfully subscribed.',
    subscriptionMessage: 'You\'ve successfully subscribed to ChatGPT Plus.',
    renewalMessage: 'Your subscription will automatically renew monthly. You can cancel at any time.',
    manageUrl: 'https://chatgpt.com/account/manage',
    manageButtonText: 'Manage your subscription',
    buttonColor: '#10a37f',
    helpCenterUrl: 'https://help.openai.com/en/',
    helpCenterText: 'help center',
    linkColor: '#10a37f',
    teamName: 'The OpenAI Team',
    orderNumber: '',
    orderDate: '',
    planName: 'ChatGPT Plus Subscription',
    planAmount: '$20.00',
    taxAmount: '$0.00',
    vatNumber: '',
    vatAmount: '',
    totalAmount: '$20.00',
    paymentMethod: 'Visa-4242',
    cancelUrl: 'https://chatgpt.com/account/cancel',
    cancelLinkText: 'Learn how to cancel',
    authorizationText: 'By subscribing, you authorize us to charge you the subscription cost (as described above) automatically, charged to the payment method provided until canceled.',
    footerAddress: 'OpenAI · 3180 18th St Ste 100 · San Francisco, CA 94110-2042 · USA',
    footerReason: 'You received this email because you have an account with OpenAI.',
  });

  useEffect(() => {
    const now = new Date();
    setFields(prev => ({
      ...prev,
      sentDateTime: nowDatetimeLocal(),
      orderNumber: generateOrderNumber(),
      orderDate: formatOrderDate(nowDatetimeLocal()),
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (key: keyof Fields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setFields(prev => ({ ...prev, [key]: e.target.value }));

  // ── logo fetch ──────────────────────────────────────────────────────────────
  type FetchStatus = 'idle' | 'loading' | 'ok' | 'error';
  const [logoData, setLogoData] = useState<{ b64: string; mime: string } | null>(null);
  const [logoStatus, setLogoStatus] = useState<FetchStatus>('idle');

  useEffect(() => {
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
  }, [fields.logoUrl]);

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
  const logoB64 = logoData?.b64 ?? null;
  const logoMime = logoData?.mime ?? null;
  const logoPreviewSrc = fields.logoUrl.trim() || null;

  const eml = useMemo(
    () => buildEml(fields, attachments, logoB64, logoMime),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields, attachments, logoB64, logoMime]
  );

  const previewHtml = buildSubscriptionHtml(fields, logoPreviewSrc ?? '');

  function handleExport() {
    const blob = new Blob([eml], { type: 'message/rfc822' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscription-${Date.now()}.eml`;
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
            <FormField label="Company name" htmlFor="companyName">
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
            <FormField label="Preheader text" htmlFor="preheaderText" hint="Hidden preview shown in inbox">
              <Input id="preheaderText" value={fields.preheaderText} onChange={setField('preheaderText')} placeholder="You've successfully subscribed." />
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
          </div>
        </Card>

        <Card title="Body">
          <div className="space-y-3">
            <FormField label="Subscription message" htmlFor="subscriptionMessage">
              <Textarea id="subscriptionMessage" value={fields.subscriptionMessage} onChange={setField('subscriptionMessage')} rows={2} />
            </FormField>
            <FormField label="Renewal message" htmlFor="renewalMessage">
              <Textarea id="renewalMessage" value={fields.renewalMessage} onChange={setField('renewalMessage')} rows={2} />
            </FormField>
            <FormField label="Team sign-off" htmlFor="teamName">
              <Input id="teamName" value={fields.teamName} onChange={setField('teamName')} placeholder="The OpenAI Team" />
            </FormField>
          </div>
        </Card>

        <Card title="CTA button">
          <div className="space-y-3">
            <FormField label="Button text" htmlFor="manageButtonText">
              <Input id="manageButtonText" value={fields.manageButtonText} onChange={setField('manageButtonText')} placeholder="Manage your subscription" />
            </FormField>
            <FormField label="Button URL" htmlFor="manageUrl">
              <Input id="manageUrl" type="url" value={fields.manageUrl} onChange={setField('manageUrl')} />
            </FormField>
            <FormField label="Button colour" htmlFor="buttonColor">
              <div className="flex items-center gap-2">
                <input id="buttonColor" type="color" value={fields.buttonColor} onChange={setField('buttonColor')} className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white" />
                <Input value={fields.buttonColor} onChange={setField('buttonColor')} placeholder="#10a37f" className="font-mono" />
              </div>
            </FormField>
            <FormField label="Link colour" htmlFor="linkColor" hint="Help center & cancel links">
              <div className="flex items-center gap-2">
                <input id="linkColor" type="color" value={fields.linkColor} onChange={setField('linkColor')} className="w-9 h-9 rounded-lg border border-gray-200 cursor-pointer p-0.5 bg-white" />
                <Input value={fields.linkColor} onChange={setField('linkColor')} placeholder="#10a37f" className="font-mono" />
              </div>
            </FormField>
            <FormField label="Help center text" htmlFor="helpCenterText">
              <Input id="helpCenterText" value={fields.helpCenterText} onChange={setField('helpCenterText')} placeholder="help center" />
            </FormField>
            <FormField label="Help center URL" htmlFor="helpCenterUrl">
              <Input id="helpCenterUrl" type="url" value={fields.helpCenterUrl} onChange={setField('helpCenterUrl')} />
            </FormField>
          </div>
        </Card>

        <Card title="Order details">
          <div className="space-y-3">
            <FormField label="Order number" htmlFor="orderNumber">
              <div className="flex gap-1.5">
                <Input id="orderNumber" value={fields.orderNumber} onChange={setField('orderNumber')} placeholder="sub_1PQT…" />
                <button onClick={() => setFields(p => ({ ...p, orderNumber: generateOrderNumber() }))} className="flex-shrink-0 px-2 rounded-lg border border-gray-200 text-gray-400 hover:text-gray-700 hover:border-gray-300 transition text-sm" title="Regenerate">↺</button>
              </div>
            </FormField>
            <FormField label="Order date" htmlFor="orderDate">
              <Input id="orderDate" value={fields.orderDate} onChange={setField('orderDate')} placeholder="Jun 11, 2024 5:40 AM PDT" />
            </FormField>
          </div>
        </Card>

        <Card title="Plan & pricing">
          <div className="space-y-3">
            <FormField label="Plan name" htmlFor="planName">
              <Input id="planName" value={fields.planName} onChange={setField('planName')} placeholder="ChatGPT Plus Subscription" />
            </FormField>
            <FormField label="Plan amount" htmlFor="planAmount">
              <Input id="planAmount" value={fields.planAmount} onChange={setField('planAmount')} placeholder="$20.00" />
            </FormField>
            <FormField label="Tax" htmlFor="taxAmount">
              <Input id="taxAmount" value={fields.taxAmount} onChange={setField('taxAmount')} placeholder="$0.00" />
            </FormField>
            <FormField label="VAT amount" htmlFor="vatAmount" hint="Optional — leave blank to hide">
              <Input id="vatAmount" value={fields.vatAmount} onChange={setField('vatAmount')} placeholder="$0.00" />
            </FormField>
            <FormField label="Total" htmlFor="totalAmount">
              <Input id="totalAmount" value={fields.totalAmount} onChange={setField('totalAmount')} placeholder="$20.00" />
            </FormField>
            <FormField label="Payment method" htmlFor="paymentMethod">
              <Input id="paymentMethod" value={fields.paymentMethod} onChange={setField('paymentMethod')} placeholder="Visa-4242" />
            </FormField>
          </div>
        </Card>

        <Card title="VAT" subtitle="Optional — leave blank to omit">
          <FormField label="VAT registration number" htmlFor="vatNumber" hint="Shown in order details when provided">
            <Input id="vatNumber" value={fields.vatNumber} onChange={setField('vatNumber')} placeholder="GB123456789" />
          </FormField>
        </Card>

        <Card title="Cancel / authorization">
          <div className="space-y-3">
            <FormField label="Authorization text" htmlFor="authorizationText">
              <Textarea id="authorizationText" value={fields.authorizationText} onChange={setField('authorizationText')} rows={3} />
            </FormField>
            <FormField label="Cancel link text" htmlFor="cancelLinkText">
              <Input id="cancelLinkText" value={fields.cancelLinkText} onChange={setField('cancelLinkText')} placeholder="Learn how to cancel" />
            </FormField>
            <FormField label="Cancel URL" htmlFor="cancelUrl">
              <Input id="cancelUrl" type="url" value={fields.cancelUrl} onChange={setField('cancelUrl')} />
            </FormField>
          </div>
        </Card>

        <Card title="Footer">
          <div className="space-y-3">
            <FormField label="Address" htmlFor="footerAddress">
              <Input id="footerAddress" value={fields.footerAddress} onChange={setField('footerAddress')} />
            </FormField>
            <FormField label="Reason text" htmlFor="footerReason">
              <Input id="footerReason" value={fields.footerReason} onChange={setField('footerReason')} />
            </FormField>
          </div>
        </Card>

        <Card title="Attachments">
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
