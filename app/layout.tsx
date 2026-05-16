import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Invoice Generator — Stripe-style PDF Invoices',
  description: 'Generate professional Stripe-formatted PDF invoices instantly. No account needed, no data stored.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="bg-[#F1F5F9] min-h-screen antialiased" suppressHydrationWarning>{children}</body>
    </html>
  );
}
