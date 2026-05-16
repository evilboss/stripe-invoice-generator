export const LOCAL_BASE = '/local';

/** Select value for "no profile" — clears loaded prefill and enables reset. */
export const EMPTY_HYDRATION_ID = '__none__';

export function isEmptyHydrationId(id: string): boolean {
  return !id || id === EMPTY_HYDRATION_ID;
}

export const LEGACY_PATHS = {
  receiptPrefill: `${LOCAL_BASE}/receipt-eml-prefill.json`,
  invoicePrefill: `${LOCAL_BASE}/invoice-generator-prefill.json`,
  logo: `${LOCAL_BASE}/receipt-eml-logo.txt`,
} as const;

export type HydrationProfile = {
  id: string;
  label: string;
  receiptPrefill?: string;
  invoicePrefill?: string;
  subscriptionPrefill?: string;
  logo?: string;
  /** Relative paths under /local/ to embed as EML attachments */
  attachments?: string[];
};

export type LocalEmlAttachment = {
  name: string;
  mimeType: string;
  base64: string;
};

export const DEFAULT_HYDRATION_PROFILE: HydrationProfile = {
  id: 'default',
  label: 'Default',
  receiptPrefill: 'receipt-eml-prefill.json',
  invoicePrefill: 'invoice-generator-prefill.json',
  logo: 'receipt-eml-logo.txt',
};

export const DEFAULT_SUBSCRIPTION_HYDRATION_PROFILE: HydrationProfile = {
  id: 'default',
  label: 'Default',
  subscriptionPrefill: 'subscription-eml-prefill.json',
  attachments: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function chunkBase64(b64: string): string {
  return b64.match(/.{1,76}/g)?.join('\r\n') ?? b64;
}

function normalizeAttachmentPathEntry(entry: unknown): string | null {
  if (typeof entry === 'string' && entry.trim()) return entry.trim();
  if (isRecord(entry) && typeof entry.path === 'string' && entry.path.trim()) {
    return entry.path.trim();
  }
  return null;
}

export function normalizeAttachmentPaths(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeAttachmentPathEntry).filter((path): path is string => path !== null);
}

export function resolveLocalUrl(path: string | undefined): string | undefined {
  if (!path?.trim()) return undefined;
  const trimmed = path.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('/')) return trimmed;
  return `${LOCAL_BASE}/${trimmed.replace(/^\/+/, '')}`;
}

function normalizeProfile(raw: unknown): HydrationProfile | null {
  if (!isRecord(raw)) return null;
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const label = typeof raw.label === 'string' ? raw.label.trim() : '';
  if (!id || !label) return null;

  return {
    id,
    label,
    receiptPrefill: typeof raw.receiptPrefill === 'string' ? raw.receiptPrefill : undefined,
    invoicePrefill: typeof raw.invoicePrefill === 'string' ? raw.invoicePrefill : undefined,
    subscriptionPrefill: typeof raw.subscriptionPrefill === 'string' ? raw.subscriptionPrefill : undefined,
    logo: typeof raw.logo === 'string' ? raw.logo : undefined,
    attachments: normalizeAttachmentPaths(raw.attachments),
  };
}

export function normalizeHydrationProfiles(raw: unknown): HydrationProfile[] {
  if (!isRecord(raw)) return [];

  const list = Array.isArray(raw.profiles)
    ? raw.profiles
    : Array.isArray(raw.hydrations)
      ? raw.hydrations
      : [];

  return list
    .map(normalizeProfile)
    .filter((profile): profile is HydrationProfile => profile !== null);
}

export async function loadHydrationManifest(
  fallback: HydrationProfile = DEFAULT_HYDRATION_PROFILE
): Promise<HydrationProfile[]> {
  try {
    const res = await fetch(`${LOCAL_BASE}/manifest.json`, { cache: 'no-store' });
    if (!res.ok) return [fallback];
    const profiles = normalizeHydrationProfiles(await res.json());
    return profiles.length > 0 ? profiles : [fallback];
  } catch {
    return [fallback];
  }
}

export async function fetchLocalJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchLocalText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export function describeHydrationSources(profile: HydrationProfile, loaded: {
  receipt?: boolean;
  invoice?: boolean;
  subscription?: boolean;
  logo?: boolean;
  attachmentCount?: number;
}): string {
  const parts: string[] = [];
  const receiptUrl = resolveLocalUrl(profile.receiptPrefill);
  const invoiceUrl = resolveLocalUrl(profile.invoicePrefill);
  const subscriptionUrl = resolveLocalUrl(profile.subscriptionPrefill);
  const logoUrl = resolveLocalUrl(profile.logo);

  if (loaded.receipt && receiptUrl) parts.push(receiptUrl);
  if (loaded.invoice && invoiceUrl) parts.push(invoiceUrl);
  if (loaded.subscription && subscriptionUrl) parts.push(subscriptionUrl);
  if (loaded.logo && logoUrl) parts.push(logoUrl);
  if (loaded.attachmentCount && loaded.attachmentCount > 0) {
    parts.push(`${loaded.attachmentCount} attachment${loaded.attachmentCount > 1 ? 's' : ''}`);
  }

  return parts.join(' + ') || profile.label;
}

export async function fetchLocalAttachment(
  path: string,
  nameOverride?: string
): Promise<LocalEmlAttachment | null> {
  const url = resolveLocalUrl(path);
  if (!url) return null;

  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return null;

    const blob = await res.blob();
    const mimeType = blob.type || 'application/octet-stream';
    const name = nameOverride?.trim() || path.split('/').pop() || 'attachment';
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    const base64 = dataUrl.split(',')[1];
    if (!base64) return null;

    return { name, mimeType, base64: chunkBase64(base64) };
  } catch {
    return null;
  }
}

export async function fetchLocalAttachments(paths: string[]): Promise<LocalEmlAttachment[]> {
  const uniquePaths = [...new Set(paths.map(path => path.trim()).filter(Boolean))];
  const results = await Promise.all(uniquePaths.map(path => fetchLocalAttachment(path)));
  return results.filter((attachment): attachment is LocalEmlAttachment => attachment !== null);
}

export function mergeAttachmentPaths(...groups: Array<string[] | undefined>): string[] {
  return [...new Set(groups.flatMap(group => group ?? []))];
}
