#!/usr/bin/env node
/**
 * Upload a local file to S3 and generate a presigned download URL.
 *
 * Usage:
 *   node scripts/presign.mjs --file ./invoice.pdf
 *   node scripts/presign.mjs --file ./invoice.pdf --dir invoices/2026/
 *   node scripts/presign.mjs s3://bucket/invoices/inv_001.pdf
 *   node scripts/presign.mjs s3://bucket/invoices/inv_001.pdf --file ./invoice.pdf
 *
 * Options:
 *   --file         Local file to upload
 *   --dir          S3 destination folder (e.g. invoices/2026/) — appends filename automatically
 *   --disposition  attachment|inline  (default: attachment)
 *   --filename     Override the filename in Content-Disposition
 *   --expires      Seconds until expiry, max 604800 / 7 days  (default: 604800)
 *   --region       AWS region  (default: AWS_REGION env or us-east-1)
 *
 * Examples:
 *   node scripts/presign.mjs --file ./invoice.pdf
 *   node scripts/presign.mjs --file ./invoice.pdf --dir invoices/2026/
 *   node scripts/presign.mjs --file ./invoice.pdf --dir invoices/ --expires 3600
 *   node scripts/presign.mjs s3://my-bucket/invoices/inv_001.pdf
 */

import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { basename, resolve } from "path";
import { readFile, stat } from "fs/promises";
import { lookup as mimeLookup } from "mime-types";

// ---------------------------------------------------------------------------
// .env loader — sets vars not already present in process.env
// ---------------------------------------------------------------------------
const ENV_SOURCES = {};

async function loadEnv() {
  const envPath = resolve(process.cwd(), ".env");
  try {
    const raw = await readFile(envPath, "utf-8");
    let loaded = 0;
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, "");
      if (key in process.env) {
        ENV_SOURCES[key] = "shell (overrides .env)";
      } else {
        process.env[key] = val;
        ENV_SOURCES[key] = ".env";
        loaded++;
      }
    }
    console.log(`[env] Loaded .env (${loaded} new var${loaded !== 1 ? "s" : ""})`);
  } catch {
    console.log("[env] No .env file found — using shell environment only");
  }
}

function logEnv() {
  const vars = [
    { key: "AWS_REGION",            val: process.env.AWS_REGION },
    { key: "AWS_ACCESS_KEY_ID",     val: process.env.AWS_ACCESS_KEY_ID },
    { key: "AWS_SECRET_ACCESS_KEY", val: process.env.AWS_SECRET_ACCESS_KEY },
    { key: "AWS_S3_BUCKET",         val: process.env.AWS_S3_BUCKET },
  ];
  console.log("[env] AWS environment:");
  for (const { key, val } of vars) {
    const source = ENV_SOURCES[key] ?? (val ? "shell" : "");
    if (val) {
      const display =
        key === "AWS_SECRET_ACCESS_KEY"
          ? `${"*".repeat(val.length - 4)}${val.slice(-4)}`
          : key === "AWS_ACCESS_KEY_ID"
          ? `${val.slice(0, 4)}${"*".repeat(val.length - 4)}`
          : val;
      console.log(`  ${key.padEnd(24)} = ${display}  [${source}]`);
    } else {
      console.log(`  ${key.padEnd(24)} = (not set)`);
    }
  }
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------
export function parseS3Uri(uri) {
  const match = uri.match(/^s3:\/\/([^/]+)\/(.+)$/);
  if (!match) return null;
  return { bucket: match[1], key: match[2] };
}

export function parseArgs(args) {
  const positional = [];
  const opts = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith("--")) {
      opts[args[i].slice(2)] = args[i + 1];
      i++;
    } else {
      positional.push(args[i]);
    }
  }

  let bucket, key;

  if (positional[0]?.startsWith("s3://")) {
    const parsed = parseS3Uri(positional[0]);
    if (!parsed) throw new Error(`Invalid S3 URI: ${positional[0]}`);
    ({ bucket, key } = parsed);
  } else {
    [bucket, key] = positional;
  }

  // Fall back to AWS_S3_BUCKET env var
  if (!bucket) bucket = process.env.AWS_S3_BUCKET ?? null;
  if (!bucket) {
    throw new Error("Must provide a bucket via S3 URI, positional arg, or AWS_S3_BUCKET in .env.");
  }

  const localFile = opts.file ?? null;

  // --dir sets the S3 destination folder; strip leading ./ and ensure trailing slash
  if (opts.dir && localFile && !key) {
    const dir = opts.dir.replace(/^\.\//, "").replace(/\/?$/, "/");
    key = `${dir}${basename(localFile)}`;
  } else if (opts.dir && localFile && key) {
    // explicit key wins — ignore --dir
  } else if (localFile && !key) {
    key = `uploads/${basename(localFile)}`;
  }

  if (!key) {
    throw new Error("Must provide a key via S3 URI, positional arg, or --file with optional --dir.");
  }

  const disposition = opts.disposition ?? "attachment";
  if (!["attachment", "inline"].includes(disposition)) {
    throw new Error(`--disposition must be "attachment" or "inline", got: ${disposition}`);
  }

  const expires = Math.min(parseInt(opts.expires ?? "604800", 10), 604800);
  if (isNaN(expires) || expires <= 0) {
    throw new Error(`--expires must be a positive integer, got: ${opts.expires}`);
  }

  return {
    bucket,
    key,
    localFile,
    s3Dir: opts.dir ?? null,
    disposition,
    filename: opts.filename ?? basename(localFile ?? key),
    expires,
    region: opts.region ?? process.env.AWS_REGION ?? "us-east-1",
  };
}

