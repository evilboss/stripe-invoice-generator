import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { lookup as mimeLookup } from 'mime-types';
import { basename } from 'path';

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'application/zip',
]);

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
const EXPIRES_IN = 604800;          // 7 days (AWS max)

export async function POST(request: NextRequest) {
  const bucket = process.env.AWS_S3_BUCKET;
  const region = process.env.AWS_REGION ?? 'us-east-1';

  if (!bucket) {
    return NextResponse.json(
      { error: 'AWS_S3_BUCKET is not configured on the server.' },
      { status: 500 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart request.' }, { status: 400 });
  }

  const file = formData.get('file') as File | null;
  const s3Dir = (formData.get('dir') as string | null)?.replace(/^\.\//, '').replace(/\/?$/, '/') ?? 'uploads/';

  if (!file) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 });
  }

  const mimeType = file.type || (mimeLookup(file.name) || 'application/octet-stream');

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    return NextResponse.json(
      { error: `File type "${mimeType}" is not allowed.` },
      { status: 415 }
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large. Maximum is ${MAX_BYTES / 1024 / 1024}MB.` },
      { status: 413 }
    );
  }

  const filename = basename(file.name);
  const key = `${s3Dir}${filename}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const client = new S3Client({ region });

  try {
    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ContentDisposition: `attachment; filename="${filename}"`,
      ContentLength: buffer.length,
    }));
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed.';
    return NextResponse.json({ error: message }, { status: 502 });
  }

  const presignedUrl = await getSignedUrl(
    client,
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: `attachment; filename="${filename}"`,
    }),
    { expiresIn: EXPIRES_IN }
  );

  return NextResponse.json({
    url: presignedUrl,
    filename,
    key,
    expiresIn: EXPIRES_IN,
    expiresAt: new Date(Date.now() + EXPIRES_IN * 1000).toISOString(),
  });
}
