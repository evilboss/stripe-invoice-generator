import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseS3Uri, parseArgs, generatePresignedUrl, uploadToS3 } from "./presign.mjs";

const MOCK_URL = "https://s3.amazonaws.com/mock-bucket/file.pdf?X-Amz-Signature=abc";

const mockDeps = (overrides = {}) => ({
  S3Client: class MockS3Client {},
  GetObjectCommand: class MockGetObjectCommand {
    constructor(input) { this.input = input; }
  },
  getSignedUrl: async () => MOCK_URL,
  ...overrides,
});

// ---------------------------------------------------------------------------
// parseS3Uri
// ---------------------------------------------------------------------------
describe("parseS3Uri", () => {
  it("parses a valid S3 URI", () => {
    const result = parseS3Uri("s3://my-bucket/invoices/inv_001.pdf");
    assert.deepEqual(result, { bucket: "my-bucket", key: "invoices/inv_001.pdf" });
  });

  it("parses a deeply nested key", () => {
    const result = parseS3Uri("s3://my-bucket/a/b/c/file.pdf");
    assert.deepEqual(result, { bucket: "my-bucket", key: "a/b/c/file.pdf" });
  });

  it("returns null for a non-S3 URI", () => {
    assert.equal(parseS3Uri("https://example.com/file.pdf"), null);
  });

  it("returns null when key is missing", () => {
    assert.equal(parseS3Uri("s3://my-bucket"), null);
  });
});

