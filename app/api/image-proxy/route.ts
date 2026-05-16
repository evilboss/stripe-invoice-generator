import { NextRequest, NextResponse } from 'next/server';

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

export async function GET(request: NextRequest) {
  const rawUrl = request.nextUrl.searchParams.get('url');

  if (!rawUrl) {
    return NextResponse.json({ error: 'Missing image URL.' }, { status: 400 });
  }

  let imageUrl: URL;
  try {
    imageUrl = new URL(rawUrl);
  } catch {
    return NextResponse.json({ error: 'Invalid image URL.' }, { status: 400 });
  }

  if (!ALLOWED_PROTOCOLS.has(imageUrl.protocol)) {
    return NextResponse.json({ error: 'Only HTTP and HTTPS image URLs are supported.' }, { status: 400 });
  }

  const response = await fetch(imageUrl, { cache: 'no-store' });
  if (!response.ok) {
    return NextResponse.json({ error: `Image fetch failed with ${response.status}.` }, { status: 502 });
  }

  const mime = response.headers.get('content-type')?.split(';')[0]?.trim() || 'image/png';
  if (!mime.startsWith('image/')) {
    return NextResponse.json({ error: `URL returned "${mime}", not an image.` }, { status: 415 });
  }

  const contentLength = Number(response.headers.get('content-length') || 0);
  if (contentLength > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Image is too large.' }, { status: 413 });
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: 'Image is too large.' }, { status: 413 });
  }

  return NextResponse.json({
    mime,
    base64: buffer.toString('base64'),
  });
}
