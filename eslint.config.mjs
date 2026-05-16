import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated output — not source:
    "coverage/**",
  ]),
  {
    // EML editors, image upload, and card-asset previews use raw <img> intentionally:
    // external CDN URLs (stripe-images.stripecdn.com), user-supplied URLs, base64 data
    // URIs, and inline SVG markup — none of which fit next/image's static-dimension
    // and remotePatterns model.
    files: [
      "components/BillingEmlEditor.tsx",
      "components/ReceiptEmlEditor.tsx",
      "components/SubscriptionEmlEditor.tsx",
      "components/ui/ImageUpload.tsx",
      "components/form/PaymentInfoSection.tsx",
      "components/form/ReceiptDetailsSection.tsx",
    ],
    rules: {
      "@next/next/no-img-element": "off",
    },
  },
  {
    // PDF documents use @react-pdf/renderer's <Image>, not an HTML <img>; the
    // jsx-a11y/alt-text rule does not apply.
    files: ["components/pdf/**"],
    rules: {
      "jsx-a11y/alt-text": "off",
    },
  },
]);

export default eslintConfig;