// ---------------------------------------------------------------------------
// parseArgs
// ---------------------------------------------------------------------------
describe("parseArgs", () => {
  it("accepts an S3 URI as the first positional arg", () => {
    const result = parseArgs(["s3://my-bucket/invoices/inv_001.pdf"]);
    assert.equal(result.bucket, "my-bucket");
    assert.equal(result.key, "invoices/inv_001.pdf");
  });

  it("falls back to legacy bucket + key positional args", () => {
    const result = parseArgs(["my-bucket", "invoices/inv_001.pdf"]);
    assert.equal(result.bucket, "my-bucket");
    assert.equal(result.key, "invoices/inv_001.pdf");
  });

  it("derives key from uploads/ prefix when only --file given", () => {
    process.env.AWS_S3_BUCKET = "my-bucket";
    const result = parseArgs(["--file", "./invoices/inv_001.pdf"]);
    delete process.env.AWS_S3_BUCKET;
    assert.equal(result.key, "uploads/inv_001.pdf");
    assert.equal(result.localFile, "./invoices/inv_001.pdf");
  });

  it("uses --dir as the S3 destination folder", () => {
    process.env.AWS_S3_BUCKET = "my-bucket";
    const result = parseArgs(["--file", "./inv_001.pdf", "--dir", "invoices/2026/"]);
    delete process.env.AWS_S3_BUCKET;
    assert.equal(result.key, "invoices/2026/inv_001.pdf");
    assert.equal(result.s3Dir, "invoices/2026/");
  });

  it("adds trailing slash to --dir if missing", () => {
    process.env.AWS_S3_BUCKET = "my-bucket";
    const result = parseArgs(["--file", "./inv_001.pdf", "--dir", "invoices/2026"]);
    delete process.env.AWS_S3_BUCKET;
    assert.equal(result.key, "invoices/2026/inv_001.pdf");
  });

  it("explicit key wins over --dir", () => {
    const result = parseArgs(["my-bucket", "custom/path.pdf", "--file", "./inv.pdf", "--dir", "invoices/"]);
    assert.equal(result.key, "custom/path.pdf");
  });

  it("defaults disposition to attachment", () => {
    const result = parseArgs(["s3://my-bucket/file.pdf"]);
    assert.equal(result.disposition, "attachment");
  });

  it("accepts --disposition inline", () => {
    const result = parseArgs(["s3://my-bucket/file.pdf", "--disposition", "inline"]);
    assert.equal(result.disposition, "inline");
  });

  it("rejects an invalid --disposition value", () => {
    assert.throws(
      () => parseArgs(["s3://my-bucket/file.pdf", "--disposition", "download"]),
      /--disposition must be/
    );
  });

  it("defaults filename to the basename of the key", () => {
    const result = parseArgs(["s3://my-bucket/invoices/inv_001.pdf"]);
    assert.equal(result.filename, "inv_001.pdf");
  });

  it("defaults filename to the basename of --file", () => {
    process.env.AWS_S3_BUCKET = "my-bucket";
    const result = parseArgs(["--file", "./invoices/inv_001.pdf"]);
    delete process.env.AWS_S3_BUCKET;
    assert.equal(result.filename, "inv_001.pdf");
  });

  it("accepts a custom --filename", () => {
    const result = parseArgs(["s3://my-bucket/file.pdf", "--filename", "Invoice #001.pdf"]);
    assert.equal(result.filename, "Invoice #001.pdf");
  });

  it("defaults expires to 604800", () => {
    const result = parseArgs(["s3://my-bucket/file.pdf"]);
    assert.equal(result.expires, 604800);
  });

  it("caps --expires at 604800", () => {
    const result = parseArgs(["s3://my-bucket/file.pdf", "--expires", "9999999"]);
    assert.equal(result.expires, 604800);
  });

  it("accepts a custom --expires within limit", () => {
    const result = parseArgs(["s3://my-bucket/file.pdf", "--expires", "3600"]);
    assert.equal(result.expires, 3600);
  });

  it("throws when no bucket or key is provided", () => {
    assert.throws(() => parseArgs([]), /Must provide a bucket/);
  });

  it("throws on an invalid S3 URI", () => {
    assert.throws(() => parseArgs(["s3://bucket-only"]), /Invalid S3 URI/);
  });

  it("uses AWS_S3_BUCKET env var as bucket fallback", () => {
    process.env.AWS_S3_BUCKET = "env-bucket";
    const result = parseArgs(["--file", "./invoices/file.pdf"]);
    delete process.env.AWS_S3_BUCKET;
    assert.equal(result.bucket, "env-bucket");
  });

  it("uses AWS_REGION env var as region fallback", () => {
    process.env.AWS_REGION = "eu-west-1";
    const result = parseArgs(["s3://my-bucket/file.pdf"]);
    delete process.env.AWS_REGION;
    assert.equal(result.region, "eu-west-1");
  });

  it("accepts --region override", () => {
    const result = parseArgs(["s3://my-bucket/file.pdf", "--region", "ap-southeast-1"]);
    assert.equal(result.region, "ap-southeast-1");
  });

  it("s3Dir is null when --dir is not provided", () => {
    const result = parseArgs(["s3://my-bucket/file.pdf"]);
    assert.equal(result.s3Dir, null);
  });
});

// ---------------------------------------------------------------------------
// generatePresignedUrl
// ---------------------------------------------------------------------------
describe("generatePresignedUrl", () => {
  const baseParams = {
    bucket: "my-bucket",
    key: "invoices/inv_001.pdf",
    disposition: "attachment",
    filename: "inv_001.pdf",
    expires: 3600,
    region: "us-east-1",
  };

  it("returns the presigned URL from getSignedUrl", async () => {
    const { url } = await generatePresignedUrl(baseParams, mockDeps());
    assert.equal(url, MOCK_URL);
  });

  it("builds attachment Content-Disposition", async () => {
    const { contentDisposition } = await generatePresignedUrl(baseParams, mockDeps());
    assert.equal(contentDisposition, 'attachment; filename="inv_001.pdf"');
  });

  it("builds inline Content-Disposition", async () => {
    const { contentDisposition } = await generatePresignedUrl(
      { ...baseParams, disposition: "inline", filename: "Invoice #001.pdf" },
      mockDeps()
    );
    assert.equal(contentDisposition, 'inline; filename="Invoice #001.pdf"');
  });

  it("returns an ISO expiry timestamp roughly expires seconds from now", async () => {
    const before = Date.now();
    const { expiresAt } = await generatePresignedUrl(baseParams, mockDeps());
    const after = Date.now();
    const expiresMs = new Date(expiresAt).getTime();
    assert.ok(expiresMs >= before + 3600 * 1000);
    assert.ok(expiresMs <= after + 3600 * 1000);
  });

  it("passes ResponseContentDisposition to GetObjectCommand", async () => {
    let capturedInput;
    const deps = mockDeps({
      GetObjectCommand: class {
        constructor(input) { capturedInput = input; }
      },
    });
    await generatePresignedUrl(baseParams, deps);
    assert.equal(capturedInput.ResponseContentDisposition, 'attachment; filename="inv_001.pdf"');
  });

  it("passes expiresIn to getSignedUrl", async () => {
    let capturedOptions;
    const deps = mockDeps({
      getSignedUrl: async (_client, _cmd, opts) => { capturedOptions = opts; return MOCK_URL; },
    });
    await generatePresignedUrl(baseParams, deps);
    assert.equal(capturedOptions.expiresIn, 3600);
  });

  it("propagates errors from getSignedUrl", async () => {
    const deps = mockDeps({
      getSignedUrl: async () => { throw new Error("AccessDenied"); },
    });
    await assert.rejects(() => generatePresignedUrl(baseParams, deps), /AccessDenied/);
  });
});

