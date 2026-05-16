import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  LOCAL_BASE,
  EMPTY_HYDRATION_ID,
  isEmptyHydrationId,
  LEGACY_PATHS,
  DEFAULT_HYDRATION_PROFILE,
  normalizeAttachmentPaths,
  resolveLocalUrl,
  normalizeHydrationProfiles,
  loadHydrationManifest,
  fetchLocalJson,
  fetchLocalText,
  describeHydrationSources,
  mergeAttachmentPaths,
} from './local-hydration';

describe('isEmptyHydrationId', () => {
  it('returns true for empty string', () => {
    expect(isEmptyHydrationId('')).toBe(true);
  });

  it('returns true for the sentinel value', () => {
    expect(isEmptyHydrationId(EMPTY_HYDRATION_ID)).toBe(true);
  });

  it('returns false for any other id', () => {
    expect(isEmptyHydrationId('default')).toBe(false);
    expect(isEmptyHydrationId('acme')).toBe(false);
  });
});

describe('LEGACY_PATHS', () => {
  it('contains the three legacy file paths under LOCAL_BASE', () => {
    expect(LEGACY_PATHS.receiptPrefill).toBe(`${LOCAL_BASE}/receipt-eml-prefill.json`);
    expect(LEGACY_PATHS.invoicePrefill).toBe(`${LOCAL_BASE}/invoice-generator-prefill.json`);
    expect(LEGACY_PATHS.logo).toBe(`${LOCAL_BASE}/receipt-eml-logo.txt`);
  });
});

describe('normalizeAttachmentPaths', () => {
  it('returns empty array for non-arrays', () => {
    expect(normalizeAttachmentPaths(null)).toEqual([]);
    expect(normalizeAttachmentPaths(undefined)).toEqual([]);
    expect(normalizeAttachmentPaths('string')).toEqual([]);
    expect(normalizeAttachmentPaths({})).toEqual([]);
  });

  it('trims string entries', () => {
    expect(normalizeAttachmentPaths(['  a.pdf  ', 'b.pdf'])).toEqual(['a.pdf', 'b.pdf']);
  });

  it('accepts object entries with path field', () => {
    expect(normalizeAttachmentPaths([{ path: 'c.pdf' }, { path: '  d.pdf  ' }])).toEqual(['c.pdf', 'd.pdf']);
  });

  it('drops empty strings, missing path fields, and non-string entries', () => {
    expect(normalizeAttachmentPaths(['', '   ', { path: '' }, { other: 'x' }, null, 42])).toEqual([]);
  });

  it('keeps a mix of strings and path objects', () => {
    expect(normalizeAttachmentPaths(['a.pdf', { path: 'b.pdf' }])).toEqual(['a.pdf', 'b.pdf']);
  });
});

describe('resolveLocalUrl', () => {
  it('returns undefined for empty input', () => {
    expect(resolveLocalUrl(undefined)).toBeUndefined();
    expect(resolveLocalUrl('')).toBeUndefined();
    expect(resolveLocalUrl('   ')).toBeUndefined();
  });

  it('passes through absolute http(s) URLs', () => {
    expect(resolveLocalUrl('http://example.com/x.pdf')).toBe('http://example.com/x.pdf');
    expect(resolveLocalUrl('https://example.com/x.pdf')).toBe('https://example.com/x.pdf');
  });

  it('passes through absolute paths', () => {
    expect(resolveLocalUrl('/already/absolute')).toBe('/already/absolute');
  });

  it('prefixes relative paths with LOCAL_BASE', () => {
    expect(resolveLocalUrl('profiles/acme/file.json')).toBe(`${LOCAL_BASE}/profiles/acme/file.json`);
  });

  it('trims whitespace before checking absolute/protocol prefixes', () => {
    expect(resolveLocalUrl('  https://example.com/x.pdf  ')).toBe('https://example.com/x.pdf');
    expect(resolveLocalUrl('  /already/absolute  ')).toBe('/already/absolute');
  });
});