// ---------------------------------------------------------------------------
// Core operations
// ---------------------------------------------------------------------------
export async function uploadToS3(
  { bucket, key, localFile, region, filename },
  deps = { S3Client, PutObjectCommand, readFile, stat, mimeLookup }
) {
  const fileBuffer = await deps.readFile(localFile);
  const fileStats = await deps.stat(localFile);
  const mimeType = deps.mimeLookup(localFile) || "application/octet-stream";

  const client = new deps.S3Client({ region });
  const command = new deps.PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileBuffer,
    ContentType: mimeType,
    ContentDisposition: `attachment; filename="${filename}"`,
    ContentLength: fileStats.size,
  });

  await client.send(command);
  return { mimeType, size: fileStats.size };
}

export async function generatePresignedUrl(
  { bucket, key, disposition, filename, expires, region },
  deps = { S3Client, GetObjectCommand, getSignedUrl }
) {
  const contentDisposition = `${disposition}; filename="${filename}"`;
  const client = new deps.S3Client({ region });
  const command = new deps.GetObjectCommand({
    Bucket: bucket,
    Key: key,
    ResponseContentDisposition: contentDisposition,
  });
  const url = await deps.getSignedUrl(client, command, { expiresIn: expires });
  return { url, contentDisposition, expiresAt: new Date(Date.now() + expires * 1000).toISOString() };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------
if (process.argv[1] === new URL(import.meta.url).pathname) {
  await loadEnv();
  logEnv();
  console.log("");

  try {
    const params = parseArgs(process.argv.slice(2));

    console.log("[config] Resolved settings:");
    console.log(`  bucket      = ${params.bucket}`);
    console.log(`  s3 key      = ${params.key}`);
    console.log(`  region      = ${params.region}`);
    console.log(`  disposition = ${params.disposition}`);
    console.log(`  filename    = ${params.filename}`);
    console.log(`  expires     = ${params.expires}s`);
    if (params.localFile) console.log(`  local file  = ${params.localFile}`);
    if (params.s3Dir)     console.log(`  s3 dir      = ${params.s3Dir}`);
    console.log("");

    if (params.localFile) {
      console.log(`[upload] ${params.localFile} → s3://${params.bucket}/${params.key}`);
      const { mimeType, size } = await uploadToS3(params);
      console.log(`[upload] Done — ${(size / 1024).toFixed(1)} KB  (${mimeType})\n`);
    }

    const { url, contentDisposition, expiresAt } = await generatePresignedUrl(params);

    console.log("Presigned URL:");
    console.log(url);
    console.log(`\nExpires:             ${expiresAt}  (${params.expires}s)`);
    console.log(`Content-Disposition: ${contentDisposition}`);
  } catch (err) {
    console.error("\nError:", err.message);
    process.exit(1);
  }
}