// ---------------------------------------------------------------------------
// uploadToS3
// ---------------------------------------------------------------------------
describe("uploadToS3", () => {
  const fakeBuffer = Buffer.from("fake pdf content");
  const fakeStats = { size: fakeBuffer.length };

  const uploadParams = {
    bucket: "my-bucket",
    key: "invoices/2026/inv_001.pdf",
    localFile: "./inv_001.pdf",
    region: "us-east-1",
    filename: "inv_001.pdf",
  };

  const mockUploadDeps = (overrides = {}) => ({
    S3Client: class MockS3Client {
      async send(cmd) { return cmd; }
    },
    PutObjectCommand: class MockPutObjectCommand {
      constructor(input) { this.input = input; }
    },
    readFile: async () => fakeBuffer,
    stat: async () => fakeStats,
    mimeLookup: () => "application/pdf",
    ...overrides,
  });

  it("sends a PutObjectCommand with correct Bucket and Key", async () => {
    let capturedInput;
    const deps = mockUploadDeps({
      PutObjectCommand: class {
        constructor(input) { capturedInput = input; }
      },
    });
    await uploadToS3(uploadParams, deps);
    assert.equal(capturedInput.Bucket, "my-bucket");
    assert.equal(capturedInput.Key, "invoices/2026/inv_001.pdf");
  });

  it("sets ContentType from mime lookup", async () => {
    let capturedInput;
    const deps = mockUploadDeps({
      PutObjectCommand: class {
        constructor(input) { capturedInput = input; }
      },
    });
    await uploadToS3(uploadParams, deps);
    assert.equal(capturedInput.ContentType, "application/pdf");
  });

  it("sets ContentDisposition as attachment with filename", async () => {
    let capturedInput;
    const deps = mockUploadDeps({
      PutObjectCommand: class {
        constructor(input) { capturedInput = input; }
      },
    });
    await uploadToS3(uploadParams, deps);
    assert.equal(capturedInput.ContentDisposition, 'attachment; filename="inv_001.pdf"');
  });

  it("returns mimeType and size", async () => {
    const result = await uploadToS3(uploadParams, mockUploadDeps());
    assert.equal(result.mimeType, "application/pdf");
    assert.equal(result.size, fakeBuffer.length);
  });

  it("falls back to application/octet-stream when mime is unknown", async () => {
    let capturedInput;
    const deps = mockUploadDeps({
      mimeLookup: () => false,
      PutObjectCommand: class {
        constructor(input) { capturedInput = input; }
      },
    });
    await uploadToS3(uploadParams, deps);
    assert.equal(capturedInput.ContentType, "application/octet-stream");
  });

  it("propagates errors from S3", async () => {
    const deps = mockUploadDeps({
      S3Client: class {
        async send() { throw new Error("NoSuchBucket"); }
      },
    });
    await assert.rejects(() => uploadToS3(uploadParams, deps), /NoSuchBucket/);
  });
});