describe('normalizeHydrationProfiles', () => {
  it('returns empty array when input is not a record', () => {
    expect(normalizeHydrationProfiles(null)).toEqual([]);
    expect(normalizeHydrationProfiles([])).toEqual([]);
    expect(normalizeHydrationProfiles('manifest')).toEqual([]);
  });

  it('returns empty array when no profiles/hydrations key', () => {
    expect(normalizeHydrationProfiles({})).toEqual([]);
  });

  it('parses a manifest with the profiles key', () => {
    const profiles = normalizeHydrationProfiles({
      profiles: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    });
    expect(profiles).toHaveLength(2);
    expect(profiles[0].id).toBe('a');
    expect(profiles[1].label).toBe('B');
  });

  it('also accepts a legacy hydrations key', () => {
    const profiles = normalizeHydrationProfiles({
      hydrations: [{ id: 'a', label: 'A' }],
    });
    expect(profiles).toHaveLength(1);
  });

  it('drops profiles missing id or label', () => {
    const profiles = normalizeHydrationProfiles({
      profiles: [
        { id: '', label: 'no id' },
        { id: 'noLabel', label: '' },
        { id: 'ok', label: 'OK' },
      ],
    });
    expect(profiles).toHaveLength(1);
    expect(profiles[0].id).toBe('ok');
  });

  it('normalizes attachments array', () => {
    const [profile] = normalizeHydrationProfiles({
      profiles: [{ id: 'a', label: 'A', attachments: ['x.pdf', { path: 'y.pdf' }, ''] }],
    });
    expect(profile.attachments).toEqual(['x.pdf', 'y.pdf']);
  });

  it('preserves optional fields when present', () => {
    const [profile] = normalizeHydrationProfiles({
      profiles: [{
        id: 'a', label: 'A',
        receiptPrefill: 'r.json',
        invoicePrefill: 'i.json',
        subscriptionPrefill: 's.json',
        logo: 'l.txt',
      }],
    });
    expect(profile.receiptPrefill).toBe('r.json');
    expect(profile.invoicePrefill).toBe('i.json');
    expect(profile.subscriptionPrefill).toBe('s.json');
    expect(profile.logo).toBe('l.txt');
  });
});

describe('mergeAttachmentPaths', () => {
  it('flattens and dedupes groups, preserving first-seen order', () => {
    expect(mergeAttachmentPaths(['a.pdf', 'b.pdf'], ['b.pdf', 'c.pdf'])).toEqual(['a.pdf', 'b.pdf', 'c.pdf']);
  });

  it('ignores undefined groups', () => {
    expect(mergeAttachmentPaths(undefined, ['a.pdf'], undefined)).toEqual(['a.pdf']);
  });

  it('returns empty array for no inputs', () => {
    expect(mergeAttachmentPaths()).toEqual([]);
  });
});

describe('describeHydrationSources', () => {
  it('returns profile label when nothing was loaded', () => {
    expect(describeHydrationSources({ id: 'a', label: 'Profile A' }, {})).toBe('Profile A');
  });

  it('joins loaded source URLs with +', () => {
    const profile = { id: 'a', label: 'A', receiptPrefill: 'r.json', invoicePrefill: 'i.json' };
    const result = describeHydrationSources(profile, { receipt: true, invoice: true });
    expect(result).toBe(`${LOCAL_BASE}/r.json + ${LOCAL_BASE}/i.json`);
  });

  it('appends attachment count', () => {
    const profile = { id: 'a', label: 'A', receiptPrefill: 'r.json' };
    expect(describeHydrationSources(profile, { receipt: true, attachmentCount: 3 }))
      .toBe(`${LOCAL_BASE}/r.json + 3 attachments`);
  });

  it('uses singular form for one attachment', () => {
    expect(describeHydrationSources({ id: 'a', label: 'A' }, { attachmentCount: 1 }))
      .toBe('1 attachment');
  });
});

describe('fetch helpers', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('fetchLocalJson returns parsed JSON on success', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ hello: 'world' }),
    });
    expect(await fetchLocalJson('/local/x.json')).toEqual({ hello: 'world' });
  });

  it('fetchLocalJson returns null on !ok', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });
    expect(await fetchLocalJson('/local/x.json')).toBeNull();
  });

  it('fetchLocalJson returns null when fetch throws', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
    expect(await fetchLocalJson('/local/x.json')).toBeNull();
  });

  it('fetchLocalText returns text on success', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      text: async () => 'plain text',
    });
    expect(await fetchLocalText('/local/x.txt')).toBe('plain text');
  });

  it('fetchLocalText returns null on !ok', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });
    expect(await fetchLocalText('/local/x.txt')).toBeNull();
  });

  it('loadHydrationManifest falls back when manifest is missing', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false });
    const profiles = await loadHydrationManifest();
    expect(profiles).toEqual([DEFAULT_HYDRATION_PROFILE]);
  });

  it('loadHydrationManifest returns parsed profiles when present', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ profiles: [{ id: 'a', label: 'A' }] }),
    });
    const profiles = await loadHydrationManifest();
    expect(profiles).toHaveLength(1);
    expect(profiles[0].id).toBe('a');
  });

  it('loadHydrationManifest falls back to default when manifest has no valid profiles', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ profiles: [] }),
    });
    const profiles = await loadHydrationManifest();
    expect(profiles).toEqual([DEFAULT_HYDRATION_PROFILE]);
  });
});
